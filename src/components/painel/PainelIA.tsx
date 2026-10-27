import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { decidirProposta, getPainel, rodarAnalise, salvarCorte } from "@/lib/analise/painel.functions";

type Painel = Awaited<ReturnType<typeof getPainel>>;
type Proposta = Painel["propostas"][number];
type Risco = "critico" | "atencao" | "ok";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const num = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const dataBR = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const horaBR = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const riscoTxt: Record<Risco, string> = { critico: "Crítico", atencao: "Atenção", ok: "Sem sobra" };
const riscoCls: Record<Risco, string> = {
  critico: "bg-warning text-warning-foreground",
  atencao: "bg-caution text-caution-foreground",
  ok: "bg-success text-success-foreground",
};
const acaoTxt: Record<string, string> = {
  PROMOCAO: "Promoção", OFERTA_CLIENTES: "Oferta a produtores", REANALISE: "Pedir reanálise", MONITORAR: "Monitorar",
};
const memTxt: Record<string, string> = {
  preferencia_gestor: "Preferência do gestor", acao_eficaz: "Ação que funcionou", acao_ineficaz: "Ação que não funcionou",
  padrao_venda: "Padrão de venda", sobra: "Sobra",
};

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${className}`}>{children}</span>;
}

function CartaoProposta({ p, onDecidir }: { p: Proposta; onDecidir: (s: "aprovada" | "rejeitada", motivo?: string) => Promise<void> }) {
  const [rejeitando, setRejeitando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const n = p.numeros as Record<string, string | number | null>;
  const risco = (n["risco"] as Risco) ?? "atencao";
  const decidir = async (s: "aprovada" | "rejeitada") => {
    setSalvando(true);
    try { await onDecidir(s, motivo); } finally { setSalvando(false); setRejeitando(false); }
  };
  return (
    <article className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{p.lote} · {p.cultura}</p>
          <h3 className="mt-1 font-display text-lg text-card-foreground">{p.cultivar}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill className={riscoCls[risco]}>{riscoTxt[risco]}</Pill>
          <Pill className={p.origem === "ia" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}>
            {p.origem === "ia" ? "Sugerida pela IA" : "Regra automática"}
          </Pill>
        </div>
      </div>
      <p className="mt-4 font-display text-2xl text-card-foreground">
        {acaoTxt[p.acao] ?? p.acao}
        {p.acao === "PROMOCAO" && p.desconto_pct ? ` de ${num(Number(p.desconto_pct))}%` : ""}
        {p.quantidade ? <span className="text-muted-foreground"> · {p.quantidade} emb.</span> : null}
      </p>
      <p className="mt-2 text-sm text-card-foreground">{p.justificativa}</p>
      <p className="mt-3 text-xs text-muted-foreground">
        Sobra prevista {String(n["sobra"])} de {String(n["disponivel"])} {String(n["unidade"] ?? "")} · data limite {n["data_limite"] ? dataBR(String(n["data_limite"])) : "—"}
        {" "}({String(n["dias_ate_limite"])} dias) · {brl(Number(n["valor_em_risco"] ?? 0))} em risco
      </p>
      {p.status === "pendente" ? (
        <div className="mt-4 flex flex-col gap-2">
          {rejeitando && (
            <input
              autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300}
              placeholder="Motivo da rejeição (a IA usa isso nas próximas sugestões)"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          )}
          <div className="flex flex-wrap gap-2">
            {!rejeitando && (
              <button type="button" disabled={salvando} onClick={() => decidir("aprovada")}
                className="rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground disabled:opacity-50">Aprovar</button>
            )}
            {rejeitando ? (
              <>
                <button type="button" disabled={salvando || motivo.trim().length < 3} onClick={() => decidir("rejeitada")}
                  className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50">Confirmar rejeição</button>
                <button type="button" onClick={() => setRejeitando(false)} className="rounded-md border border-border px-4 py-2 text-sm text-card-foreground">Voltar</button>
              </>
            ) : (
              <button type="button" disabled={salvando} onClick={() => setRejeitando(true)}
                className="rounded-md border border-border px-4 py-2 text-sm text-card-foreground disabled:opacity-50">Rejeitar</button>
            )}
          </div>
        </div>
      ) : (
        <p className={`mt-4 text-sm font-medium ${p.status === "aprovada" ? "text-success" : "text-destructive"}`}>
          {p.status === "aprovada" ? "Aprovada" : `Rejeitada${p.motivo_rejeicao ? `: ${p.motivo_rejeicao}` : ""}`}
          {p.decidido_em ? <span className="font-normal text-muted-foreground"> · {horaBR(p.decidido_em)}</span> : null}
        </p>
      )}
    </article>
  );
}

export function PainelIA() {
  const carregar = useServerFn(getPainel);
  const decidir = useServerFn(decidirProposta);
  const salvar = useServerFn(salvarCorte);
  const rodar = useServerFn(rodarAnalise);
  const [dados, setDados] = useState<Painel | null>(null);
  const [erro, setErro] = useState("");
  const [rodando, setRodando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [mes, setMes] = useState<string | null>(null);
  const [cortes, setCortes] = useState<Record<string, string>>({});
  const espera = useRef<number | null>(null);

  const atualizar = useCallback(async () => {
    try {
      const d = await carregar();
      setDados(d);
      setErro("");
      return d;
    } catch {
      setErro("Não foi possível carregar o painel.");
      return null;
    }
  }, [carregar]);

  useEffect(() => {
    void atualizar();
    const recarregar = () => void atualizar();
    window.addEventListener("lotes-alterados", recarregar);
    return () => {
      window.removeEventListener("lotes-alterados", recarregar);
      if (espera.current) window.clearInterval(espera.current);
    };
  }, [atualizar]);

  const clicarRodar = async () => {
    setRodando(true);
    setAviso("A IA está analisando os lotes. Isso leva uns 30 segundos…");
    const antes = dados?.execucao?.id ?? 0;
    const r = await rodar();
    if (!r.ok) { setRodando(false); setAviso(r.erro ?? "Não foi possível rodar a análise."); return; }
    let voltas = 0;
    espera.current = window.setInterval(async () => {
      voltas++;
      const d = await atualizar();
      const ex = d?.execucao;
      if ((ex && ex.id !== antes && ex.status !== "rodando") || voltas > 30) {
        if (espera.current) window.clearInterval(espera.current);
        setRodando(false);
        setAviso(voltas > 30 ? "A análise está demorando. As propostas aparecem aqui quando o n8n terminar." : "Análise concluída.");
      }
    }, 4000);
  };

  const onDecidir = (id: number) => async (status: "aprovada" | "rejeitada", motivo?: string) => {
    await decidir({ data: { id, status, motivo: motivo ?? "" } });
    await atualizar();
  };

  const pendentes = useMemo(() => dados?.propostas.filter((p) => p.status === "pendente") ?? [], [dados]);
  const decididas = useMemo(() => dados?.propostas.filter((p) => p.status !== "pendente").slice(0, 12) ?? [], [dados]);
  const resumo = dados?.resumos.find((r) => r.mes === mes) ?? dados?.resumos[dados.resumos.length - 1] ?? null;
  const perdaEvitada6m = dados?.resumos.reduce((s, r) => s + r.perdaEvitada, 0) ?? 0;

  if (!dados) {
    return (
      <section className="mx-auto max-w-6xl px-6 pt-8">
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          {erro || "Carregando o painel de validade…"}
        </div>
      </section>
    );
  }

  const { previsao, execucao } = dados;
  const emRisco = previsao.lotes.filter((l) => l.risco !== "ok");

  return (
    <section className="mx-auto max-w-6xl px-6 pt-8">
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Painel de validade com IA</p>
            <h2 className="mt-1 font-display text-2xl text-card-foreground">O que vai sobrar até a data limite de venda</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A previsão vem do histórico de vendas; a IA (no n8n) só sugere a ação, e o gestor decide.
              {execucao ? ` Última análise: ${horaBR(execucao.iniciado_em)} (${execucao.gatilho === "botao" ? "botão" : "automática"}).` : " Nenhuma análise rodada ainda."}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <button type="button" onClick={clicarRodar} disabled={rodando || !dados.rodarDisponivel}
              className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {rodando ? "Analisando…" : "Rodar análise agora"}
            </button>
            {!dados.rodarDisponivel && <p className="text-xs text-muted-foreground">Botão ligado quando o n8n estiver configurado.</p>}
          </div>
        </div>
        {aviso && <p className="mt-3 text-sm text-card-foreground">{aviso}</p>}

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { l: "Valor que vai sobrar", v: brl(previsao.valorEmRisco), h: `${emRisco.length} lotes com sobra prevista` },
            { l: "Críticos · atenção", v: `${previsao.criticos} · ${previsao.atencao}`, h: "crítico = até 30 dias da data limite" },
            { l: "Propostas pendentes", v: String(pendentes.length), h: "aguardando decisão do gestor" },
            { l: "Perda evitada (6 meses)", v: brl(perdaEvitada6m), h: "por propostas aprovadas" },
          ].map((c) => (
            <div key={c.l} className="rounded-lg border border-border bg-background p-4">
              <p className="text-sm text-muted-foreground">{c.l}</p>
              <p className="mt-1 font-display text-2xl text-card-foreground">{c.v}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.h}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="propostas" className="mt-6">
          <TabsList className="h-auto flex-wrap justify-start gap-1">
            <TabsTrigger value="propostas">Propostas da IA{pendentes.length ? ` (${pendentes.length})` : ""}</TabsTrigger>
            <TabsTrigger value="previsao">Previsão por lote</TabsTrigger>
            <TabsTrigger value="corte">Prazo de corte</TabsTrigger>
            <TabsTrigger value="resumos">Resumos mensais</TabsTrigger>
            <TabsTrigger value="memoria">Memória da IA</TabsTrigger>
          </TabsList>

          <TabsContent value="propostas" className="mt-4">
            {pendentes.length === 0 && (
              <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
                Nenhuma proposta pendente. Rode a análise para a IA sugerir o que fazer com os {emRisco.length} lotes com sobra prevista.
              </p>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {pendentes.map((p) => <CartaoProposta key={p.id} p={p} onDecidir={onDecidir(p.id)} />)}
            </div>
            {decididas.length > 0 && (
              <>
                <h3 className="mt-8 font-display text-lg text-card-foreground">Decididas recentemente</h3>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  {decididas.map((p) => <CartaoProposta key={p.id} p={p} onDecidir={onDecidir(p.id)} />)}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="previsao" className="mt-4">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    {["Semente", "Disponível", "Data limite", "Venda/dia", "Previsão até o limite", "Sobra", "Valor", "Risco"].map((h) => (
                      <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previsao.lotes.map((l) => (
                    <tr key={l.lote} className="border-t border-border text-card-foreground">
                      <td className="px-4 py-3"><div className="font-medium">{l.cultivar}</div><div className="font-mono text-xs text-muted-foreground">{l.lote} · {l.cultura}</div></td>
                      <td className="whitespace-nowrap px-4 py-3">{l.disponivel}</td>
                      <td className="whitespace-nowrap px-4 py-3">{dataBR(l.dataLimite)}<div className="text-xs text-muted-foreground">{l.diasAteLimite} dias · corte {l.prazoCorte}d</div></td>
                      <td className="whitespace-nowrap px-4 py-3">{num(l.vendaDiaRecente)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{l.demandaPrevista}<div className="text-xs text-muted-foreground">ano passado: {l.vendasAnoPassado}</div></td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium">{l.sobra}</td>
                      <td className="whitespace-nowrap px-4 py-3">{brl(l.valorEmRisco)}</td>
                      <td className="px-4 py-3"><Pill className={riscoCls[l.risco]}>{riscoTxt[l.risco]}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Previsão = média entre o ritmo dos últimos 30 dias e o que vendeu no mesmo período do ano passado. Sobra = disponível − previsão.
            </p>
          </TabsContent>

          <TabsContent value="corte" className="mt-4">
            <p className="text-sm text-muted-foreground">
              Quantos dias antes da validade a loja para de vender cada cultura. A data limite da previsão usa esse prazo.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {dados.regras.map((r) => {
                const valor = cortes[r.cultura] ?? String(r.dias);
                const mudou = Number(valor) !== r.dias;
                return (
                  <div key={r.cultura} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-4">
                    <div>
                      <p className="font-medium text-card-foreground">{r.cultura}</p>
                      <p className="text-xs text-muted-foreground">padrão {r.padrao} dias</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="number" min={0} max={365} value={valor}
                        onChange={(e) => setCortes((c) => ({ ...c, [r.cultura]: e.target.value }))}
                        className="w-20 rounded-md border border-input bg-card px-2 py-1 text-right text-foreground" aria-label={`Prazo de corte de ${r.cultura} em dias`} />
                      <button type="button" disabled={!mudou}
                        onClick={async () => { await salvar({ data: { cultura: r.cultura, dias: Number(valor) } }); setCortes((c) => { const n = { ...c }; delete n[r.cultura]; return n; }); await atualizar(); }}
                        className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-40">Salvar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="resumos" className="mt-4">
            <div className="flex flex-wrap gap-2">
              {dados.resumos.map((r) => (
                <button key={r.mes} type="button" onClick={() => setMes(r.mes)}
                  className={`rounded-full px-4 py-1 text-sm ${resumo?.mes === r.mes ? "bg-primary text-primary-foreground" : "border border-border text-card-foreground"}`}>
                  {r.rotulo}
                </button>
              ))}
            </div>
            {resumo && (
              <div className="mt-5 grid gap-6 md:grid-cols-[1.4fr_1fr]">
                <div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {[
                      ["Vendido", `${resumo.vendido} emb.`], ["Previsto", `${resumo.previsto} emb.`],
                      ["Acurácia", `${num(resumo.acuraciaPct)}%`], ["Perda evitada", brl(resumo.perdaEvitada)],
                    ].map(([l, v]) => (
                      <div key={l} className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs text-muted-foreground">{l}</p>
                        <p className="mt-1 font-display text-lg text-card-foreground">{v}</p>
                      </div>
                    ))}
                  </div>
                  <ChartContainer className="mt-4 h-64 w-full aspect-auto"
                    config={{ previsto: { label: "Previsto", color: "var(--muted-foreground)" }, vendido: { label: "Vendido", color: "var(--primary)" } }}
                    aria-label={`Previsto e vendido por cultura em ${resumo.rotulo}`}>
                    <BarChart data={resumo.linhas} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="cultura" tickLine={false} axisLine={false} fontSize={11} interval={0} />
                      <YAxis tickLine={false} axisLine={false} width={34} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="previsto" fill="var(--color-previsto)" radius={4} />
                      <Bar dataKey="vendido" fill="var(--color-vendido)" radius={4} />
                    </BarChart>
                  </ChartContainer>
                </div>
                <div>
                  <h3 className="font-display text-lg text-card-foreground">Destaques</h3>
                  <ul className="mt-2 space-y-2 text-sm text-card-foreground">
                    {resumo.destaques.map((d) => <li key={d}>• {d}</li>)}
                  </ul>
                  <h3 className="mt-5 font-display text-lg text-card-foreground">Aprendizados (vão para a memória)</h3>
                  <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                    {resumo.aprendizados.length ? resumo.aprendizados.map((d) => <li key={d}>• {d}</li>) : <li>Nenhum desvio relevante no mês.</li>}
                  </ul>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="memoria" className="mt-4">
            <p className="text-sm text-muted-foreground">
              O que a IA consulta antes de cada sugestão. Ela não decora: o sistema guarda o histórico e entrega o que é relevante para cada lote.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {dados.memoria.map((m) => (
                <div key={m.texto} className="rounded-lg border border-border bg-background p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {memTxt[m.tipo] ?? m.tipo}{m.cultura ? ` · ${m.cultura}` : ""} · {m.origem}
                  </p>
                  <p className="mt-1 text-sm text-card-foreground">{m.texto}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        <p className="mt-6 text-xs text-muted-foreground">
          Histórico de vendas simulado para o protótipo{dados.armazenamento === "memoria" ? " · propostas guardadas na memória do servidor (Supabase não configurado)" : ""}.
        </p>
      </div>
    </section>
  );
}
