export type Category = "Sementes" | "Fertilizantes" | "Defensivos" | "Nutrição Animal" | "Veterinários";

export interface Product {
  id: string;
  name: string;
  category: Category;
  lot: string;
  quantity: number;
  unit: string;
  expiry: string; // ISO date
  location: string;
}

export const products: Product[] = [
  { id: "1", name: "Semente de Soja RR 64I61", category: "Sementes", lot: "SJ-2291", quantity: 420, unit: "sacos", expiry: "2027-03-15", location: "Galpão A" },
  { id: "2", name: "Semente de Milho Híbrido AG8088", category: "Sementes", lot: "ML-1180", quantity: 180, unit: "sacos", expiry: "2026-11-20", location: "Galpão A" },
  { id: "3", name: "Ureia Agrícola 45% N", category: "Fertilizantes", lot: "UR-7731", quantity: 1200, unit: "sacos 50kg", expiry: "2028-01-10", location: "Galpão B" },
  { id: "4", name: "NPK 04-14-08", category: "Fertilizantes", lot: "NP-4410", quantity: 860, unit: "sacos 50kg", expiry: "2027-08-05", location: "Galpão B" },
  { id: "5", name: "Glifosato 480 SL", category: "Defensivos", lot: "GL-0923", quantity: 95, unit: "galões 20L", expiry: "2026-11-05", location: "Depósito C" },
  { id: "6", name: "Fungicida Azoxistrobina", category: "Defensivos", lot: "FZ-3312", quantity: 40, unit: "litros", expiry: "2026-10-30", location: "Depósito C" },
  { id: "7", name: "Inseticida Lambda-cialotrina", category: "Defensivos", lot: "IN-5527", quantity: 62, unit: "litros", expiry: "2026-12-18", location: "Depósito C" },
  { id: "8", name: "Ração Bovina Engorda 22%", category: "Nutrição Animal", lot: "RB-8820", quantity: 310, unit: "sacos 40kg", expiry: "2026-12-02", location: "Galpão D" },
  { id: "9", name: "Sal Mineral Proteinado", category: "Nutrição Animal", lot: "SM-1104", quantity: 540, unit: "sacos 25kg", expiry: "2027-05-22", location: "Galpão D" },
  { id: "10", name: "Vacina Febre Aftosa", category: "Veterinários", lot: "VA-0071", quantity: 120, unit: "frascos", expiry: "2026-10-20", location: "Câmara Fria" },
  { id: "11", name: "Ivermectina 1%", category: "Veterinários", lot: "IV-2218", quantity: 75, unit: "frascos 500ml", expiry: "2027-02-14", location: "Câmara Fria" },
  { id: "12", name: "Semente de Sorgo Forrageiro", category: "Sementes", lot: "SG-6603", quantity: 90, unit: "sacos", expiry: "2027-01-08", location: "Galpão A" },
];

export type Status = "vencido" | "critico" | "atencao" | "ok";

export function daysUntil(expiry: string, today = new Date()): number {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const [y, m, d] = expiry.split("-").map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - t) / 86400000);
}

export function statusFor(days: number): Status {
  if (days < 0) return "vencido";
  if (days <= 30) return "critico";
  if (days <= 90) return "atencao";
  return "ok";
}
