import { describe, expect, it } from "vitest";
import { seeds, daysUntil, statusFor, type Crop, type Status } from "@/lib/inventory";


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

  // Cada caixinha clicável mostra exatamente os lotes da sua faixa de validade.
  it("cada lote cai na faixa de validade certa", () => {
    const base = new Date("2026-10-27T12:00:00Z");
    const expected: Record<Status, (d: number) => boolean> = {
      vencido: (d) => d < 0,
      critico: (d) => d >= 0 && d <= 30,
      atencao: (d) => d > 30 && d <= 90,
      ok: (d) => d > 90,
    };
    for (const lot of seeds) {
      const days = daysUntil(lot.expiry, base);
      expect(statusFor(days)).toMatch(/^\w+$/);
      expect(expected[statusFor(days)](days)).toBe(true);
    }
    const vencidos = seeds.filter((l) => statusFor(daysUntil(l.expiry, base)) === "vencido");
    expect(vencidos.map((l) => l.cultivar).sort()).toEqual(["NH 91244 RSF", "UPF 22"]);
  });
});

