import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { products, daysUntil, statusFor, type Status } from "@/lib/inventory";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zênite | Estoque e Validades" },
      { name: "description", content: "Painel de produtos agropecuários em estoque com controle de validade." },
      { property: "og:title", content: "Zênite | Estoque e Validades" },
      { property: "og:description", content: "Veja os insumos em estoque e quando cada lote vence." },
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

function Index() {
  const [today, setToday] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("Todas");
  useEffect(() => setToday(new Date()), []);

  const rows = useMemo(() => {
    const base = today ?? new Date("2026-10-27");
    return products
      .map((p) => {
        const days = daysUntil(p.expiry, base);
        return { ...p, days, status: statusFor(days) };
      })
      .filter((p) => (cat === "Todas" || p.category === cat) && p.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.days - b.days);
  }, [today, query, cat]);

  const counts = rows.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {} as Record<Status, number>);
  const categories = ["Todas", ...Array.from(new Set(products.map((p) => p.category)))];

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="font-mono text-xs uppercase tracking-[0.3em] opacity-70">Zênite Agropecuária</p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl">Estoque & Validades</h1>
          <p className="mt-2 max-w-xl opacity-80">Acompanhe cada lote e evite perdas por vencimento.</p>
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
            placeholder="Buscar produto..."
            className="flex-1 rounded-md border border-input bg-card px-4 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="rounded-md border border-input bg-card px-4 py-2 text-foreground"
          >
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                {["Produto", "Categoria", "Lote", "Quantidade", "Local", "Validade", "Situação"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-border text-card-foreground">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.lot}</td>
                  <td className="px-4 py-3">{p.quantity} {p.unit}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.location}</td>
                  <td className="px-4 py-3">
                    {p.expiry.split("-").reverse().join("/")}
                    <div className="text-xs text-muted-foreground">
                      {p.days < 0 ? `há ${-p.days} dias` : `em ${p.days} dias`}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${statusClass[p.status]}`}>
                      {statusLabel[p.status]}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Nenhum produto encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
