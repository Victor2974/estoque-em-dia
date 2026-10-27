// Estoque nichado: trabalhamos apenas com SEMENTES.
// Cada linha é um lote de semente de uma cultura.
// O site é frontend e serve de apresentação: os dados vivem nesta lista.

export type Crop =
  | "Soja"
  | "Milho"
  | "Sorgo"
  | "Trigo"
  | "Feijão"
  | "Algodão"
  | "Aveia"
  | "Forrageiras"
  | "Hortaliças";

export type SeedClass = "Certificada" | "Fiscalizada" | "Grão para plantio";

// Base de cálculo usada na dose de semeadura e no peso da embalagem.
export type BaseUnit = "kg" | "mil sementes" | "g";

// O que acontece com um lote cuja validade passou.
export type LotState =
  | "no estoque"
  | "aguardando reanálise"
  | "reanalisado"
  | "bloqueado"
  | "para descarte";

export interface SeedLot {
  id: string;
  crop: Crop;
  cultivar: string;
  seedClass: SeedClass;
  treated: boolean; // semente tratada industrialmente
  germination: number; // % de germinação declarado na análise
  purity: number; // % de pureza física
  lot: string;
  quantity: number; // embalagem inteira: sacos, latas, pacotes...
  unit: string;
  reserved: number; // já comprometido com cliente, na mesma unidade de quantity
  harvest: string; // safra do lote
  supplier: string; // fornecedor / obtentor da cultivar
  basePerPackage: number; // semente dentro de uma embalagem
  baseUnit: BaseUnit;
  seedRatePerHa: number; // dose de semeadura na mesma base
  rasCode: string; // código do certificado/lacre (vazio quando não há)
  storage: string; // condição de guarda
  lotState: LotState;
  expiry: string; // ISO date — validade da análise de germinação do lote
  location: string;
  price: number; // R$ por unidade — VALOR DE EXEMPLO
}

export const seeds: SeedLot[] = [
  { id: "1", crop: "Soja", cultivar: "BMX Furia IPRO", seedClass: "Certificada", treated: true, germination: 92, purity: 98, lot: "SJ-2291", quantity: 420, unit: "sacos 40 kg", reserved: 40, harvest: "2025/26", supplier: "Bayer (BMX)", basePerPackage: 40, baseUnit: "kg", seedRatePerHa: 100, rasCode: "RAS 7F3A-2291", storage: "Ambiente seco e ventilado", lotState: "no estoque", expiry: "2027-03-15", location: "Galpão A", price: 389 },
  { id: "2", crop: "Soja", cultivar: "BMX Zeus IPRO", seedClass: "Fiscalizada", treated: true, germination: 88, purity: 97, lot: "SJ-2312", quantity: 260, unit: "sacos 40 kg", reserved: 60, harvest: "2025/26", supplier: "Bayer (BMX)", basePerPackage: 40, baseUnit: "kg", seedRatePerHa: 100, rasCode: "RAS 7F3A-2312", storage: "Ambiente seco e ventilado", lotState: "no estoque", expiry: "2026-11-15", location: "Galpão A", price: 365 },
  { id: "3", crop: "Soja", cultivar: "NH 91244 RSF", seedClass: "Fiscalizada", treated: false, germination: 84, purity: 96, lot: "SJ-2407", quantity: 95, unit: "sacos 40 kg", reserved: 0, harvest: "2024/25", supplier: "Nidera Sementes", basePerPackage: 40, baseUnit: "kg", seedRatePerHa: 100, rasCode: "RAS 7F3A-2407", storage: "Ambiente seco e ventilado", lotState: "aguardando reanálise", expiry: "2026-10-12", location: "Galpão A", price: 298 },
  { id: "4", crop: "Milho", cultivar: "AG 8088 PRO3", seedClass: "Certificada", treated: true, germination: 95, purity: 99, lot: "ML-1180", quantity: 180, unit: "sacos 60 mil sementes", reserved: 20, harvest: "2025/26", supplier: "Agroeste", basePerPackage: 60, baseUnit: "mil sementes", seedRatePerHa: 60, rasCode: "RAS 9K2B-1180", storage: "Ambiente seco e ventilado", lotState: "no estoque", expiry: "2027-01-08", location: "Galpão A", price: 1450 },
  { id: "5", crop: "Milho", cultivar: "DG 4500 VYHR", seedClass: "Certificada", treated: true, germination: 93, purity: 99, lot: "ML-1204", quantity: 95, unit: "latas 60 mil sementes", reserved: 10, harvest: "2025/26", supplier: "Corteva", basePerPackage: 60, baseUnit: "mil sementes", seedRatePerHa: 55, rasCode: "RAS 9K2B-1204", storage: "Ambiente seco e ventilado", lotState: "no estoque", expiry: "2027-05-22", location: "Galpão A", price: 1520 },
  { id: "6", crop: "Sorgo", cultivar: "BRS 655", seedClass: "Fiscalizada", treated: false, germination: 90, purity: 97, lot: "SG-6603", quantity: 90, unit: "sacos 25 kg", reserved: 10, harvest: "2025/26", supplier: "Embrapa", basePerPackage: 25, baseUnit: "kg", seedRatePerHa: 8, rasCode: "RAS 4C8D-6603", storage: "Ambiente seco e ventilado", lotState: "no estoque", expiry: "2026-12-02", location: "Galpão B", price: 210 },
  { id: "7", crop: "Trigo", cultivar: "BRS 420", seedClass: "Fiscalizada", treated: true, germination: 91, purity: 98, lot: "TR-3312", quantity: 240, unit: "sacos 40 kg", reserved: 40, harvest: "2026", supplier: "Embrapa", basePerPackage: 40, baseUnit: "kg", seedRatePerHa: 100, rasCode: "RAS 2H6E-3312", storage: "Ambiente seco e ventilado", lotState: "no estoque", expiry: "2026-11-05", location: "Galpão B", price: 185 },
  { id: "8", crop: "Trigo", cultivar: "TBIO Audace", seedClass: "Certificada", treated: true, germination: 94, purity: 99, lot: "TR-3390", quantity: 130, unit: "sacos 40 kg", reserved: 15, harvest: "2026", supplier: "Bayer (TBIO)", basePerPackage: 40, baseUnit: "kg", seedRatePerHa: 90, rasCode: "RAS 2H6E-3390", storage: "Ambiente seco e ventilado", lotState: "no estoque", expiry: "2027-08-05", location: "Galpão B", price: 198 },
  { id: "9", crop: "Feijão", cultivar: "BRS Talisma (carioca)", seedClass: "Certificada", treated: false, germination: 89, purity: 99, lot: "FJ-5527", quantity: 130, unit: "sacos 30 kg", reserved: 20, harvest: "2025/26", supplier: "Embrapa", basePerPackage: 30, baseUnit: "kg", seedRatePerHa: 90, rasCode: "RAS 6P1F-5527", storage: "Ambiente seco e ventilado", lotState: "no estoque", expiry: "2027-02-14", location: "Galpão C", price: 320 },
  { id: "10", crop: "Algodão", cultivar: "FM 987 GLIP", seedClass: "Certificada", treated: true, germination: 90, purity: 98, lot: "AL-0071", quantity: 60, unit: "sacos 20 mil sementes", reserved: 10, harvest: "2025/26", supplier: "FM Sementes", basePerPackage: 20, baseUnit: "mil sementes", seedRatePerHa: 60, rasCode: "RAS 8L4G-0071", storage: "Ambiente seco e ventilado", lotState: "no estoque", expiry: "2027-04-30", location: "Galpão C", price: 1890 },
  { id: "11", crop: "Aveia", cultivar: "UPF 22", seedClass: "Fiscalizada", treated: false, germination: 87, purity: 96, lot: "AV-2218", quantity: 75, unit: "sacos 40 kg", reserved: 0, harvest: "2026", supplier: "UPF Sementes", basePerPackage: 40, baseUnit: "kg", seedRatePerHa: 100, rasCode: "RAS 5T9H-2218", storage: "Ambiente seco e ventilado", lotState: "bloqueado", expiry: "2026-10-20", location: "Galpão B", price: 140 },
  { id: "12", crop: "Forrageiras", cultivar: "Brachiaria brizantha Xaraés", seedClass: "Fiscalizada", treated: false, germination: 85, purity: 95, lot: "FB-8820", quantity: 150, unit: "sacos 25 kg", reserved: 30, harvest: "2025/26", supplier: "Hempate", basePerPackage: 25, baseUnit: "kg", seedRatePerHa: 10, rasCode: "RAS 3M7J-8820", storage: "Ambiente seco e ventilado", lotState: "no estoque", expiry: "2027-06-18", location: "Galpão D", price: 420 },
  { id: "13", crop: "Forrageiras", cultivar: "Mombaça", seedClass: "Certificada", treated: false, germination: 88, purity: 96, lot: "FB-9014", quantity: 60, unit: "sacos 25 kg", reserved: 5, harvest: "2025/26", supplier: "Tropical Sementes", basePerPackage: 25, baseUnit: "kg", seedRatePerHa: 12, rasCode: "RAS 3M7J-9014", storage: "Ambiente seco e ventilado", lotState: "no estoque", expiry: "2027-09-25", location: "Galpão D", price: 465 },
  { id: "14", crop: "Hortaliças", cultivar: "Alface Crespa Regina", seedClass: "Certificada", treated: false, germination: 95, purity: 99, lot: "HT-1104", quantity: 40, unit: "pacotes 10 g", reserved: 5, harvest: "2025/26", supplier: "Sakata", basePerPackage: 10, baseUnit: "g", seedRatePerHa: 300, rasCode: "RAS 1N5K-1104", storage: "Câmara fria (5–10 °C)", lotState: "no estoque", expiry: "2026-11-28", location: "Câmara Fria", price: 68 },
  { id: "15", crop: "Hortaliças", cultivar: "Tomate Santa Cruz Ada", seedClass: "Certificada", treated: false, germination: 96, purity: 99, lot: "HT-1188", quantity: 25, unit: "pacotes 10 g", reserved: 0, harvest: "2025/26", supplier: "Hemgen", basePerPackage: 10, baseUnit: "g", seedRatePerHa: 250, rasCode: "RAS 1N5K-1188", storage: "Câmara fria (5–10 °C)", lotState: "no estoque", expiry: "2027-07-10", location: "Câmara Fria", price: 95 },
  { id: "16", crop: "Trigo", cultivar: "BRS 420 (grão para plantio)", seedClass: "Grão para plantio", treated: false, germination: 86, purity: 95, lot: "TR-3405", quantity: 110, unit: "sacos 40 kg", reserved: 0, harvest: "2026", supplier: "Cooperativa regional", basePerPackage: 40, baseUnit: "kg", seedRatePerHa: 110, rasCode: "", storage: "Ambiente seco e ventilado", lotState: "no estoque", expiry: "2027-01-20", location: "Galpão B", price: 165 },
  { id: "17", crop: "Soja", cultivar: "BMX Potência RR (grão para plantio)", seedClass: "Grão para plantio", treated: true, germination: 85, purity: 96, lot: "SJ-2450", quantity: 150, unit: "sacos 40 kg", reserved: 25, harvest: "2025/26", supplier: "Produtor parceiro", basePerPackage: 40, baseUnit: "kg", seedRatePerHa: 110, rasCode: "", storage: "Ambiente seco e ventilado", lotState: "no estoque", expiry: "2027-02-28", location: "Galpão A", price: 340 },
];

export type Status = "vencido" | "critico" | "atencao" | "ok";

export function daysUntil(expiry: string, today = new Date()): number {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const [y = 1970, m = 1, d = 1] = expiry.split("-").map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - t) / 86400000);
}

export function statusFor(days: number): Status {
  if (days < 0) return "vencido";
  if (days <= 30) return "critico";
  if (days <= 90) return "atencao";
  return "ok";
}

// ---- Explicações usadas na legenda e nas janelas ----

export const seedClassInfo: Record<SeedClass, string> = {
  Certificada:
    "Semente com análise de laboratório e lacre do Ministério da Agricultura. É a maior garantia de germinação.",
  Fiscalizada:
    "Semente com análise de germinação e pureza conferida pelo serviço de fiscalização, sem o lacre da certificada.",
  "Grão para plantio":
    "Grão selecionado para plantio, sem lacre oficial. Vale conferir a germinação antes de usar.",
};

export const statusRange: Record<Status, string> = {
  vencido: "a validade da análise já passou",
  critico: "vence em 0 a 30 dias",
  atencao: "vence entre 31 e 90 dias",
  ok: "vence depois de 90 dias",
};

export const lotStateInfo: Record<LotState, string> = {
  "no estoque": "pode ser vendido normalmente",
  "aguardando reanálise": "novo teste de germinação já foi pedido",
  reanalisado: "reanalisado: a venda voltou com a germinação nova",
  bloqueado: "segurado no galpão até a decisão da loja",
  "para descarte": "sem condição de venda",
};

// ---- Cálculos do estoque ----

/** Embalagens que ainda podem ser vendidas. */
export function availableFor(lot: SeedLot): number {
  return lot.quantity - lot.reserved;
}

/** Valor em reais do lote inteiro. */
export function stockValueFor(lot: SeedLot): number {
  return lot.quantity * lot.price;
}

/** Hectares que a parte disponível do lote cobre na dose de semeadura. */
export function hectaresCovered(lot: SeedLot): number {
  return (availableFor(lot) * lot.basePerPackage) / lot.seedRatePerHa;
}

export interface StockTotals {
  total: number; // valor do estoque inteiro
  atRisk: number; // vencidos + vencendo em até 30 dias
  expired: number; // só os vencidos
  reservedUnits: number; // embalagens comprometidas
  area: number; // hectares cobertos pelo que está disponível
}

export function stockTotals(lots: SeedLot[], today = new Date()): StockTotals {
  return lots.reduce<StockTotals>(
    (acc, lot) => {
      const value = stockValueFor(lot);
      const days = daysUntil(lot.expiry, today);
      acc.total += value;
      if (days <= 30) acc.atRisk += value;
      if (days < 0) acc.expired += value;
      acc.reservedUnits += lot.reserved;
      acc.area += hectaresCovered(lot);
      return acc;
    },
    { total: 0, atRisk: 0, expired: 0, reservedUnits: 0, area: 0 },
  );
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export interface MonthBucket {
  key: string;
  label: string;
  count: number;
  value: number;
}

/**
 * Vencimentos organizados: primeiro os lotes já vencidos, depois os próximos
 * 12 meses. Usado no calendário de vencimentos da tela.
 */
export function expiringByMonth(lots: SeedLot[], months = 12, today = new Date()): MonthBucket[] {
  const base = new Date(today.getFullYear(), today.getMonth(), 1);
  const buckets: MonthBucket[] = [
    { key: "vencidos", label: "Vencidos", count: 0, value: 0 },
  ];
  for (let i = 0; i < months; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: `${MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
      count: 0,
      value: 0,
    });
  }

  for (const lot of lots) {
    const value = stockValueFor(lot);
    const days = daysUntil(lot.expiry, today);
    if (days < 0) {
      buckets[0].count += 1;
      buckets[0].value += value;
      continue;
    }
    const [y = 1970, m = 1] = lot.expiry.split("-").map(Number);
    const key = `${y}-${String(m).padStart(2, "0")}`;
    const bucket = buckets.find((b) => b.key === key);
    if (bucket) {
      bucket.count += 1;
      bucket.value += value;
    }
  }
  return buckets;
}

// ---- Contato da loja (DADOS DE EXEMPLO — trocar pelos reais) ----

export const contact = {
  whatsapp: "(00) 00000-0000",
  phone: "(00) 0000-0000",
  address: "Endereço da loja — a confirmar",
  hours: "seg. a sex. 8h às 18h · sáb. 8h às 12h",
};
