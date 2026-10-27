import { createServerFn } from "@tanstack/react-start";
import { lotRowSchema, type LotRow } from "@/lib/lots.mapper";

/** Cadastra um lote novo (Supabase quando configurado; senão, memória do servidor). */
export const adicionarLote = createServerFn({ method: "POST" })
  .validator((d: unknown) => lotRowSchema.parse(d) as LotRow)
  .handler(async ({ data }) => {
    const { cadastrarLote } = await import("@/lib/cadastro.server");
    try {
      const r = await cadastrarLote(data);
      return { ok: true, erro: null as string | null, lote: r.lote.lot, onde: r.onde };
    } catch (e) {
      return { ok: false, erro: e instanceof Error ? e.message : "Não foi possível cadastrar.", lote: null, onde: null };
    }
  });
