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

## Project rules
- The animated marketing landing and authenticated Studio remain separate routes; public legal pages use a shared legal layout and footer so policy navigation stays consistent.
- Recording rules (pause range, scroll speeds, output sizes, homepage-only URL reduction, length estimate) live as pure functions in `src/lib/recording.ts` with tests beside them; the UI and the future render backend must both use them so behavior stays in one place.
- Render jobs are database-backed in `src/hooks/use-render-jobs.ts`; the worker consumes shared recording rules so new and retried jobs use consistent capture behavior.
- The recorder worker (`worker/`) captures via CDP screencast with per-frame timestamps and encodes with an ffconcat timeline; it authenticates only with `WORKER_TOKEN` against `/api/public/worker/*` and never holds database keys — keeps credentials out of the self-hosted box.
