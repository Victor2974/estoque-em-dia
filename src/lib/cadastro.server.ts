// Cadastro de lotes novos pelo site.
// Com Supabase (SUPABASE_SERVICE_ROLE_KEY) grava na tabela lotes_sementes;
// sem ele guarda na memória do servidor — serve de modelo até ligar o banco.
import { seeds, type SeedLot } from "@/lib/inventory";
import { lotToRow, rowToLot, type LotRow } from "@/lib/lots.mapper";

const extras: SeedLot[] = [];

export function lotesCadastrados(): SeedLot[] {
  return [...extras];
}

export async function cadastrarLote(row: LotRow): Promise<{ lote: SeedLot; onde: "supabase" | "memoria" }> {
  const { isSupabaseConfigured, admin } = await import("@/lib/lots.server");
  if (isSupabaseConfigured() && process.env["SUPABASE_SERVICE_ROLE_KEY"]?.trim()) {
    const { data, error } = await admin().from("lotes_sementes").insert(row).select("*").single();
    if (error) {
      if (error.code === "23505") throw new Error(`Já existe um lote com o código ${row.lote}.`);
      throw new Error(error.message);
    }
    return { lote: rowToLot(data as LotRow), onde: "supabase" };
  }
  const existe = [...seeds, ...extras].some((l) => l.lot.toLowerCase() === row.lote.toLowerCase());
  if (existe) throw new Error(`Já existe um lote com o código ${row.lote}.`);
  const lote = rowToLot({ ...row, id: `novo-${row.lote}` });
  extras.push(lote);
  return { lote, onde: "memoria" };
}

export { lotToRow };
