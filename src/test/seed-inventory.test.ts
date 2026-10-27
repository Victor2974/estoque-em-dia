import { describe, expect, it } from "vitest";
import { seeds, type Crop } from "@/lib/inventory";

const CROPS: Crop[] = [
  "Soja",
  "Milho",
  "Sorgo",
  "Trigo",
  "Feijão",
  "Algodão",
  "Aveia",
  "Forrageiras",
  "Hortaliças",
];

// Anything that is not a seed must never come back to the catalog.
const NOT_SEEDS = [
  "ureia",
  "npk",
  "glifosato",
  "fungicida",
  "inseticida",
  "ração",
  "sal mineral",
  "vacina",
  "ivermectina",
  "fertilizante",
  "defensivo",
];

describe("estoque nichado em sementes", () => {
  it("tem lotes cadastrados", () => {
    expect(seeds.length).toBeGreaterThan(0);
  });

  it("cada lote pertence a uma cultura de semente", () => {
    for (const lot of seeds) {
      expect(CROPS).toContain(lot.crop);
    }
  });

  it("não há insumos que não são sementes no estoque", () => {
    for (const lot of seeds) {
      const text = `${lot.cultivar} ${lot.unit} ${lot.location}`.toLowerCase();
      for (const term of NOT_SEEDS) {
        expect(text).not.toContain(term);
      }
    }
  });

  it("germinação e pureza são percentuais válidos", () => {
    for (const lot of seeds) {
      expect(lot.germination).toBeGreaterThanOrEqual(80);
      expect(lot.germination).toBeLessThanOrEqual(100);
      expect(lot.purity).toBeLessThanOrEqual(100);
    }
  });

  it("validade está em formato ISO", () => {
    for (const lot of seeds) {
      expect(lot.expiry).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
