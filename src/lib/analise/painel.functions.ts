import { createServerFn } from "@tanstack/react-start";
import type { Crop } from "@/lib/inventory";

/** Tudo que o painel precisa: previsão, propostas, prazos de corte, resumos e memória. */
export const getPainel = createServerFn({ method: "GET" }).handler(async () => {
  const hoje = new Date();
  const { calcularPrevisao } = await import("@/lib/analise/analise.server");
  const { listarPropostas, ultimaExecucao, armazenamento } = await import("@/lib/analise/store.server");
  const { resumosMensais, memoriaIA } = await import("@/lib/analise/memoria");
  const { CORTE_PADRAO } = await import("@/lib/analise/previsao");
  const prev = await calcularPrevisao(hoje);
  const [propostas, execucao, onde] = await Promise.all([listarPropostas(), ultimaExecucao(), armazenamento()]);
  const culturas = Array.from(new Set(prev.lots.map((l) => l.crop)));
  return {
    previsao: { lotes: prev.lotes, criticos: prev.criticos, atencao: prev.atencao, valorEmRisco: prev.valorEmRisco },
    propostas,
    execucao,
    armazenamento: onde,
    rodarDisponivel: Boolean(process.env["N8N_ANALISE_WEBHOOK_URL"]?.trim()),
    regras: culturas.map((c) => ({ cultura: c, dias: prev.regras[c] ?? CORTE_PADRAO[c], padrao: CORTE_PADRAO[c] })),
    resumos: resumosMensais(prev.lots, hoje),
    memoria: memoriaIA(prev.lots, hoje),
  };
});

export const decidirProposta = createServerFn({ method: "POST" })
  .validator((d: { id: number; status: "aprovada" | "rejeitada"; motivo?: string }) => {
    if (!Number.isInteger(d?.id) || !["aprovada", "rejeitada"].includes(d?.status)) throw new Error("Dados inválidos.");
    return { id: d.id, status: d.status, motivo: String(d.motivo ?? "").slice(0, 300) };
  })
  .handler(async ({ data }) => {
    const { decidir } = await import("@/lib/analise/store.server");
    await decidir(data.id, data.status, data.motivo);
    return { ok: true };
  });

export const salvarCorte = createServerFn({ method: "POST" })
  .validator((d: { cultura: Crop; dias: number }) => {
    const dias = Math.round(Number(d?.dias));
    if (!d?.cultura || !Number.isFinite(dias) || dias < 0 || dias > 365) throw new Error("Prazo inválido (0 a 365 dias).");
    return { cultura: d.cultura, dias };
  })
  .handler(async ({ data }) => {
    const { salvarRegra } = await import("@/lib/analise/store.server");
    await salvarRegra(data.cultura, data.dias);
    return { ok: true };
  });

/** Botão "Rodar análise": dispara o workflow do n8n (que chama /api/n8n/analise e devolve as propostas). */
export const rodarAnalise = createServerFn({ method: "POST" }).handler(async () => {
  const url = process.env["N8N_ANALISE_WEBHOOK_URL"]?.trim();
  if (!url) return { ok: false, erro: "Defina N8N_ANALISE_WEBHOOK_URL no Vercel para ligar o botão ao n8n." };
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "ngrok-skip-browser-warning": "true" },
      body: JSON.stringify({ gatilho: "botao" }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return { ok: false, erro: `O n8n respondeu ${r.status}. Confira se o workflow está ativo.` };
    return { ok: true, erro: null as string | null };
  } catch {
    return { ok: false, erro: "Não consegui falar com o n8n. Confira se o n8n e o ngrok estão ligados." };
  }
});
