# Estoque em Dia

Faça um site com um forntend que mostre os produtos que teremos no estoque e a validade de cada

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9b51755a-de9f-4070-94da-aaba4765f331).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Supabase + n8n

O site lê os lotes da tabela `lotes_sementes` no Supabase. Sem as variáveis do Supabase ele mostra os lotes de exemplo de `src/lib/inventory.ts`, então nunca fica vazio.

### 1. Supabase

1. No SQL Editor do projeto, rode `supabase/migrations/20261027000000_estoque_sementes.sql` (tabelas, função de movimentação, view `vencimentos` e RLS).
2. Rode `supabase/seed.sql` para carregar os 17 lotes de exemplo (para gerar de novo: `bun scripts/gerar-seed-sql.ts`).
3. Copie de *Project Settings → API*: URL, chave `anon` e chave `service_role`.

Segurança: leitura pública dos lotes (é uma vitrine); escrita só pelo servidor do site com a `service_role`, que nunca vai para o navegador.

### 2. Variáveis de ambiente (Vercel → Settings → Environment Variables)

| Variável | Para quê |
| --- | --- |
| `SUPABASE_URL` | URL do projeto |
| `SUPABASE_ANON_KEY` | leitura do catálogo |
| `SUPABASE_SERVICE_ROLE_KEY` | escrita pela API do n8n |
| `N8N_API_KEY` | segredo que o n8n manda no header (gere com `openssl rand -hex 32`) |
| `N8N_WEBHOOK_URL` | opcional: webhook do n8n avisado a cada alteração |
| `LOVABLE_API_KEY` | opcional: assistente de IA |

Depois de salvar, faça um *Redeploy*.

### 3. API para o n8n

Todas as rotas pedem `Authorization: Bearer <N8N_API_KEY>` (ou `x-api-key`). No n8n, crie uma credencial **Header Auth** com nome `Authorization` e valor `Bearer <chave>`.

| Método | Rota | O que faz |
| --- | --- | --- |
| GET | `/api/n8n/status` | testa a conexão (chave + Supabase) |
| GET | `/api/n8n/vencimentos?dias=30` | vencidos + vencendo, totais e `mensagem` pronta para Telegram/WhatsApp |
| GET | `/api/n8n/lotes` | lista lotes; filtros `cultura`, `estado`, `situacao=vencido,critico`, `dias_max` |
| POST | `/api/n8n/lotes` | cria/atualiza um lote ou uma lista (chave: campo `lote`) |
| GET | `/api/n8n/lotes/:lote` | um lote (ex.: `SJ-2291`) |
| PATCH | `/api/n8n/lotes/:lote` | altera campos, ex. `{"estado":"bloqueado"}` |
| DELETE | `/api/n8n/lotes/:lote` | remove o lote |
| POST | `/api/n8n/lotes/:lote/movimentacoes` | `{"tipo":"saida","quantidade":10,"observacao":"Pedido 123"}` — tipos: `entrada`, `saida`, `reserva`, `liberacao`, `ajuste` |
| GET | `/api/n8n/lotes/:lote/movimentacoes` | histórico do lote |

Os lotes voltam com as colunas do banco mais `dias_ate_vencer`, `situacao`, `disponivel` e `valor_lote`. Erros vêm como `{"erro": "...", "detalhes": [...]}` com status 401/404/409/422.

Exemplo:

```sh
curl -H "Authorization: Bearer $N8N_API_KEY" https://SEU-SITE.vercel.app/api/n8n/vencimentos?dias=30
```

### 4. Workflow pronto

`n8n/alerta-vencimentos-telegram.json`: todo dia às 7h30 consulta os vencimentos e, se houver lote vencendo, manda a mensagem no Telegram. Importe no n8n, escolha a credencial Header Auth no nó HTTP, troque a URL do site e o `SEU_CHAT_ID`.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
