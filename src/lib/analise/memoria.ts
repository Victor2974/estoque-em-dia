// Resumos mensais e memória da IA.
//
// Os 6 últimos meses fechados servem de MOLDE: os números (vendido, previsto, erro)
// saem do mesmo histórico de vendas da previsão; os textos seguem um formato fixo,
// que o fechamento mensal do n8n repete nos meses seguintes.
import type { Crop, SeedLot } from "@/lib/inventory";
import { vendasPorMes } from "@/lib/analise/historico";

export interface LinhaResumo {
  cultura: Crop;
  previsto: number;
  vendido: number;
  erroPct: number;
  sobra: number;
}

export interface ResumoMensal {
  mes: string; // AAAA-MM
  rotulo: string; // out/26
  vendido: number;
  previsto: number;
  acuraciaPct: number;
  sobraValor: number;
  perdaEvitada: number;
  propostasAprovadas: number;
  propostasRejeitadas: number;
  linhas: LinhaResumo[];
  destaques: string[];
  aprendizados: string[];
}

export interface Memoria {
  tipo: "padrao_venda" | "acao_eficaz" | "acao_ineficaz" | "preferencia_gestor" | "sobra";
  cultura: Crop | null;
  texto: string;
  origem: string; // mês ou "gestor"
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const pct = (v: number) => `${Math.abs(v).toFixed(1).replace(".", ",")}%`;
const brl = (v: number) => `R$ ${Math.round(v).toLocaleString("pt-BR")}`;

// O que aconteceu com as propostas aprovadas/rejeitadas nesses meses (histórico do protótipo).
const ACOES_HISTORICAS: Array<{ mes: string; cultura: Crop; texto: string; tipo: Memoria["tipo"]; aprovada: boolean; evitado: number }> = [
  { mes: "2026-05", cultura: "Trigo", tipo: "acao_eficaz", aprovada: true, evitado: 6120,
    texto: "Oferta direta a produtores de trigo no início do plantio escoou 85% da sobra (34 de 40 sacos)." },
  { mes: "2026-06", cultura: "Milho", tipo: "acao_ineficaz", aprovada: true, evitado: 11600,
    texto: "Promoção de 10% em milho fora da janela de plantio escoou só 40% da sobra (8 de 20 sacos)." },
  { mes: "2026-07", cultura: "Soja", tipo: "preferencia_gestor", aprovada: false, evitado: 0,
    texto: "Gestor rejeitou promoção de 25% em soja: \"desconto acima de 15% não compensa\"." },
  { mes: "2026-08", cultura: "Soja", tipo: "acao_eficaz", aprovada: true, evitado: 14596,
    texto: "Promoção de 12% em soja um mês antes do plantio escoou 82% da sobra (41 de 50 sacos)." },
  { mes: "2026-09", cultura: "Trigo", tipo: "acao_eficaz", aprovada: true, evitado: 7400,
    texto: "Pedir reanálise de germinação de trigo vencido liberou 40 sacos para venda por mais 6 meses." },
  { mes: "2026-10", cultura: "Feijão", tipo: "acao_eficaz", aprovada: true, evitado: 9600,
    texto: "Oferta direta a produtores de feijão escoou 100% da sobra (30 de 30 sacos)." },
];

const PREFERENCIAS: Memoria[] = [
  { tipo: "preferencia_gestor", cultura: null, origem: "gestor",
    texto: "Preferência do gestor: desconto máximo de 15%; acima disso, preferir oferta direta ou reanálise." },
  { tipo: "preferencia_gestor", cultura: null, origem: "gestor",
    texto: "Preferência do gestor: lote que já passou da data limite vai primeiro para reanálise de germinação, não para descarte." },
];

function chaveMes(base: Date, recuo: number) {
  const d = new Date(base.getFullYear(), base.getMonth() - recuo, 1);
  return { chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, rotulo: `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}` };
}

/** Os 6 meses fechados antes do mês atual, do mais antigo ao mais recente. */
export function resumosMensais(lots: SeedLot[], hoje = new Date()): ResumoMensal[] {
  const vendasLote = lots.map((l) => ({ lot: l, meses: vendasPorMes(l, hoje) }));
  const culturas = Array.from(new Set(lots.map((l) => l.crop)));
  const seguidos = new Map<Crop, number>();
  const resumos: ResumoMensal[] = [];

  for (let r = 6; r >= 1; r--) {
    const { chave, rotulo } = chaveMes(hoje, r);
    const linhas: LinhaResumo[] = [];
    for (const cultura of culturas) {
      const doCultivo = vendasLote.filter((v) => v.lot.crop === cultura);
      const vendido = doCultivo.reduce((s, v) => s + (v.meses.get(chave) ?? 0), 0);
      // Previsão "de antes" (ano passado): erra para cima onde a venda vem caindo e para baixo onde vem subindo.
      const viesCultura: Partial<Record<Crop, number>> = { Trigo: 1.28, Milho: 1.22, Hortaliças: 1.3, Soja: 0.86 };
      const previsto = Math.max(1, Math.round(vendido * (viesCultura[cultura] ?? 1.04)));
      if (vendido < 3) continue;
      const erroPct = Math.round(((vendido - previsto) / previsto) * 1000) / 10;
      const sobra = erroPct <= -15 ? Math.round((previsto - vendido) * 0.6) : 0;
      linhas.push({ cultura, previsto, vendido, erroPct, sobra });
    }
    const precoMedio = (c: Crop) => {
      const ls = lots.filter((l) => l.crop === c);
      return ls.reduce((s, l) => s + l.price, 0) / Math.max(ls.length, 1);
    };
    const vendido = linhas.reduce((s, l) => s + l.vendido, 0);
    const previsto = linhas.reduce((s, l) => s + l.previsto, 0);
    const sobraValor = linhas.reduce((s, l) => s + l.sobra * precoMedio(l.cultura), 0);
    const acoes = ACOES_HISTORICAS.filter((a) => a.mes === chave);
    const perdaEvitada = acoes.reduce((s, a) => s + a.evitado, 0);
    const erroGeral = previsto ? ((vendido - previsto) / previsto) * 100 : 0;

    const destaques = [`Vendidas ${vendido.toLocaleString("pt-BR")} embalagens, ${pct(erroGeral)} ${erroGeral >= 0 ? "acima" : "abaixo"} do previsto.`];
    const maior = [...linhas].sort((a, b) => b.sobra * precoMedio(b.cultura) - a.sobra * precoMedio(a.cultura))[0];
    if (maior && maior.sobra > 0) destaques.push(`Maior sobra: ${maior.cultura}, ${maior.sobra} embalagens (${brl(maior.sobra * precoMedio(maior.cultura))}).`);
    if (acoes.length) destaques.push(`${acoes.filter((a) => a.aprovada).length} de ${acoes.length} propostas aprovadas, evitando ${brl(perdaEvitada)} em perdas.`);

    const aprendizados: string[] = [];
    for (const l of linhas) {
      if (l.erroPct <= -15) {
        const n = (seguidos.get(l.cultura) ?? 0) + 1;
        seguidos.set(l.cultura, n);
        aprendizados.push(`${rotulo}: ${l.cultura} vendeu ${pct(l.erroPct)} abaixo do previsto${n >= 2 ? ` (${n}º mês seguido)` : ""}.`);
      } else {
        seguidos.set(l.cultura, 0);
        if (l.erroPct >= 12) aprendizados.push(`${rotulo}: ${l.cultura} vendeu ${pct(l.erroPct)} acima do previsto.`);
      }
    }
    for (const a of acoes) aprendizados.push(`${rotulo}: ${a.texto}`);

    resumos.push({
      mes: chave, rotulo, vendido, previsto,
      acuraciaPct: Math.round((100 - Math.abs(erroGeral)) * 10) / 10,
      sobraValor: Math.round(sobraValor), perdaEvitada,
      propostasAprovadas: acoes.filter((a) => a.aprovada).length,
      propostasRejeitadas: acoes.filter((a) => !a.aprovada).length,
      linhas, destaques, aprendizados,
    });
  }
  return resumos;
}

/** Memória que a IA consulta: aprendizados dos resumos + resultados de ações + preferências do gestor. */
export function memoriaIA(lots: SeedLot[], hoje = new Date()): Memoria[] {
  const resumos = resumosMensais(lots, hoje);
  const mem: Memoria[] = [...PREFERENCIAS];
  for (const a of ACOES_HISTORICAS) mem.push({ tipo: a.tipo, cultura: a.cultura, texto: a.texto, origem: a.mes });
  const ultimo = resumos[resumos.length - 1];
  if (ultimo) {
    for (const l of ultimo.linhas) {
      const abaixo = resumos.filter((r) => r.linhas.some((x) => x.cultura === l.cultura && x.erroPct <= -15)).length;
      if (abaixo >= 3)
        mem.push({ tipo: "padrao_venda", cultura: l.cultura, origem: ultimo.mes,
          texto: `Padrão: ${l.cultura} vendeu abaixo do previsto em ${abaixo} dos últimos 6 meses; a previsão pelo ano passado tende a superestimar a demanda.` });
      const acima = resumos.filter((r) => r.linhas.some((x) => x.cultura === l.cultura && x.erroPct >= 12)).length;
      if (acima >= 3)
        mem.push({ tipo: "padrao_venda", cultura: l.cultura, origem: ultimo.mes,
          texto: `Padrão: ${l.cultura} vendeu acima do previsto em ${acima} dos últimos 6 meses; a demanda vem crescendo.` });
    }
  }
  return mem;
}
