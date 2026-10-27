import { describe, expect, it } from "vitest";
import { lotRowSchema, type LotRow } from "@/lib/lots.mapper";
import { cadastrarLote } from "@/lib/cadastro.server";
import { loadLots } from "@/lib/lots.server";

const novo: LotRow = lotRowSchema.parse({
  lote: "SJ-9999", cultura: "Soja", cultivar: "Teste IPRO", classe: "Certificada", germinacao: 90, pureza: 98,
  quantidade: 50, unidade: "sacos 40 kg", safra: "2025/26", fornecedor: "Teste", base_por_embalagem: 40,
  unidade_base: "kg", dose_por_ha: 100, validade: "2027-03-01", local: "Galpão A", preco: 300,
}) as LotRow;

describe("Cadastro de lotes (modelo sem Supabase)", () => {
  it("adiciona o lote e ele aparece na lista", async () => {
    const r = await cadastrarLote(novo);
    expect(r.onde).toBe("memoria");
    const { lots } = await loadLots();
    expect(lots.some((l) => l.lot === "SJ-9999" && l.quantity === 50)).toBe(true);
  });
  it("recusa código de lote repetido", async () => {
    await expect(cadastrarLote({ ...novo, lote: "SJ-2291" })).rejects.toThrow(/Já existe/);
  });
});
