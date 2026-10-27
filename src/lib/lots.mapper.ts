// Conversão entre o formato do site (SeedLot, camelCase) e a tabela
// public.lotes_sementes do Supabase (snake_case, em português).
import { z } from "zod";
import type { SeedLot } from "@/lib/inventory";

export interface LotRow {
  id?: string;
  lote: string;
  cultura: SeedLot["crop"];
  cultivar: string;
  classe: SeedLot["seedClass"];
  tratada: boolean;
  germinacao: number;
  pureza: number;
  quantidade: number;
  unidade: string;
  reservado: number;
  safra: string;
  fornecedor: string;
  base_por_embalagem: number;
  unidade_base: SeedLot["baseUnit"];
  dose_por_ha: number;
  codigo_ras: string;
  armazenamento: string;
  estado: SeedLot["lotState"];
  validade: string;
  local: string;
  preco: number;
  ordem?: number | null;
  atualizado_em?: string;
}

export function rowToLot(r: LotRow): SeedLot {
  return {
    id: String(r.id ?? r.lote),
    crop: r.cultura,
    cultivar: r.cultivar,
    seedClass: r.classe,
    treated: Boolean(r.tratada),
    germination: Number(r.germinacao),
    purity: Number(r.pureza),
    lot: r.lote,
    quantity: Number(r.quantidade),
    unit: r.unidade,
    reserved: Number(r.reservado),
    harvest: r.safra,
    supplier: r.fornecedor,
    basePerPackage: Number(r.base_por_embalagem),
    baseUnit: r.unidade_base,
    seedRatePerHa: Number(r.dose_por_ha),
    rasCode: r.codigo_ras ?? "",
    storage: r.armazenamento,
    lotState: r.estado,
    expiry: String(r.validade).slice(0, 10),
    location: r.local,
    price: Number(r.preco),
  };
}

export function lotToRow(l: SeedLot): Omit<LotRow, "id"> {
  return {
    lote: l.lot,
    cultura: l.crop,
    cultivar: l.cultivar,
    classe: l.seedClass,
    tratada: l.treated,
    germinacao: l.germination,
    pureza: l.purity,
    quantidade: l.quantity,
    unidade: l.unit,
    reservado: l.reserved,
    safra: l.harvest,
    fornecedor: l.supplier,
    base_por_embalagem: l.basePerPackage,
    unidade_base: l.baseUnit,
    dose_por_ha: l.seedRatePerHa,
    codigo_ras: l.rasCode,
    armazenamento: l.storage,
    estado: l.lotState,
    validade: l.expiry,
    local: l.location,
    preco: l.price,
  };
}

// ---- Validação do que o n8n envia (mesmos nomes de coluna do banco) ----

const crop = z.enum([
  "Soja",
  "Milho",
  "Sorgo",
  "Trigo",
  "Feijão",
  "Algodão",
  "Aveia",
  "Forrageiras",
  "Hortaliças",
]);
const seedClass = z.enum(["Certificada", "Fiscalizada", "Grão para plantio"]);
const baseUnit = z.enum(["kg", "mil sementes", "g"]);
const lotState = z.enum([
  "no estoque",
  "aguardando reanálise",
  "reanalisado",
  "bloqueado",
  "para descarte",
]);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use AAAA-MM-DD");

export const lotRowSchema = z.object({
  lote: z.string().trim().min(1).max(40),
  cultura: crop,
  cultivar: z.string().trim().min(1).max(120),
  classe: seedClass,
  tratada: z.boolean().default(false),
  germinacao: z.number().min(0).max(100),
  pureza: z.number().min(0).max(100),
  quantidade: z.number().int().min(0),
  unidade: z.string().trim().min(1).max(60),
  reservado: z.number().int().min(0).default(0),
  safra: z.string().trim().min(1).max(20),
  fornecedor: z.string().trim().min(1).max(120),
  base_por_embalagem: z.number().positive(),
  unidade_base: baseUnit,
  dose_por_ha: z.number().positive(),
  codigo_ras: z.string().max(60).default(""),
  armazenamento: z.string().max(120).default("Ambiente seco e ventilado"),
  estado: lotState.default("no estoque"),
  validade: isoDate,
  local: z.string().trim().min(1).max(60),
  preco: z.number().min(0).default(0),
  ordem: z.number().int().nullable().optional(),
});

/** Campos que o n8n pode alterar num lote existente (todos opcionais). */
export const lotPatchSchema = lotRowSchema.omit({ lote: true }).partial().strict();

export const movementSchema = z.object({
  tipo: z.enum(["entrada", "saida", "reserva", "liberacao", "ajuste"]),
  quantidade: z.number().int().min(0),
  observacao: z.string().max(500).optional(),
  origem: z.string().max(40).optional(),
});
