import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import type { LotRow } from "@/lib/lots.mapper";
import { checkAuth, handleError, json, preflight, toApi } from "@/lib/n8n-api.server";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

// GET /api/n8n/vencimentos?dias=30 — resumo pronto para alerta diário (Telegram, WhatsApp, e-mail).
// Traz os lotes vencidos e os que vencem em até N dias (padrão 30), totais e uma mensagem em texto.
export const Route = createFileRoute("/api/n8n/vencimentos")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: async ({ request }) => {
        const denied = checkAuth(request);
        if (denied) return denied;
        try {
          const dias = z.coerce
            .number()
            .int()
            .min(0)
            .max(365)
            .parse(new URL(request.url).searchParams.get("dias") ?? 30);
          const limite = new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);
          const { admin } = await import("@/lib/lots.server");
          const { data, error } = await admin()
            .from("lotes_sementes")
            .select("*")
            .lte("validade", limite)
            .neq("estado", "para descarte")
            .order("validade", { ascending: true });
          if (error) throw error;
          const lotes = (data as LotRow[]).map((r) => toApi(r));
          const vencidos = lotes.filter((l) => l.dias_ate_vencer < 0);
          const vencendo = lotes.filter((l) => l.dias_ate_vencer >= 0);
          const valor = (xs: typeof lotes) => xs.reduce((s, l) => s + l.valor_lote, 0);

          const linha = (l: (typeof lotes)[number]) =>
            `• ${l.cultivar} (lote ${l.lote}) — ${l.dias_ate_vencer < 0 ? `venceu há ${-l.dias_ate_vencer} dia(s)` : l.dias_ate_vencer === 0 ? "vence hoje" : `vence em ${l.dias_ate_vencer} dia(s)`}, ${dataBR(l.validade)} · ${l.disponivel} ${l.unidade} disponíveis · ${brl(l.valor_lote)} · ${l.estado}`;

          const partes = [`📦 Estoque em Dia — vencimentos (${dias} dias)`];
          if (!lotes.length) partes.push("Nenhum lote vencido ou vencendo no período. ✅");
          if (vencidos.length)
            partes.push(
              `\n🔴 Vencidos (${vencidos.length}) — ${brl(valor(vencidos))}`,
              ...vencidos.map(linha),
            );
          if (vencendo.length)
            partes.push(
              `\n🟠 Vencendo (${vencendo.length}) — ${brl(valor(vencendo))}`,
              ...vencendo.map(linha),
            );

          return json({
            dias,
            total: lotes.length,
            valor_em_risco: valor(lotes),
            vencidos,
            vencendo,
            mensagem: partes.join("\n"),
          });
        } catch (e) {
          return handleError(e);
        }
      },
    },
  },
});
