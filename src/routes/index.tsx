import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getLots } from "@/lib/lots.functions";
import { PainelIA } from "@/components/painel/PainelIA";
import { NovoLote } from "@/components/cadastro/NovoLote";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  daysUntil, statusFor, stockTotals, expiringByMonth, availableFor,
  stockValueFor, hectaresCovered, seedClassInfo, statusRange, lotStateInfo,
  contact, type Status, type SeedClass,
} from "@/lib/inventory";

export const routeHead = () => ({
  meta: [
    { title: "Zênite Sementes | Estoque e Validades" },
    { name: "description", content: "Catálogo de sementes em estoque, com lote, germinação e validade de cada partida." },
    { property: "og:title", content: "Zênite Sementes | Estoque e Validades" },
    { property: "og:description", content: "Veja quais sementes temos em estoque e quando vence a análise de cada lote." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ],
});

export const Route = createFileRoute("/")({
  head: routeHead,
  loader: () => getLots(),
  component: Index,
});

const statusLabel: Record<Status, string> = {
  vencido: "Vencido",
  critico: "Vence em até 30 dias",
  atencao: "Vence em até 90 dias",
  ok: "Dentro do prazo",
};

const statusClass: Record<Status, string> = {
  vencido: "bg-destructive text-destructive-foreground",
  critico: "bg-warning text-warning-foreground",
  atencao: "bg-caution text-caution-foreground",
  ok: "bg-success text-success-foreground",
};

const statusHover: Record<Status, string> = {
  vencido: "hover:border-destructive",
  critico: "hover:border-warning",
  atencao: "hover:border-caution",
  ok: "hover:border-success",
};

// Texto da janela que abre ao clicar em cada caixinha de situação.
const groupDesc: Record<Status, string> = {
  vencido: "Lotes cuja validade já passou.",
  critico: "Lotes que vencem nos próximos 30 dias.",
  atencao: "Lotes que vencem entre 31 e 90 dias.",
  ok: "Lotes com validade acima de 90 dias.",
};

const groupTitle = (s: Status, n: number) => {
  const one = n === 1;
  switch (s) {
    case "vencido":
      return `${n} ${one ? "semente vencida" : "sementes vencidas"}`;
    case "critico":
      return `${n} ${one ? "semente que vence" : "sementes que vencem"} em até 30 dias`;
    case "atencao":
      return `${n} ${one ? "semente que vence" : "sementes que vencem"} em até 90 dias`;
    default:
      return `${n} ${one ? "semente" : "sementes"} dentro do prazo`;
  }
};

// Busca tolerante a acentos: "xaraes" encontra "Xaraés".
const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const brlCompact = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1,
  }).format(v);
const num = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const fmt = (iso: string) => iso.split("-").reverse().join("/");

function Index() {
  const { lots: seeds } = Route.useLoaderData();
  const [today, setToday] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  const [crop, setCrop] = useState("Todas as culturas");
  const [seedClass, setSeedClass] = useState("Todas as classes");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openStatus, setOpenStatus] = useState<Status | null>(null);
  const [tab, setTab] = useState("");

  useEffect(() => setToday(new Date()), []);

  const rows = useMemo(() => {
    const base = today ?? new Date("2026-10-27");
    const q = normalize(query);
    return seeds
      .map((s) => {
        const days = daysUntil(s.expiry, base);
        return { ...s, days, status: statusFor(days) };
      })
      .filter(
        (s) =>
          (crop === "Todas as culturas" || s.crop === crop) &&
          (seedClass === "Todas as classes" || s.seedClass === seedClass) &&
          normalize(`${s.cultivar} ${s.crop} ${s.lot} ${s.supplier} ${s.harvest}`).includes(q),
      )
      .sort((a, b) => a.days - b.days);
  }, [seeds, today, query, crop, seedClass]);

  const counts = rows.reduce(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
    {} as Record<Status, number>,
  );

  const totals = useMemo(() => stockTotals(rows, today ?? new Date("2026-10-27")), [rows, today]);
  const calendar = useMemo(() => expiringByMonth(rows, 12, today ?? new Date("2026-10-27")), [rows, today]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;
  const group = openStatus ? rows.filter((r) => r.status === openStatus) : [];

  const crops = ["Todas as culturas", ...Array.from(new Set(seeds.map((s) => s.crop)))];
  const classes = ["Todas as classes", ...Array.from(new Set(seeds.map((s) => s.seedClass)))];

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-end md:justify-between">
          <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] opacity-70">Zênite Sementes · por Inova Agro</p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl">Estoque de Sementes</h1>
          <p className="mt-4 font-mono text-xs uppercase tracking-widest opacity-70">
            {seeds.length} lotes · {new Set(seeds.map((s) => s.crop)).size} culturas ·
            atualizado em {today ? fmt(today.toISOString().slice(0, 10)) : "—"}
          </p>
          </div>
          <NovoLote />
        </div>
      </header>

      <PainelIA />

      <section className="mx-auto max-w-6xl px-6 pt-8">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-auto flex-wrap justify-start gap-1">
            {[["indicadores", "Indicadores do estoque"], ["calendario", "Calendário de vencimentos"]].map(([v, l]) => (
              <TabsTrigger key={v} value={v!} onMouseDown={(e) => { if (tab === v) { e.preventDefault(); setTab(""); } }}>
                {l} {tab === v ? "▴" : "▾"}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="indicadores" className="mt-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Valor total em estoque", value: brlCompact(totals.total), hint: `${rows.length} lotes` },
          { label: "Valor em risco", value: brlCompact(totals.atRisk), hint: "vencidos + vencendo em 30 dias" },
          { label: "Sementes reservadas", value: `${num(totals.reservedUnits)} emb.`, hint: "já comprometidas com cliente" },
          { label: "Área que o estoque cobre", value: `${num(totals.area)} ha`, hint: "na dose de semeadura de cada cultura" },
        ].map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="mt-2 font-display text-3xl text-card-foreground">{c.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>
          </div>
        ))}
            </div>
          </TabsContent>
          <TabsContent value="calendario" className="mt-4">
            <h2 className="font-display text-xl text-card-foreground">Calendário de vencimentos</h2>
            <p className="mt-1 text-sm text-muted-foreground">Lotes por mês · próximos 12 meses</p>
            <div className="mt-5 overflow-x-auto">
              <ChartContainer
                className="h-72 w-full min-w-[720px] aspect-auto"
                config={{ count: { label: "Lotes", color: "var(--primary)" } }}
                aria-label="Gráfico de colunas: quantidade de lotes vencidos e a vencer por mês"
              >
                <BarChart data={calendar} accessibilityLayer margin={{ top: 24, right: 12, bottom: 8, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} tickMargin={12} fontSize={11} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
                  <ChartTooltip content={
                    <ChartTooltipContent formatter={(value, _name, item) => (
                      <div className="grid gap-1">
                        <span>{value} lotes</span>
                        <span className="text-muted-foreground">Valor em estoque: {brl(item.payload.value)}</span>
                      </div>
                    )} />
                  } />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false}>
                    {calendar.map((b) => (
                      <Cell key={b.key} fill={b.key === "vencidos" ? "var(--destructive)" : "var(--primary)"} />
                    ))}
                    <LabelList dataKey="count" position="top" fill="var(--foreground)" fontSize={12} />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-6 py-8 md:grid-cols-4">
        {(["vencido", "critico", "atencao", "ok"] as Status[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setOpenStatus(s)}
            className={`cursor-pointer rounded-lg border border-border bg-card p-5 text-left transition ${statusHover[s]}`}
          >
            <span className={`inline-block h-2 w-8 rounded-full ${statusClass[s]}`} />
            <p className="mt-3 font-display text-3xl text-card-foreground">{counts[s] ?? 0}</p>
            <p className="text-sm text-muted-foreground">{statusLabel[s]}</p>
            <p className={`mt-1 text-xs ${s === "vencido" ? "text-destructive" : "text-muted-foreground"}`}>
              Clique para ver quais
            </p>
          </button>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="mb-4 flex flex-col gap-3 md:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por cultivar, cultura, lote, safra ou fornecedor..."
            className="flex-1 rounded-md border border-input bg-card px-4 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
            className="rounded-md border border-input bg-card px-4 py-2 text-foreground"
          >
            {crops.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select
            value={seedClass}
            onChange={(e) => setSeedClass(e.target.value)}
            className="rounded-md border border-input bg-card px-4 py-2 text-foreground"
          >
            {classes.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                {["Semente", "Cultura", "Safra", "Lote", "Valor", "Disponível", "Validade", "Situação"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} onClick={() => setSelectedId(s.id)} className="cursor-pointer border-t border-border text-card-foreground transition hover:bg-muted/60">
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.cultivar}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>Clique para ver detalhes</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.crop}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.harvest}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.lot}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium">{brl(s.price)}<div className="text-xs font-normal text-muted-foreground">por unidade</div></td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {num(availableFor(s))} {s.unit}
                    <div className="text-xs text-muted-foreground">
                      de {num(s.quantity)} · {num(s.reserved)} reservado{s.reserved === 1 ? "" : "s"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {fmt(s.expiry)}
                    <div className="text-xs text-muted-foreground">
                      {s.days < 0 ? `há ${-s.days} dias` : `em ${s.days} dias`}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${statusClass[s.status]}`}>
                      {statusLabel[s.status]}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    Nenhuma semente encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Validade = data-limite da análise de germinação de cada lote. Depois dela a germinação declarada
          precisa ser reanalisada antes da venda.
        </p>
      </section>


      <section className="border-t border-border bg-muted/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 md:grid-cols-2">
          <div>
            <h2 className="font-display text-xl text-card-foreground">Como ler os prazos</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {(["vencido", "critico", "atencao", "ok"] as Status[]).map((s) => (
                <li key={s} className="flex items-start gap-3">
                  <span className={`mt-1 inline-block h-2 w-8 shrink-0 rounded-full ${statusClass[s]}`} />
                  <span className="text-card-foreground">
                    <span className="font-medium">{statusLabel[s]}</span>
                    <span className="text-muted-foreground"> — {statusRange[s]}</span>
                  </span>
                </li>
              ))}
            </ul>
            <h3 className="mt-6 font-display text-lg text-card-foreground">Reservado × disponível</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              A quantidade da tabela é o que ainda pode ser vendido. O que já está comprometido com cliente
              aparece como reservado, e o total do lote fica na janela de detalhes.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl text-card-foreground">Classes de semente</h2>
            <dl className="mt-3 space-y-3 text-sm">
              {(Object.keys(seedClassInfo) as SeedClass[]).map((c) => (
                <div key={c}>
                  <dt className="font-medium text-card-foreground">{c}</dt>
                  <dd className="text-muted-foreground">{seedClassInfo[c]}</dd>
                </div>
              ))}
            </dl>
            <h3 className="mt-6 font-display text-lg text-card-foreground">Estado do lote vencido</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {Object.entries(lotStateInfo).map(([k, v]) => (
                <li key={k}><span className="font-medium text-card-foreground">{k}</span> — {v}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] opacity-70">Zênite Sementes · um projeto Inova Agro</p>
            <p className="mt-3 font-display text-2xl">Fale com a gente</p>
            <p className="mt-3 text-sm opacity-80">
              WhatsApp {contact.whatsapp} · Telefone {contact.phone}
            </p>
            <p className="text-sm opacity-80">{contact.address}</p>
            <p className="text-sm opacity-80">Atendimento: {contact.hours}</p>
          </div>
          <p className="max-w-xs text-xs opacity-70">
            Página de apresentação do estoque. Preços, contatos e parte dos dados são de exemplo e ainda
            serão conferidos pela loja.
          </p>
        </div>
      </footer>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.cultivar}</DialogTitle>
                <DialogDescription>
                  {selected.crop} · lote {selected.lot} · safra {selected.harvest} · {selected.supplier}
                </DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ["Valor", `${brl(selected.price)} / ${selected.unit}`],
                  ["Valor do lote", brl(stockValueFor(selected))],
                  ["Disponível", `${num(availableFor(selected))} ${selected.unit}`],
                  ["Reservado", `${num(selected.reserved)} ${selected.unit}`],
                  ["Germinação", `${selected.germination}%`],
                  ["Pureza", `${selected.purity}%`],
                  ["Classe", selected.seedClass],
                  ["Tratada", selected.treated ? "Sim" : "Não"],
                  ["Peso por embalagem", `${num(selected.basePerPackage)} ${selected.baseUnit}`],
                  ["Dose de semeadura", `${num(selected.seedRatePerHa)} ${selected.baseUnit}/ha`],
                  ["Área que cobre", `${num(hectaresCovered(selected))} ha`],
                  ["Certificado", selected.rasCode || "sem lacre oficial"],
                  ["Local", selected.location],
                  ["Guarda", selected.storage],
                  ["Estado do lote", `${selected.lotState} — ${lotStateInfo[selected.lotState]}`],
                  ["Validade", fmt(selected.expiry)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
                    <dd className="font-medium text-foreground">{v}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={openStatus !== null} onOpenChange={(o) => !o && setOpenStatus(null)}>
        <DialogContent>
          {openStatus && (
            <>
              <DialogHeader>
                <DialogTitle>{groupTitle(openStatus, group.length)}</DialogTitle>
                <DialogDescription>{groupDesc[openStatus]}</DialogDescription>
              </DialogHeader>
              {group.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum lote nesta situação.</p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {group.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-4 py-3">
                      <div>
                        <div className="font-medium text-foreground">{s.cultivar}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.crop} · lote {s.lot} · safra {s.harvest}
                        </div>
                        {s.lotState !== "no estoque" && (
                          <div className="mt-1 text-xs text-muted-foreground">{s.lotState}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${openStatus === "vencido" ? "text-destructive" : "text-foreground"}`}>
                          {fmt(s.expiry)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {s.days < 0 ? `há ${-s.days} dias` : `em ${s.days} dias`}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

    </main>
  );
}
