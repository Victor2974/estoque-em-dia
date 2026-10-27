import { createFileRoute } from "@tanstack/react-router";
import { movementSchema, type LotRow } from "@/lib/lots.mapper";
import {
  checkAuth,
  handleError,
  HttpError,
  json,
  notifyN8n,
  preflight,
  readJson,
  toApi,
} from "@/lib/n8n-api.server";

// POST /api/n8n/lotes/:lote/movimentacoes — registra entrada/saída/reserva/liberação/ajuste
//      corpo: {"tipo":"saida","quantidade":10,"observacao":"Pedido 123"}
// GET  /api/n8n/lotes/:lote/movimentacoes?limite=50 — histórico do lote
export const Route = createFileRoute("/api/n8n/lotes/$lote/movimentacoes")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),

      POST: async ({ request, params }) => {
        const denied = checkAuth(request);
        if (denied) return denied;
        try {
          const m = movementSchema.parse(await readJson(request));
          const { admin } = await import("@/lib/lots.server");
          const { data, error } = await admin().rpc("registrar_movimentacao", {
            p_lote: decodeURIComponent(params.lote),
            p_tipo: m.tipo,
            p_quantidade: m.quantidade,
            p_observacao: m.observacao ?? null,
            p_origem: m.origem ?? "n8n",
          });
          if (error) throw error;
          const lote = toApi(data as LotRow);
          await notifyN8n("movimentacao", { movimentacao: m, lote });
          return json({ movimentacao: m, lote }, 201);
        } catch (e) {
          return handleError(e);
        }
      },

      GET: async ({ request, params }) => {
        const denied = checkAuth(request);
        if (denied) return denied;
        try {
          const limite = Math.min(
            Math.max(Number(new URL(request.url).searchParams.get("limite")) || 50, 1),
            500,
          );
          const { admin } = await import("@/lib/lots.server");
          const { data: lote, error: e1 } = await admin()
            .from("lotes_sementes")
            .select("id")
            .eq("lote", decodeURIComponent(params.lote))
            .maybeSingle();
          if (e1) throw e1;
          if (!lote) throw new HttpError(404, `Lote ${params.lote} não encontrado.`);
          const { data, error } = await admin()
            .from("movimentacoes")
            .select("tipo, quantidade, observacao, origem, criado_em")
            .eq("lote_id", lote.id)
            .order("criado_em", { ascending: false })
            .limit(limite);
          if (error) throw error;
          return json({ lote: params.lote, total: data.length, movimentacoes: data });
        } catch (e) {
          return handleError(e);
        }
      },
    },
  },
});
