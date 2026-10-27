-- Painel de validade com IA: propostas da IA, prazos de corte e execuções.
-- Rode no SQL Editor do Supabase depois da migração de lotes. Pode rodar de novo.

create table if not exists public.regras_corte (
  cultura           text primary key,
  prazo_corte_dias  integer not null check (prazo_corte_dias between 0 and 365),
  atualizado_em     timestamptz not null default now()
);

create table if not exists public.execucoes_ia (
  id              bigint generated always as identity primary key,
  iniciado_em     timestamptz not null default now(),
  concluido_em    timestamptz,
  gatilho         text not null default 'cron',
  status          text not null default 'rodando' check (status in ('rodando','concluida','erro')),
  lotes_em_risco  integer not null default 0,
  valor_em_risco  numeric(14,2) not null default 0
);

create table if not exists public.propostas_ia (
  id               bigint generated always as identity primary key,
  criado_em        timestamptz not null default now(),
  lote             text not null,
  cultura          text not null,
  cultivar         text not null,
  acao             text not null check (acao in ('PROMOCAO','OFERTA_CLIENTES','REANALISE','MONITORAR')),
  quantidade       integer,
  desconto_pct     numeric(5,2),
  justificativa    text not null,
  origem           text not null default 'ia' check (origem in ('ia','regra')),
  status           text not null default 'pendente' check (status in ('pendente','aprovada','rejeitada')),
  motivo_rejeicao  text,
  decidido_em      timestamptz,
  numeros          jsonb not null default '{}'::jsonb
);
create unique index if not exists propostas_ia_pendente_por_lote on public.propostas_ia (lote) where status = 'pendente';

-- Só o servidor do site (service_role) lê e grava. O navegador nunca acessa direto.
alter table public.regras_corte  enable row level security;
alter table public.execucoes_ia  enable row level security;
alter table public.propostas_ia  enable row level security;
