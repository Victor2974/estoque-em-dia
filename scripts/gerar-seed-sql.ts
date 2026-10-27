// Gera supabase/seed.sql a partir dos lotes de src/lib/inventory.ts.
// Uso: bun scripts/gerar-seed-sql.ts
import { writeFileSync } from "node:fs";
import { seeds } from "../src/lib/inventory";
import { lotToRow } from "../src/lib/lots.mapper";

const q = (v: unknown) =>
  v === null || v === undefined
    ? "null"
    : typeof v === "number" || typeof v === "boolean"
      ? String(v)
      : `'${String(v).replace(/'/g, "''")}'`;

const rows = seeds.map((s, i) => ({ ...lotToRow(s), ordem: i + 1 }));
const cols = Object.keys(rows[0]!);
const values = rows
  .map((r) => `  (${cols.map((c) => q((r as Record<string, unknown>)[c])).join(", ")})`)
  .join(",\n");
const update = cols
  .filter((c) => c !== "lote")
  .map((c) => `${c} = excluded.${c}`)
  .join(", ");

writeFileSync(
  "supabase/seed.sql",
  `-- Lotes de exemplo (gerado por scripts/gerar-seed-sql.ts — não edite à mão)\n` +
    `insert into public.lotes_sementes (${cols.join(", ")}) values\n${values}\n` +
    `on conflict (lote) do update set ${update};\n`,
);
console.log(`seed.sql com ${rows.length} lotes`);
