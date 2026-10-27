import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { lotRowSchema, type LotRow } from "@/lib/lots.mapper";
import {
  checkAuth,
  handleError,
  json,
  notifyN8n,
  preflight,
  readJson,
  toApi,
} from "@/lib/n8n-api.server";

const SITUACOES = ["vencido", "critico", "atencao", "ok"] as const;

// GET  /api/n8n/lotes  — lista lotes. Filtros (query string, todos opcionais):
//        cultura=Soja · estado=bloqueado · situacao=vencido,critico · dias_max=30
// POST /api/n8n/lotes  — cria ou atualiza (pelo código "lote") um lote ou uma lista de lotes.
export const Route = createFileRoute("/api/n8n/lotes/")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),

      GET: async ({ request }) => {
        const denied = checkAuth(request);
        if (denied) return denied;
        try {
          const { admin } = await import("@/lib/lots.server");
          const p = new URL(request.url).searchParams;
          let q = admin().from("lotes_sementes").select("*").order("validade", { ascending: true });
          if (p.get("cultura")) q = q.eq("cultura", p.get("cultura")!);
          if (p.get("estado")) q = q.eq("estado", p.get("estado")!);
          if (p.get("dias_max")) {
            const dias = z.coerce.number().int().parse(p.get("dias_max"));
            const limite = new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);
            q = q.lte("validade", limite);
          }
          const { data, error } = await q;
          if (error) throw error;
          let lotes = (data as LotRow[]).map((r) => toApi(r));
          const situacao = p
            .get("situacao")
            ?.split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          if (situacao?.length) {
            z.array(z.enum(SITUACOES)).parse(situacao);
            lotes = lotes.filter((l) => situacao.includes(l.situacao));
          }
          return json({ total: lotes.length, lotes });
        } catch (e) {
          return handleError(e);
        }
      },

      POST: async ({ request }) => {
        const denied = checkAuth(request);
        if (denied) return denied;
        try {
          const body = await readJson(request);
          const many = Array.isArray(body);
          const rows = z
            .array(lotRowSchema)
            .min(1)
            .max(500)
            .parse(many ? body : [body]);
          const { admin } = await import("@/lib/lots.server");
          const { data, error } = await admin()
            .from("lotes_sementes")
            .upsert(rows, { onConflict: "lote" })
            .select("*");
          if (error) throw error;
          const lotes = (data as LotRow[]).map((r) => toApi(r));
          await notifyN8n("lotes_salvos", lotes);
          return json(many ? { total: lotes.length, lotes } : lotes[0], 201);
        } catch (e) {
          return handleError(e);
        }
      },
    },
  },
});
