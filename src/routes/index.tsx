import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { seeds, daysUntil, statusFor, type Status } from "@/lib/inventory";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zênite Sementes | Estoque e Validades" },
      { name: "description", content: "Catálogo de sementes em estoque, com lote, germinação e validade de cada partida." },
      { property: "og:title", content: "Zênite Sementes | Estoque e Validades" },
      { property: "og:description", content: "Veja quais sementes temos em estoque e quando vence a análise de cada lote." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
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

// Busca tolerante a acentos: "xaraes" encontra "Xaraés".
const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function Index() {
  const [today, setToday] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  const [crop, setCrop] = useState("Todas as culturas");
  const [seedClass, setSeedClass] = useState("Todas as classes");

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
          normalize(`${s.cultivar} ${s.crop} ${s.lot}`).includes(q),
      )
      .sort((a, b) => a.days - b.days);
  }, [today, query, crop, seedClass]);

  const counts = rows.reduce(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
    {} as Record<Status, number>,
  );

  const crops = ["Todas as culturas", ...Array.from(new Set(seeds.map((s) => s.crop)))];
  const classes = ["Todas as classes", ...Array.from(new Set(seeds.map((s) => s.seedClass)))];

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="font-mono text-xs uppercase tracking-[0.3em] opacity-70">Zênite Sementes</p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl">Estoque de Sementes</h1>
          <p className="mt-2 max-w-xl opacity-80">
            Só sementes no nosso estoque. Acompanhe cada lote, a germinação da análise e a validade, para
            evitar perdas por vencimento.
          </p>
          <p className="mt-4 font-mono text-xs uppercase tracking-widest opacity-70">
            {seeds.length} lotes · {new Set(seeds.map((s) => s.crop)).size} culturas
          </p>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-6 py-8 md:grid-cols-4">
        {(["vencido", "critico", "atencao", "ok"] as Status[]).map((s) => (
          <div key={s} className="rounded-lg border border-border bg-card p-5">
            <span className={`inline-block h-2 w-8 rounded-full ${statusClass[s]}`} />
            <p className="mt-3 font-display text-3xl text-card-foreground">{counts[s] ?? 0}</p>
            <p className="text-sm text-muted-foreground">{statusLabel[s]}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="mb-4 flex flex-col gap-3 md:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por cultivar, cultura ou lote..."
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
                {["Semente", "Cultura", "Lote", "Germinação", "Quantidade", "Local", "Validade", "Situação"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-border text-card-foreground">
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.cultivar}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{s.seedClass}</span>
                      {s.treated && <span>tratada</span>}
                      <span>pureza {s.purity}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.crop}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.lot}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.germination}%</td>
                  <td className="px-4 py-3">{s.quantity} {s.unit}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.location}</td>
                  <td className="px-4 py-3">
                    {s.expiry.split("-").reverse().join("/")}
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
    </main>
  );
}
