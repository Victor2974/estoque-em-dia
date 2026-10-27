import { createFileRoute } from "@tanstack/react-router";
import { checkAuth, handleError, json, preflight } from "@/lib/n8n-api.server";

// GET /api/n8n/analise?gatilho=cron|botao — previsão de sobra pronta para a IA do n8n.
// Abre uma execução e devolve os lotes em risco (sem proposta pendente), cada um com
// os números da previsão e o histórico/memória relevante, mais as instruções da IA.
export const Route = createFileRoute("/api/n8n/analise")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: async ({ request }) => {
        const denied = checkAuth(request);
        if (denied) return denied;
        try {
          const gatilho = new URL(request.url).searchParams.get("gatilho") ?? "cron";
          const { montarAnalise } = await import("@/lib/analise/analise.server");
          return json(await montarAnalise(gatilho.slice(0, 20)));
        } catch (e) {
          return handleError(e);
        }
      },
    },
  },
});
