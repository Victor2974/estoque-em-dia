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
- AI lot advisor: `src/lib/lot-advisor.functions.ts` (server fn) calls `lot-advisor.server.ts`, which streams Lovable AI Gateway server-side with lot data built from `inventory.ts` — keeps the key server-only and answers grounded in the same seed lots.
- Dados: a página e o assistente leem os lotes por `src/lib/lots.functions.ts` → `lots.server.ts` (Supabase, tabela `lotes_sementes`), caindo para `inventory.ts` quando o Supabase não está configurado. Esquema em `supabase/migrations`.
- API do n8n: rotas em `src/routes/api/n8n/*`, autenticadas por `N8N_API_KEY` (ver README).
