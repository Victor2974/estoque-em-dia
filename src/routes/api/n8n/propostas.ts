import { createFileRoute } from "@tanstack/react-router";
import { checkAuth, handleError, json, preflight, readJson } from "@/lib/n8n-api.server";

// POST /api/n8n/propostas — o n8n devolve as sugestões da IA.
// Corpo: {"execucao_id": 1, "propostas": [{"lote":"SJ-2312","acao":"PROMOCAO","quantidade":50,"desconto_pct":12,"justificativa":"..."}]}
// O site confere cada uma contra a previsão (resposta inválida vira regra fixa), grava
// como pendente e devolve a mensagem pronta para o Telegram.
export const Route = createFileRoute("/api/n8n/propostas")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      POST: async ({ request }) => {
        const denied = checkAuth(request);
        if (denied) return denied;
        try {
          const { corpoPropostas, receberPropostas } = await import("@/lib/analise/analise.server");
          const corpo = corpoPropostas.parse(await readJson(request));
          return json(await receberPropostas(corpo));
        } catch (e) {
          return handleError(e);
        }
      },
    },
  },
});
