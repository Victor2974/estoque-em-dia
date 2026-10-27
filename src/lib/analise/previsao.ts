// Previsão de sobra por lote — o cálculo é 100% sobre dados (nada de IA aqui).
//
//   data limite      = validade − prazo de corte (definido pelo especialista, por cultura)
//   demanda prevista = média entre  ritmo dos últimos 30 dias × dias até o limite
//                                e  vendas do mesmo período no ano passado
//   sobra            = disponível − demanda prevista
import { availableFor, type Crop, type SeedLot } from "@/lib/inventory";
import { isoDia, paraData, vendasEntre } from "@/lib/analise/historico";

export type Risco = "critico" | "atencao" | "ok";

/** Prazo de corte padrão (dias antes da validade em que a loja para de vender). */
export const CORTE_PADRAO: Record<Crop, number> = {
  Soja: 15, Milho: 15, Sorgo: 10, Trigo: 15, Feijão: 10,
  Algodão: 20, Aveia: 10, Forrageiras: 15, Hortaliças: 7,
};

export interface AnaliseLote {
  loteId: string;
  lote: string;
  cultivar: string;
  cultura: Crop;
  unidade: string;
  preco: number;
  disponivel: number;
  validade: string;
  prazoCorte: number;
  dataLimite: string;
  diasAteLimite: number;
  vendaDiaRecente: number;
  vendasAnoPassado: number;
  demandaPrevista: number;
  sobra: number;
  valorEmRisco: number;
  risco: Risco;
}

const DIA = 86400000;

export function analisarLote(lot: SeedLot, cortes: Partial<Record<Crop, number>>, hoje = new Date()): AnaliseLote {
  const dia0 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const prazoCorte = cortes[lot.crop] ?? CORTE_PADRAO[lot.crop];
  const limite = new Date(paraData(lot.expiry).getTime() - prazoCorte * DIA);
  const diasAteLimite = Math.max(0, Math.round((limite.getTime() - dia0.getTime()) / DIA));

  const vendaDiaRecente = vendasEntre(lot, hoje, new Date(dia0.getTime() - 30 * DIA), dia0) / 30;
  const umAno = 365 * DIA;
  const vendasAnoPassado = diasAteLimite > 0
    ? vendasEntre(lot, hoje, new Date(dia0.getTime() - umAno), new Date(limite.getTime() - umAno))
    : 0;
  const ritmo = vendaDiaRecente * diasAteLimite;
  const demandaPrevista = Math.round(vendasAnoPassado > 0 ? (ritmo + vendasAnoPassado) / 2 : ritmo);

  const disponivel = availableFor(lot);
  const sobra = Math.max(0, disponivel - demandaPrevista);
  const relevante = sobra > 0 && sobra / Math.max(disponivel, 1) >= 0.05;
  const risco: Risco = !relevante ? "ok" : diasAteLimite <= 30 ? "critico" : "atencao";

  return {
    loteId: lot.id, lote: lot.lot, cultivar: lot.cultivar, cultura: lot.crop, unidade: lot.unit,
    preco: lot.price, disponivel, validade: lot.expiry, prazoCorte, dataLimite: isoDia(limite), diasAteLimite,
    vendaDiaRecente: Math.round(vendaDiaRecente * 100) / 100, vendasAnoPassado, demandaPrevista,
    sobra, valorEmRisco: Math.round(sobra * lot.price), risco,
  };
}

export function analisarEstoque(lots: SeedLot[], cortes: Partial<Record<Crop, number>>, hoje = new Date()) {
  const lotes = lots.map((l) => analisarLote(l, cortes, hoje))
    .sort((a, b) => b.valorEmRisco - a.valorEmRisco);
  const emRisco = lotes.filter((l) => l.risco !== "ok");
  return {
    lotes,
    criticos: emRisco.filter((l) => l.risco === "critico").length,
    atencao: emRisco.filter((l) => l.risco === "atencao").length,
    valorEmRisco: emRisco.reduce((s, l) => s + l.valorEmRisco, 0),
  };
}
