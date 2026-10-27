import { createFileRoute } from "@tanstack/react-router";
import { lotPatchSchema, type LotRow } from "@/lib/lots.mapper";
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

// GET    /api/n8n/lotes/:lote  — um lote pelo código (ex.: SJ-2291)
// PATCH  /api/n8n/lotes/:lote  — altera campos (ex.: {"estado":"bloqueado"} ou {"validade":"2027-05-01"})
// DELETE /api/n8n/lotes/:lote  — remove o lote (e o histórico de movimentações)
export const Route = createFileRoute("/api/n8n/lotes/$lote/")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),

      GET: async ({ request, params }) => {
        const denied = checkAuth(request);
        if (denied) return denied;
        try {
          const { admin } = await import("@/lib/lots.server");
          const { data, error } = await admin()
            .from("lotes_sementes")
            .select("*")
            .eq("lote", decodeURIComponent(params.lote))
            .maybeSingle();
          if (error) throw error;
          if (!data) throw new HttpError(404, `Lote ${params.lote} não encontrado.`);
          return json(toApi(data as LotRow));
        } catch (e) {
          return handleError(e);
        }
      },

      PATCH: async ({ request, params }) => {
        const denied = checkAuth(request);
        if (denied) return denied;
        try {
          const changes = lotPatchSchema.parse(await readJson(request));
          if (Object.keys(changes).length === 0)
            throw new HttpError(422, "Nenhum campo para alterar.");
          const { admin } = await import("@/lib/lots.server");
          const { data, error } = await admin()
            .from("lotes_sementes")
            .update(changes)
            .eq("lote", decodeURIComponent(params.lote))
            .select("*")
            .maybeSingle();
          if (error) throw error;
          if (!data) throw new HttpError(404, `Lote ${params.lote} não encontrado.`);
          const lote = toApi(data as LotRow);
          await notifyN8n("lote_alterado", { alteracoes: changes, lote });
          return json(lote);
        } catch (e) {
          return handleError(e);
        }
      },

      DELETE: async ({ request, params }) => {
        const denied = checkAuth(request);
        if (denied) return denied;
        try {
          const { admin } = await import("@/lib/lots.server");
          const { data, error } = await admin()
            .from("lotes_sementes")
            .delete()
            .eq("lote", decodeURIComponent(params.lote))
            .select("lote")
            .maybeSingle();
          if (error) throw error;
          if (!data) throw new HttpError(404, `Lote ${params.lote} não encontrado.`);
          await notifyN8n("lote_removido", data);
          return json({ removido: data.lote });
        } catch (e) {
          return handleError(e);
        }
      },
    },
  },
});
