// Onde ficam propostas da IA, prazos de corte e execuções.
// Com Supabase configurado (SUPABASE_SERVICE_ROLE_KEY) grava nas tabelas propostas_ia,
// regras_corte e execucoes_ia; sem ele usa memória do servidor (bom para testar,
// mas some quando o servidor reinicia).
import type { Crop } from "@/lib/inventory";

export type Acao = "PROMOCAO" | "OFERTA_CLIENTES" | "REANALISE" | "MONITORAR";
export type StatusProposta = "pendente" | "aprovada" | "rejeitada";

export interface Proposta {
  id: number;
  criado_em: string;
  lote: string;
  cultura: Crop;
  cultivar: string;
  acao: Acao;
  quantidade: number | null;
  desconto_pct: number | null;
  justificativa: string;
  origem: "ia" | "regra";
  status: StatusProposta;
  motivo_rejeicao: string | null;
  decidido_em: string | null;
  numeros: Record<string, string | number | null>;
}

export interface Execucao {
  id: number;
  iniciado_em: string;
  concluido_em: string | null;
  gatilho: string;
  status: "rodando" | "concluida" | "erro";
  lotes_em_risco: number;
  valor_em_risco: number;
}

const mem = {
  propostas: [] as Proposta[],
  regras: {} as Partial<Record<Crop, number>>,
  execucoes: [] as Execucao[],
  seq: 1,
};

async function db() {
  if (!process.env["SUPABASE_SERVICE_ROLE_KEY"]?.trim()) return null;
  const { isSupabaseConfigured, admin } = await import("@/lib/lots.server");
  return isSupabaseConfigured() ? admin() : null;
}

function avisar(e: unknown) {
  console.error("[analise] Supabase indisponível, usando memória do servidor:", e);
}

// ---------------------------------------------------------------- prazos de corte
export async function lerRegras(): Promise<Partial<Record<Crop, number>>> {
  const c = await db();
  if (c) {
    const { data, error } = await c.from("regras_corte").select("cultura, prazo_corte_dias");
    if (!error) return Object.fromEntries((data ?? []).map((r) => [r.cultura, Number(r.prazo_corte_dias)]));
    avisar(error);
  }
  return { ...mem.regras };
}

export async function salvarRegra(cultura: Crop, dias: number) {
  const c = await db();
  if (c) {
    const { error } = await c.from("regras_corte")
      .upsert({ cultura, prazo_corte_dias: dias, atualizado_em: new Date().toISOString() });
    if (!error) return;
    avisar(error);
  }
  mem.regras[cultura] = dias;
}

// ---------------------------------------------------------------- propostas
export async function listarPropostas(): Promise<Proposta[]> {
  const c = await db();
  if (c) {
    const { data, error } = await c.from("propostas_ia").select("*").order("criado_em", { ascending: false }).limit(200);
    if (!error) return (data ?? []) as Proposta[];
    avisar(error);
  }
  return [...mem.propostas].sort((a, b) => b.criado_em.localeCompare(a.criado_em));
}

/** Grava as novas propostas; ignora lote que já tem proposta pendente. Devolve as gravadas. */
export async function gravarPropostas(novas: Omit<Proposta, "id" | "criado_em" | "status" | "motivo_rejeicao" | "decidido_em">[]) {
  const pendentes = new Set((await listarPropostas()).filter((p) => p.status === "pendente").map((p) => p.lote));
  const filtradas = novas.filter((p) => !pendentes.has(p.lote));
  if (!filtradas.length) return [];
  const c = await db();
  if (c) {
    const { data, error } = await c.from("propostas_ia").insert(filtradas).select("*");
    if (!error) return (data ?? []) as Proposta[];
    avisar(error);
  }
  const agora = new Date().toISOString();
  const gravadas = filtradas.map((p) => ({
    ...p, id: mem.seq++, criado_em: agora, status: "pendente" as const, motivo_rejeicao: null, decidido_em: null,
  }));
  mem.propostas.push(...gravadas);
  return gravadas;
}

export async function decidir(id: number, status: "aprovada" | "rejeitada", motivo?: string) {
  const mudanca = { status, motivo_rejeicao: status === "rejeitada" ? motivo?.trim() || null : null, decidido_em: new Date().toISOString() };
  const c = await db();
  if (c) {
    const { error } = await c.from("propostas_ia").update(mudanca).eq("id", id);
    if (!error) return;
    avisar(error);
  }
  const p = mem.propostas.find((x) => x.id === id);
  if (p) Object.assign(p, mudanca);
}

// ---------------------------------------------------------------- execuções
export async function abrirExecucao(gatilho: string): Promise<Execucao> {
  const base = { iniciado_em: new Date().toISOString(), concluido_em: null, gatilho, status: "rodando" as const, lotes_em_risco: 0, valor_em_risco: 0 };
  const c = await db();
  if (c) {
    const { data, error } = await c.from("execucoes_ia").insert(base).select("*").single();
    if (!error && data) return data as Execucao;
    avisar(error);
  }
  const e = { ...base, id: mem.seq++ };
  mem.execucoes.push(e);
  return e;
}

export async function fecharExecucao(id: number, dados: { lotes_em_risco: number; valor_em_risco: number; status?: "concluida" | "erro" }) {
  const mudanca = { ...dados, status: dados.status ?? "concluida", concluido_em: new Date().toISOString() };
  const c = await db();
  if (c) {
    const { error } = await c.from("execucoes_ia").update(mudanca).eq("id", id);
    if (!error) return;
    avisar(error);
  }
  const e = mem.execucoes.find((x) => x.id === id);
  if (e) Object.assign(e, mudanca);
}

export async function ultimaExecucao(): Promise<Execucao | null> {
  const c = await db();
  if (c) {
    const { data, error } = await c.from("execucoes_ia").select("*").order("iniciado_em", { ascending: false }).limit(1);
    if (!error) return ((data ?? [])[0] as Execucao) ?? null;
    avisar(error);
  }
  return [...mem.execucoes].sort((a, b) => b.iniciado_em.localeCompare(a.iniciado_em))[0] ?? null;
}

export const armazenamento = async () => ((await db()) ? "supabase" : "memoria");
