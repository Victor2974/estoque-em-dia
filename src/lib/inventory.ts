// Estoque nichado: trabalhamos apenas com SEMENTES.
// Cada linha é um lote de semente de uma cultura.

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

export interface SeedLot {
  id: string;
  crop: Crop;
  cultivar: string;
  seedClass: SeedClass;
  treated: boolean; // semente tratada industrialmente
  germination: number; // % de germinação declarado na análise
  purity: number; // % de pureza física
  lot: string;
  quantity: number;
  unit: string;
  expiry: string; // ISO date — validade da análise de germinação do lote
  location: string;
}

export const seeds: SeedLot[] = [
  { id: "1", crop: "Soja", cultivar: "BMX Furia IPRO", seedClass: "Certificada", treated: true, germination: 92, purity: 98, lot: "SJ-2291", quantity: 420, unit: "sacos 40 kg", expiry: "2027-03-15", location: "Galpão A" },
  { id: "2", crop: "Soja", cultivar: "BMX Zeus IPRO", seedClass: "Fiscalizada", treated: true, germination: 88, purity: 97, lot: "SJ-2312", quantity: 260, unit: "sacos 40 kg", expiry: "2026-11-15", location: "Galpão A" },
  { id: "3", crop: "Soja", cultivar: "NH 91244 RSF", seedClass: "Fiscalizada", treated: false, germination: 84, purity: 96, lot: "SJ-2407", quantity: 95, unit: "sacos 40 kg", expiry: "2026-10-12", location: "Galpão A" },
  { id: "4", crop: "Milho", cultivar: "AG 8088 PRO3", seedClass: "Certificada", treated: true, germination: 95, purity: 99, lot: "ML-1180", quantity: 180, unit: "sacos 60 mil sementes", expiry: "2027-01-08", location: "Galpão A" },
  { id: "5", crop: "Milho", cultivar: "DG 4500 VYHR", seedClass: "Certificada", treated: true, germination: 93, purity: 99, lot: "ML-1204", quantity: 95, unit: "latas 60 mil sementes", expiry: "2027-05-22", location: "Galpão A" },
  { id: "6", crop: "Sorgo", cultivar: "BRS 655", seedClass: "Fiscalizada", treated: false, germination: 90, purity: 97, lot: "SG-6603", quantity: 90, unit: "sacos 25 kg", expiry: "2026-12-02", location: "Galpão B" },
  { id: "7", crop: "Trigo", cultivar: "BRS 420", seedClass: "Fiscalizada", treated: true, germination: 91, purity: 98, lot: "TR-3312", quantity: 240, unit: "sacos 40 kg", expiry: "2026-11-05", location: "Galpão B" },
  { id: "8", crop: "Trigo", cultivar: "TBIO Audace", seedClass: "Certificada", treated: true, germination: 94, purity: 99, lot: "TR-3390", quantity: 130, unit: "sacos 40 kg", expiry: "2027-08-05", location: "Galpão B" },
  { id: "9", crop: "Feijão", cultivar: "BRS Talisma (carioca)", seedClass: "Certificada", treated: false, germination: 89, purity: 99, lot: "FJ-5527", quantity: 130, unit: "sacos 30 kg", expiry: "2027-02-14", location: "Galpão C" },
  { id: "10", crop: "Algodão", cultivar: "FM 987 GLIP", seedClass: "Certificada", treated: true, germination: 90, purity: 98, lot: "AL-0071", quantity: 60, unit: "sacos 20 mil sementes", expiry: "2027-04-30", location: "Galpão C" },
  { id: "11", crop: "Aveia", cultivar: "UPF 22", seedClass: "Fiscalizada", treated: false, germination: 87, purity: 96, lot: "AV-2218", quantity: 75, unit: "sacos 40 kg", expiry: "2026-10-20", location: "Galpão B" },
  { id: "12", crop: "Forrageiras", cultivar: "Brachiaria brizantha Xaraés", seedClass: "Fiscalizada", treated: false, germination: 85, purity: 95, lot: "FB-8820", quantity: 150, unit: "sacos 25 kg", expiry: "2027-06-18", location: "Galpão D" },
  { id: "13", crop: "Forrageiras", cultivar: "Mombaça", seedClass: "Certificada", treated: false, germination: 88, purity: 96, lot: "FB-9014", quantity: 60, unit: "sacos 25 kg", expiry: "2027-09-25", location: "Galpão D" },
  { id: "14", crop: "Hortaliças", cultivar: "Alface Crespa Regina", seedClass: "Certificada", treated: false, germination: 95, purity: 99, lot: "HT-1104", quantity: 40, unit: "pacotes 10 g", expiry: "2026-11-28", location: "Câmara Fria" },
  { id: "15", crop: "Hortaliças", cultivar: "Tomate Santa Cruz Ada", seedClass: "Certificada", treated: false, germination: 96, purity: 99, lot: "HT-1188", quantity: 25, unit: "pacotes 10 g", expiry: "2027-07-10", location: "Câmara Fria" },
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
