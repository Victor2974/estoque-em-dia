import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { seeds } from "@/lib/inventory";
import { analisarEstoque, CORTE_PADRAO } from "@/lib/analise/previsao";
import { memoriaIA, resumosMensais } from "@/lib/analise/memoria";

const hoje = new Date(2026, 9, 27);
const prev = analisarEstoque(seeds, {}, hoje);
const painel = {
  previsao: prev,
  propostas: [{
    id: 1, criado_em: "2026-10-27T09:00:00Z", lote: "ML-1180", cultura: "Milho", cultivar: "AG 8088 PRO3",
    acao: "OFERTA_CLIENTES", quantidade: 100, desconto_pct: null, origem: "ia", status: "pendente",
    justificativa: "Sobra de 114 sacos; oferta direta funcionou antes.", motivo_rejeicao: null, decidido_em: null,
    numeros: { sobra: 114, disponivel: 160, data_limite: "2026-12-24", dias_ate_limite: 58, valor_em_risco: 165300, risco: "atencao", unidade: "sacos" },
  }],
  execucao: null,
  armazenamento: "memoria",
  rodarDisponivel: false,
  regras: Array.from(new Set(seeds.map((s) => s.crop))).map((c) => ({ cultura: c, dias: CORTE_PADRAO[c], padrao: CORTE_PADRAO[c] })),
  resumos: resumosMensais(seeds, hoje),
  memoria: memoriaIA(seeds, hoje),
};
const decidir = vi.fn(async () => ({ ok: true }));

vi.mock("@tanstack/react-start", () => ({
  useServerFn: (fn: { nome: string }) => fn,
}));
vi.mock("@/lib/analise/painel.functions", () => ({
  getPainel: async () => painel,
  decidirProposta: (a: unknown) => decidir(a),
  salvarCorte: async () => ({ ok: true }),
  rodarAnalise: async () => ({ ok: false, erro: "sem n8n" }),
}));

import { PainelIA } from "@/components/painel/PainelIA";

describe("Painel de validade com IA", () => {
  it("mostra a previsão, as propostas e aprova uma proposta", async () => {
    render(<PainelIA />);
    await waitFor(() => expect(screen.getByText("O que vai sobrar até a data limite de venda")).toBeInTheDocument());
    expect(screen.getByText("AG 8088 PRO3")).toBeInTheDocument();
    expect(screen.getByText(/Oferta a produtores/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Aprovar" }));
    await waitFor(() => expect(decidir).toHaveBeenCalledWith({ data: { id: 1, status: "aprovada", motivo: "" } }));
  });

  it("gera 6 resumos mensais com aprendizados e memória", () => {
    expect(painel.resumos).toHaveLength(6);
    expect(painel.resumos.some((r) => r.aprendizados.length > 0)).toBe(true);
    expect(painel.memoria.length).toBeGreaterThan(5);
    expect(prev.criticos + prev.atencao).toBeGreaterThan(0);
  });
});
