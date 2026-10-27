// Ponte entre o site e o n8n.
//   1. montarAnalise(): o site calcula a previsão e entrega ao n8n os lotes em risco,
//      já com a memória relevante de cada um (GET /api/n8n/analise).
//   2. receberPropostas(): o n8n devolve o que a IA sugeriu; o site confere de novo
//      (trava contra a IA inventar), grava e devolve a mensagem do Telegram
//      (POST /api/n8n/propostas).
import { z } from "zod";
import type { Crop } from "@/lib/inventory";
import { analisarEstoque, type AnaliseLote } from "@/lib/analise/previsao";
import { memoriaIA } from "@/lib/analise/memoria";
import {
  abrirExecucao, fecharExecucao, gravarPropostas, lerRegras, listarPropostas, type Acao,
} from "@/lib/analise/store.server";

export const ACOES: Acao[] = ["PROMOCAO", "OFERTA_CLIENTES", "REANALISE", "MONITORAR"];

export const INSTRUCOES_IA = `Você é o assistente de estoque de sementes de uma distribuidora agropecuária.
Recebe UM lote que vai sobrar até a data limite de venda e sugere UMA ação.

Regras obrigatórias:
- Use SOMENTE os números e o histórico fornecidos. Nunca invente dados, clientes ou valores.
- Escolha uma ação: PROMOCAO, OFERTA_CLIENTES, REANALISE, MONITORAR.
  PROMOCAO = desconto para escoar (desconto_pct entre 5 e 25).
  OFERTA_CLIENTES = oferta direta aos produtores que já compram essa cultura.
  REANALISE = pedir novo teste de germinação para revalidar o lote (indicado quando já passou ou está muito perto da data limite).
  MONITORAR = só quando a sobra é pequena e ainda há bastante prazo.
- quantidade não pode passar da sobra.
- Siga o histórico: repita o que funcionou, evite o que falhou e respeite as preferências do gestor.
- A justificativa tem até 3 frases e cita os números e o histórico usados.

Responda apenas com JSON: {"acao": "...", "quantidade": 0, "desconto_pct": null, "justificativa": "..."}`;

async function estoque() {
  const { loadLots } = await import("@/lib/lots.server");
  return (await loadLots()).lots;
}

export async function calcularPrevisao(hoje = new Date()) {
  const [lots, regras] = await Promise.all([estoque(), lerRegras()]);
  return { lots, regras, ...analisarEstoque(lots, regras, hoje) };
}

export async function montarAnalise(gatilho: string) {
  const hoje = new Date();
  const execucao = await abrirExecucao(gatilho);
  const { lots, lotes, criticos, atencao, valorEmRisco } = await calcularPrevisao(hoje);
  const memoria = memoriaIA(lots, hoje);
  const pendentes = new Set((await listarPropostas()).filter((p) => p.status === "pendente").map((p) => p.lote));
  const emRisco = lotes.filter((l) => l.risco !== "ok");
  const paraAnalisar = emRisco.filter((l) => !pendentes.has(l.lote));

  return {
    execucao_id: execucao.id,
    hoje: hoje.toISOString().slice(0, 10),
    resumo: { criticos, atencao, valor_em_risco: valorEmRisco, lotes_em_risco: emRisco.length, ja_com_proposta: emRisco.length - paraAnalisar.length },
    instrucoes: INSTRUCOES_IA,
    lotes: paraAnalisar.map((l) => ({
      ...l,
      historico: memoria
        .filter((m) => m.cultura === l.cultura || m.cultura === null)
        .map((m) => m.texto)
        .slice(0, 10),
    })),
  };
}

const propostaIn = z.object({
  lote: z.string(),
  acao: z.string(),
  quantidade: z.coerce.number().nullish(),
  desconto_pct: z.coerce.number().nullish(),
  justificativa: z.string().nullish(),
});
export const corpoPropostas = z.object({
  execucao_id: z.coerce.number().int().optional(),
  propostas: z.array(propostaIn).max(200),
});

const un = (u: string, n: number) => (n === 1 ? u.replace(/^(\w+)s\b/, "$1") : u);

/** Regra fixa usada quando a resposta da IA não passa na conferência. */
function regra(l: AnaliseLote, motivo: string) {
  if (l.diasAteLimite <= 7)
    return { acao: "REANALISE" as Acao, quantidade: l.sobra, desconto_pct: null,
      justificativa: `Regra automática (${motivo}): ${l.sobra} ${un(l.unidade, l.sobra)} sem venda prevista e só ${l.diasAteLimite} dias até a data limite. Pedir reanálise de germinação.` };
  return { acao: "PROMOCAO" as Acao, quantidade: l.sobra, desconto_pct: 10,
    justificativa: `Regra automática (${motivo}): sobra prevista de ${l.sobra} ${un(l.unidade, l.sobra)} até ${l.dataLimite.split("-").reverse().join("/")}. Promoção de 10%.` };
}

function conferir(l: AnaliseLote, p: z.infer<typeof propostaIn>) {
  const acao = String(p.acao ?? "").toUpperCase() as Acao;
  if (!ACOES.includes(acao)) return { ...regra(l, "ação fora da lista"), origem: "regra" as const };
  const q = p.quantidade == null ? null : Math.round(Number(p.quantidade));
  if (acao !== "MONITORAR" && (q == null || q <= 0 || q > l.sobra))
    return { ...regra(l, "quantidade maior que a sobra"), origem: "regra" as const };
  const d = p.desconto_pct == null ? null : Number(p.desconto_pct);
  if (acao === "PROMOCAO" && (d == null || d < 5 || d > 25))
    return { ...regra(l, "desconto fora de 5% a 25%"), origem: "regra" as const };
  const just = (p.justificativa ?? "").trim();
  if (just.length < 20) return { ...regra(l, "sem justificativa"), origem: "regra" as const };
  return { acao, quantidade: acao === "MONITORAR" ? null : q, desconto_pct: acao === "PROMOCAO" ? d : null, justificativa: just, origem: "ia" as const };
}

const brl = (v: number) => `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
const NOME: Record<Acao, string> = { PROMOCAO: "promoção", OFERTA_CLIENTES: "oferta a produtores", REANALISE: "reanálise", MONITORAR: "monitorar" };

export async function receberPropostas(corpo: z.infer<typeof corpoPropostas>) {
  const { lotes, criticos, atencao, valorEmRisco } = await calcularPrevisao();
  const porLote = new Map(lotes.map((l) => [l.lote, l]));
  const novas = [];
  for (const p of corpo.propostas) {
    const l = porLote.get(p.lote);
    if (!l || l.risco === "ok") continue; // lote inexistente ou sem risco: ignora
    const c = conferir(l, p);
    novas.push({
      lote: l.lote, cultura: l.cultura as Crop, cultivar: l.cultivar, ...c,
      numeros: { disponivel: l.disponivel, sobra: l.sobra, data_limite: l.dataLimite, dias_ate_limite: l.diasAteLimite,
        demanda_prevista: l.demandaPrevista, valor_em_risco: l.valorEmRisco, risco: l.risco, unidade: l.unidade },
    });
  }
  const gravadas = await gravarPropostas(novas);
  const emRisco = lotes.filter((l) => l.risco !== "ok").length;
  if (corpo.execucao_id) await fecharExecucao(corpo.execucao_id, { lotes_em_risco: emRisco, valor_em_risco: valorEmRisco });

  const top = gravadas.slice(0, 3).map((g, i) => {
    let a = NOME[g.acao];
    if (g.acao === "PROMOCAO" && g.desconto_pct) a += ` de ${g.desconto_pct}%`;
    return `${i + 1}. ${g.cultivar} (${g.lote}): ${a}${g.quantidade ? `, ${g.quantidade} emb.` : ""}`;
  });
  const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const mensagem = [
    `🌱 Análise de validade (${hoje})`,
    `🔴 ${criticos} críticos · 🟡 ${atencao} em atenção`,
    `💰 ${brl(valorEmRisco)} em risco`,
    gravadas.length ? `\n${gravadas.length} nova(s) proposta(s):\n${top.join("\n")}` : "\nNenhuma proposta nova: as pendentes continuam no painel.",
    "\n👉 Aprove ou rejeite no painel.",
  ].join("\n");

  return { gravadas: gravadas.length, por_regra: gravadas.filter((g) => g.origem === "regra").length, mensagem };
}
