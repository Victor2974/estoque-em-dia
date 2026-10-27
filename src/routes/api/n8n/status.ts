import { createFileRoute } from "@tanstack/react-router";
import { checkAuth, json, preflight } from "@/lib/n8n-api.server";

// GET /api/n8n/status — teste de conexão do n8n (credencial + Supabase).
export const Route = createFileRoute("/api/n8n/status")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: async ({ request }) => {
        const denied = checkAuth(request);
        if (denied) return denied;
        const { isSupabaseConfigured, admin } = await import("@/lib/lots.server");
        let supabase: "ok" | "nao_configurado" | "erro" = "nao_configurado";
        let lotes: number | null = null;
        let detalhe: string | undefined;
        if (isSupabaseConfigured() && process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
          const { count, error } = await admin()
            .from("lotes_sementes")
            .select("*", { count: "exact", head: true });
          supabase = error ? "erro" : "ok";
          lotes = count ?? null;
          detalhe = error?.message;
        }
        return json({
          ok: supabase === "ok",
          api: "estoque-em-dia",
          supabase,
          lotes,
          detalhe,
          webhook_n8n: Boolean(process.env["N8N_WEBHOOK_URL"]),
          hora_servidor: new Date().toISOString(),
        });
      },
    },
  },
});
