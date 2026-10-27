-- Estoque em Dia — esquema do Supabase
-- Rode este arquivo no SQL Editor do Supabase (ou `supabase db push`).
-- Depois rode supabase/seed.sql para carregar os lotes de exemplo.

-- ---------------------------------------------------------------------------
-- Lotes de semente
-- ---------------------------------------------------------------------------
create table if not exists public.lotes_sementes (
  id               uuid primary key default gen_random_uuid(),
  lote             text not null unique,            -- código do lote (chave usada pelo n8n)
  cultura          text not null check (cultura in (
                     'Soja','Milho','Sorgo','Trigo','Feijão','Algodão','Aveia','Forrageiras','Hortaliças')),
  cultivar         text not null,
  classe           text not null check (classe in ('Certificada','Fiscalizada','Grão para plantio')),
  tratada          boolean not null default false,
  germinacao       numeric(5,2) not null check (germinacao between 0 and 100),
  pureza           numeric(5,2) not null check (pureza between 0 and 100),
  quantidade       integer not null default 0 check (quantidade >= 0),
  unidade          text not null,                   -- ex.: "sacos 40 kg"
  reservado        integer not null default 0 check (reservado >= 0),
  safra            text not null,
  fornecedor       text not null,
  base_por_embalagem numeric not null check (base_por_embalagem > 0),
  unidade_base     text not null check (unidade_base in ('kg','mil sementes','g')),
  dose_por_ha      numeric not null check (dose_por_ha > 0),
  codigo_ras       text not null default '',
  armazenamento    text not null default 'Ambiente seco e ventilado',
  estado           text not null default 'no estoque' check (estado in (
                     'no estoque','aguardando reanálise','reanalisado','bloqueado','para descarte')),
  validade         date not null,                   -- validade da análise de germinação
  local            text not null,
  preco            numeric(12,2) not null default 0 check (preco >= 0),
  ordem            integer,                         -- ordem de exibição (opcional)
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  constraint reservado_nao_maior_que_quantidade check (reservado <= quantidade)
);

create index if not exists lotes_sementes_validade_idx on public.lotes_sementes (validade);
create index if not exists lotes_sementes_cultura_idx  on public.lotes_sementes (cultura);

-- mantém atualizado_em em dia
create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists lotes_sementes_atualizado_em on public.lotes_sementes;
create trigger lotes_sementes_atualizado_em
  before update on public.lotes_sementes
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------------
-- Movimentações (entrada, saída/venda, reserva, liberação, ajuste)
-- Histórico do que o n8n (ou alguém) fez no estoque.
-- ---------------------------------------------------------------------------
create table if not exists public.movimentacoes (
  id          bigint generated always as identity primary key,
  lote_id     uuid not null references public.lotes_sementes(id) on delete cascade,
  tipo        text not null check (tipo in ('entrada','saida','reserva','liberacao','ajuste')),
  quantidade  integer not null,
  observacao  text,
  origem      text not null default 'n8n',
  criado_em   timestamptz not null default now()
);

create index if not exists movimentacoes_lote_idx on public.movimentacoes (lote_id, criado_em desc);

-- Registra uma movimentação e ajusta o lote na mesma transação.
--  entrada   : quantidade += n
--  saida     : quantidade -= n (baixa também a reserva se ela ficar maior que o estoque)
--  reserva   : reservado  += n
--  liberacao : reservado  -= n
--  ajuste    : quantidade  = n (contagem física)
create or replace function public.registrar_movimentacao(
  p_lote text, p_tipo text, p_quantidade integer,
  p_observacao text default null, p_origem text default 'n8n'
) returns public.lotes_sementes
language plpgsql security definer set search_path = public as $$
declare
  l public.lotes_sementes;
begin
  if p_quantidade is null or p_quantidade < 0 then
    raise exception 'quantidade deve ser >= 0';
  end if;

  select * into l from public.lotes_sementes where lote = p_lote for update;
  if not found then
    raise exception 'lote % não encontrado', p_lote using errcode = 'P0002';
  end if;

  case p_tipo
    when 'entrada'   then l.quantidade := l.quantidade + p_quantidade;
    when 'saida'     then
      if p_quantidade > l.quantidade then
        raise exception 'saída (%) maior que o estoque (%)', p_quantidade, l.quantidade;
      end if;
      l.quantidade := l.quantidade - p_quantidade;
      l.reservado  := least(l.reservado, l.quantidade);
    when 'reserva'   then
      if l.reservado + p_quantidade > l.quantidade then
        raise exception 'reserva passa do disponível (%)', l.quantidade - l.reservado;
      end if;
      l.reservado := l.reservado + p_quantidade;
    when 'liberacao' then l.reservado := greatest(l.reservado - p_quantidade, 0);
    when 'ajuste'    then
      l.quantidade := p_quantidade;
      l.reservado  := least(l.reservado, l.quantidade);
    else
      raise exception 'tipo inválido: %', p_tipo;
  end case;

  update public.lotes_sementes
     set quantidade = l.quantidade, reservado = l.reservado
   where id = l.id
  returning * into l;

  insert into public.movimentacoes (lote_id, tipo, quantidade, observacao, origem)
  values (l.id, p_tipo, p_quantidade, p_observacao, coalesce(p_origem, 'n8n'));

  return l;
end $$;

-- Só o servidor (service_role) chama a função
revoke all on function public.registrar_movimentacao(text, text, integer, text, text) from public, anon, authenticated;
grant execute on function public.registrar_movimentacao(text, text, integer, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Visão de vencimentos (dias até vencer + situação), útil para o n8n
-- ---------------------------------------------------------------------------
create or replace view public.vencimentos with (security_invoker = true) as
select
  l.*,
  (l.validade - current_date)                       as dias_ate_vencer,
  case
    when l.validade < current_date           then 'vencido'
    when l.validade - current_date <= 30     then 'critico'
    when l.validade - current_date <= 90     then 'atencao'
    else 'ok'
  end                                               as situacao,
  (l.quantidade - l.reservado)                      as disponivel,
  (l.quantidade * l.preco)                          as valor_lote
from public.lotes_sementes l;

-- ---------------------------------------------------------------------------
-- Segurança (RLS)
--  * Catálogo é público: qualquer um pode LER os lotes (o site é uma vitrine).
--  * Escrita só pelo servidor do site com a service_role key (API do n8n).
--  * Movimentações não ficam públicas.
-- ---------------------------------------------------------------------------
alter table public.lotes_sementes enable row level security;
alter table public.movimentacoes  enable row level security;

drop policy if exists "leitura publica dos lotes" on public.lotes_sementes;
create policy "leitura publica dos lotes"
  on public.lotes_sementes for select
  to anon, authenticated
  using (true);

grant select on public.lotes_sementes to anon, authenticated;
grant select on public.vencimentos    to anon, authenticated;
