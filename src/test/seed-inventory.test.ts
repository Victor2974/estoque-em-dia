import { describe, expect, it } from "vitest";
import {
  seeds, daysUntil, statusFor, stockTotals, expiringByMonth, availableFor,
  stockValueFor, hectaresCovered, type Crop, type Status,
} from "@/lib/inventory";



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

describe("campos do lote que a apresentação exige", () => {
  const base = new Date("2026-10-27T12:00:00Z");

  it("reservado nunca passa da quantidade do lote", () => {
    for (const lot of seeds) {
      expect(lot.reserved).toBeGreaterThanOrEqual(0);
      expect(lot.reserved).toBeLessThanOrEqual(lot.quantity);
      expect(availableFor(lot)).toBe(lot.quantity - lot.reserved);
    }
  });

  it("todo lote tem safra, fornecedor e base de cálculo da dose", () => {
    for (const lot of seeds) {
      expect(lot.harvest).toMatch(/^\d{4}(\/\d{2})?$/);
      expect(lot.supplier.length).toBeGreaterThan(2);
      expect(lot.basePerPackage).toBeGreaterThan(0);
      expect(lot.seedRatePerHa).toBeGreaterThan(0);
      expect(["kg", "mil sementes", "g"]).toContain(lot.baseUnit);
    }
  });

  it("só lote sem lacre oficial fica sem código de certificado", () => {
    for (const lot of seeds) {
      if (lot.seedClass === "Grão para plantio") {
        expect(lot.rasCode).toBe("");
      } else {
        expect(lot.rasCode).toMatch(/^RAS /);
      }
    }
  });

  it("lote vencido nunca fica marcado como no estoque", () => {
    for (const lot of seeds) {
      if (daysUntil(lot.expiry, base) < 0) {
        expect(lot.lotState).not.toBe("no estoque");
      }
    }
  });

  it("área coberta bate com a dose de semeadura e o que está disponível", () => {
    const lot = seeds.find((l) => l.id === "1");
    expect(lot).toBeDefined();
    if (lot) {
      const expected = ((lot.quantity - lot.reserved) * lot.basePerPackage) / lot.seedRatePerHa;
      expect(hectaresCovered(lot)).toBeCloseTo(expected, 6);
    }
  });
});

describe("resumo e calendário de vencimentos", () => {
  const base = new Date("2026-10-27T12:00:00Z");

  it("valor total é a soma de quantidade × preço", () => {
    const totals = stockTotals(seeds, base);
    const expected = seeds.reduce((s, l) => s + l.quantity * l.price, 0);
    expect(totals.total).toBeCloseTo(expected, 2);
  });

  it("valor em risco é exatamente vencidos + vencendo em até 30 dias", () => {
    const totals = stockTotals(seeds, base);
    const risk = seeds
      .filter((l) => daysUntil(l.expiry, base) <= 30)
      .reduce((s, l) => s + stockValueFor(l), 0);
    const expired = seeds
      .filter((l) => daysUntil(l.expiry, base) < 0)
      .reduce((s, l) => s + stockValueFor(l), 0);
    expect(totals.atRisk).toBeCloseTo(risk, 2);
    expect(totals.expired).toBeCloseTo(expired, 2);
    expect(totals.atRisk).toBeGreaterThan(totals.expired);
  });

  it("calendário começa pelos vencidos e cobre todos os lotes", () => {
    const buckets = expiringByMonth(seeds, 12, base);
    expect(buckets[0].key).toBe("vencidos");
    expect(buckets[0].count).toBe(2);
    expect(buckets.reduce((s, b) => s + b.count, 0)).toBe(seeds.length);
  });
});


