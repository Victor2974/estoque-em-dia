import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adicionarLote } from "@/lib/cadastro.functions";
import type { Crop, SeedClass } from "@/lib/inventory";

// Embalagem, base e dose de semeadura padrão de cada cultura (o usuário pode trocar a embalagem).
const PADRAO: Record<Crop, { unidade: string; base: number; unidadeBase: "kg" | "mil sementes" | "g"; dose: number; prefixo: string }> = {
  Soja: { unidade: "sacos 40 kg", base: 40, unidadeBase: "kg", dose: 100, prefixo: "SJ" },
  Milho: { unidade: "sacos 60 mil sementes", base: 60, unidadeBase: "mil sementes", dose: 60, prefixo: "ML" },
  Sorgo: { unidade: "sacos 25 kg", base: 25, unidadeBase: "kg", dose: 8, prefixo: "SG" },
  Trigo: { unidade: "sacos 40 kg", base: 40, unidadeBase: "kg", dose: 100, prefixo: "TR" },
  Feijão: { unidade: "sacos 30 kg", base: 30, unidadeBase: "kg", dose: 90, prefixo: "FJ" },
  Algodão: { unidade: "sacos 20 mil sementes", base: 20, unidadeBase: "mil sementes", dose: 60, prefixo: "AL" },
  Aveia: { unidade: "sacos 40 kg", base: 40, unidadeBase: "kg", dose: 100, prefixo: "AV" },
  Forrageiras: { unidade: "sacos 25 kg", base: 25, unidadeBase: "kg", dose: 10, prefixo: "FB" },
  Hortaliças: { unidade: "pacotes 10 g", base: 10, unidadeBase: "g", dose: 300, prefixo: "HT" },
};
const CULTURAS = Object.keys(PADRAO) as Crop[];
const CLASSES: SeedClass[] = ["Certificada", "Fiscalizada", "Grão para plantio"];

const vazio = () => ({
  cultura: "Soja" as Crop, cultivar: "", lote: "", classe: "Certificada" as SeedClass, quantidade: "", unidade: PADRAO.Soja.unidade,
  validade: "", preco: "", germinacao: "90", fornecedor: "", local: "Galpão A", safra: "2025/26",
});

const campo = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

export function NovoLote() {
  const router = useRouter();
  const enviar = useServerFn(adicionarLote);
  const [aberto, setAberto] = useState(false);
  const [f, setF] = useState(vazio);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [salvando, setSalvando] = useState(false);

  const set = (k: keyof ReturnType<typeof vazio>) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = e.target.value;
    setF((x) => (k === "cultura" ? { ...x, cultura: v as Crop, unidade: PADRAO[v as Crop].unidade } : { ...x, [k]: v }));
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(""); setOk("");
    const qtd = Number(f.quantidade), preco = Number(f.preco), germ = Number(f.germinacao);
    if (!f.cultivar.trim()) return setErro("Informe a cultivar.");
    if (!f.lote.trim()) return setErro("Informe o código do lote.");
    if (!Number.isInteger(qtd) || qtd <= 0) return setErro("Quantidade precisa ser um número inteiro maior que zero.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.validade)) return setErro("Informe a validade da análise de germinação.");
    if (!(preco >= 0)) return setErro("Preço inválido.");
    if (!(germ >= 0 && germ <= 100)) return setErro("Germinação precisa estar entre 0 e 100%.");
    if (!f.fornecedor.trim()) return setErro("Informe o fornecedor.");
    const p = PADRAO[f.cultura];
    setSalvando(true);
    try {
      const r = await enviar({
        data: {
          lote: f.lote.trim().toUpperCase(), cultura: f.cultura, cultivar: f.cultivar.trim(), classe: f.classe, tratada: false,
          germinacao: germ, pureza: 98, quantidade: qtd, unidade: f.unidade.trim() || p.unidade, reservado: 0,
          safra: f.safra.trim() || "2025/26", fornecedor: f.fornecedor.trim(), base_por_embalagem: p.base, unidade_base: p.unidadeBase,
          dose_por_ha: p.dose, codigo_ras: "", armazenamento: f.cultura === "Hortaliças" ? "Câmara fria (5–10 °C)" : "Ambiente seco e ventilado",
          estado: "no estoque", validade: f.validade, local: f.local.trim() || "Galpão A", preco,
        },
      });
      if (!r.ok) { setErro(r.erro ?? "Não foi possível cadastrar."); return; }
      setOk(`Lote ${r.lote} cadastrado${r.onde === "memoria" ? " (modelo: fica salvo até o servidor reiniciar)" : ""}.`);
      setF(vazio());
      await router.invalidate();
      window.dispatchEvent(new Event("lotes-alterados"));
    } catch {
      setErro("Confira os campos: algum valor está fora do formato esperado.");
    } finally {
      setSalvando(false);
    }
  };

  const sugestao = `${PADRAO[f.cultura].prefixo}-${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}`;

  return (
    <>
      <button type="button" onClick={() => { setAberto(true); setOk(""); setErro(""); }}
        className="rounded-md border border-primary-foreground/40 px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-foreground/10">
        + Adicionar lote
      </button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo lote de semente</DialogTitle>
            <DialogDescription>Entra na tabela, nos indicadores e na próxima análise da IA.</DialogDescription>
          </DialogHeader>
          <form onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">Cultura
              <select className={campo} value={f.cultura} onChange={set("cultura")}>{CULTURAS.map((c) => <option key={c}>{c}</option>)}</select>
            </label>
            <label className="grid gap-1 text-sm">Cultivar
              <input className={campo} value={f.cultivar} onChange={set("cultivar")} placeholder="Ex.: BMX Zeus IPRO" maxLength={120} />
            </label>
            <label className="grid gap-1 text-sm">Código do lote
              <input className={campo} value={f.lote} onChange={set("lote")} placeholder={`Ex.: ${sugestao}`} maxLength={40} />
            </label>
            <label className="grid gap-1 text-sm">Classe
              <select className={campo} value={f.classe} onChange={set("classe")}>{CLASSES.map((c) => <option key={c}>{c}</option>)}</select>
            </label>
            <label className="grid gap-1 text-sm">Quantidade (embalagens)
              <input className={campo} type="number" min={1} step={1} value={f.quantidade} onChange={set("quantidade")} />
            </label>
            <label className="grid gap-1 text-sm">Embalagem
              <input className={campo} value={f.unidade} onChange={set("unidade")} maxLength={60} />
            </label>
            <label className="grid gap-1 text-sm">Validade da análise de germinação
              <input className={campo} type="date" value={f.validade} onChange={set("validade")} />
            </label>
            <label className="grid gap-1 text-sm">Preço por embalagem (R$)
              <input className={campo} type="number" min={0} step="0.01" value={f.preco} onChange={set("preco")} />
            </label>
            <label className="grid gap-1 text-sm">Germinação (%)
              <input className={campo} type="number" min={0} max={100} value={f.germinacao} onChange={set("germinacao")} />
            </label>
            <label className="grid gap-1 text-sm">Fornecedor
              <input className={campo} value={f.fornecedor} onChange={set("fornecedor")} maxLength={120} />
            </label>
            <label className="grid gap-1 text-sm">Local
              <input className={campo} value={f.local} onChange={set("local")} maxLength={60} />
            </label>
            <label className="grid gap-1 text-sm">Safra
              <input className={campo} value={f.safra} onChange={set("safra")} maxLength={20} />
            </label>
            <div className="sm:col-span-2">
              {erro && <p className="mb-3 text-sm text-destructive">{erro}</p>}
              {ok && <p className="mb-3 text-sm text-success">{ok}</p>}
              <button type="submit" disabled={salvando}
                className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                {salvando ? "Salvando…" : "Cadastrar lote"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
