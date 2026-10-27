<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Use the shared Tabs and Chart components for inventory summary views, keeping all summaries derived from the same filtered seed lots so views stay consistent.
- IA fica só no n8n. O site calcula a previsão de sobra (`src/lib/analise/*`), entrega ao n8n em `GET /api/n8n/analise`, recebe as propostas em `POST /api/n8n/propostas` e mostra tudo no painel (`src/components/painel/PainelIA.tsx`).
- Dados: a página e o assistente leem os lotes por `src/lib/lots.functions.ts` → `lots.server.ts` (Supabase, tabela `lotes_sementes`), caindo para `inventory.ts` quando o Supabase não está configurado. Esquema em `supabase/migrations`.
- API do n8n: rotas em `src/routes/api/n8n/*`, autenticadas por `N8N_API_KEY` (ver README).
