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

## Architecture rules
- Catalog data is fetched from TMDB via server functions in src/lib/tmdb.functions.ts; titles are cached into the `titles` table on page view so community rows can reference them. Why: keeps the API key server-side and lets feeds join title info.
- Title URLs are `/movie|series/<title>-<year>-<tmdbId>`; the trailing number is the source of truth. Why: readable yet unambiguous.
- Community writes go straight from the browser with RLS; counters, removal and status changes are guarded by DB triggers. Why: server-side authorization without extra endpoints.
- Collection additions use an idempotent item writer and serialize dialog mutations until refetch completes. Why: repeated clicks must not conflict or report unsaved additions as successful.
- The first account to sign up becomes admin (DB trigger). Why: bootstraps moderation.
