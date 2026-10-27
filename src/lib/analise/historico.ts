// Histórico de vendas usado na previsão.
//
// O protótipo não tem vendas reais, então elas são geradas de forma DETERMINÍSTICA
// (mesma semente aleatória para cada lote): todo servidor, toda execução e o n8n
// enxergam exatamente os mesmos números. Cada cultura segue o seu calendário de
// plantio, e alguns lotes têm tendência de alta ou queda — é isso que a IA aprende.
import type { Crop, SeedLot } from "@/lib/inventory";

export const INICIO_HISTORICO = "2025-04-01";

/** Peso de cada mês (1 = jan) no volume de venda, pelo calendário de plantio da cultura. */
export const SAZONALIDADE: Record<Crop, number[]> = {
  //            jan  fev  mar  abr  mai  jun  jul  ago  set  out  nov  dez
  Soja:        [0.3, 0.2, 0.2, 0.2, 0.2, 0.3, 0.5, 1.2, 2.5, 3.2, 2.0, 0.6],
  Milho:       [2.0, 2.6, 1.5, 0.4, 0.3, 0.3, 0.4, 0.8, 1.5, 1.8, 1.0, 0.6],
  Sorgo:       [1.0, 2.4, 2.0, 0.6, 0.3, 0.3, 0.3, 0.3, 0.6, 0.7, 0.6, 0.6],
  Trigo:       [0.2, 0.2, 0.6, 2.4, 3.0, 2.0, 0.6, 0.2, 0.2, 0.2, 0.2, 0.2],
  Feijão:      [1.2, 1.0, 0.8, 1.3, 1.0, 0.8, 0.7, 1.0, 1.2, 1.3, 1.1, 0.8],
  Algodão:     [2.0, 0.6, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.4, 0.8, 1.6, 2.6],
  Aveia:       [0.2, 0.2, 0.8, 2.5, 3.0, 1.5, 0.4, 0.2, 0.2, 0.2, 0.2, 0.2],
  Forrageiras: [1.2, 0.8, 0.6, 0.4, 0.4, 0.4, 0.5, 0.7, 1.4, 2.0, 2.0, 1.5],
  Hortaliças:  [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
};

/** Perfil de venda por lote: média de embalagens/dia e tendência anual (+0,3 = cresce 30% ao ano). */
const PERFIL: Record<string, { base: number; tendencia: number }> = {
  "SJ-2291": { base: 2.6, tendencia: 0.25 },
  "SJ-2312": { base: 1.1, tendencia: -0.2 },
  "SJ-2407": { base: 0.5, tendencia: -0.3 },
  "SJ-2450": { base: 0.7, tendencia: 0.0 },
  "ML-1180": { base: 1.0, tendencia: -0.25 },
  "ML-1204": { base: 0.6, tendencia: 0.1 },
  "SG-6603": { base: 0.9, tendencia: 0.0 },
  "TR-3312": { base: 0.8, tendencia: -0.1 },
  "TR-3390": { base: 0.5, tendencia: 0.1 },
  "TR-3405": { base: 0.4, tendencia: 0.0 },
  "FJ-5527": { base: 0.6, tendencia: -0.15 },
  "AL-0071": { base: 0.35, tendencia: 0.05 },
  "AV-2218": { base: 0.3, tendencia: 0.0 },
  "FB-8820": { base: 0.6, tendencia: 0.1 },
  "FB-9014": { base: 0.25, tendencia: 0.0 },
  "HT-1104": { base: 0.18, tendencia: -0.2 },
  "HT-1188": { base: 0.12, tendencia: 0.0 },
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function prng(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function poisson(lambda: number, rnd: () => number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rnd(); } while (p > L);
  return k - 1;
}

const DIA = 86400000;
export const isoDia = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const paraData = (iso: string) => {
  const [y = 1970, m = 1, d = 1] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};

const cache = new Map<string, Map<string, number>>();

/** Vendas diárias do produto do lote (embalagens por dia), de INICIO_HISTORICO até ontem. */
export function vendasDiarias(lot: SeedLot, hoje: Date): Map<string, number> {
  const chave = `${lot.lot}|${isoDia(hoje)}`;
  const pronto = cache.get(chave);
  if (pronto) return pronto;
  const perfil = PERFIL[lot.lot] ?? { base: Math.max(0.2, lot.quantity / 365), tendencia: 0 };
  const rnd = prng(hash(lot.lot));
  const inicio = paraData(INICIO_HISTORICO);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const vendas = new Map<string, number>();
  for (let t = inicio.getTime(); t < fim.getTime(); t += DIA) {
    const d = new Date(t);
    const anos = (t - inicio.getTime()) / (365 * DIA);
    const fator = Math.max(0.1, 1 + perfil.tendencia * anos);
    const domingo = d.getDay() === 0 ? 0.2 : 1;
    const lambda = perfil.base * SAZONALIDADE[lot.crop][d.getMonth()]! * fator * domingo;
    const n = poisson(lambda, rnd);
    if (n > 0) vendas.set(isoDia(d), n);
  }
  cache.set(chave, vendas);
  return vendas;
}

/** Soma das vendas entre duas datas (início incluso, fim excluso). */
export function vendasEntre(lot: SeedLot, hoje: Date, de: Date, ate: Date): number {
  const vendas = vendasDiarias(lot, hoje);
  let total = 0;
  for (let t = de.getTime(); t < ate.getTime(); t += DIA) total += vendas.get(isoDia(new Date(t))) ?? 0;
  return total;
}

/** Vendas por mês (chave "AAAA-MM"). */
export function vendasPorMes(lot: SeedLot, hoje: Date): Map<string, number> {
  const meses = new Map<string, number>();
  for (const [dia, n] of vendasDiarias(lot, hoje)) {
    const k = dia.slice(0, 7);
    meses.set(k, (meses.get(k) ?? 0) + n);
  }
  return meses;
}
