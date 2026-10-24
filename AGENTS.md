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
- The animated marketing landing lives at `src/routes/index.tsx` (scenes in `src/components/landing/`); the studio UI lives at `src/routes/studio.tsx` — keep them separate routes.
- Recording rules (pause range, scroll speeds, output sizes, homepage-only URL reduction, length estimate) live as pure functions in `src/lib/recording.ts` with tests beside them; the UI and the future render backend must both use them so behavior stays in one place.
- Render jobs are currently simulated client-side in `src/hooks/use-render-queue.ts` (prototype); the real cloud-browser recorder will replace that hook with server-created jobs and status polling, keeping the same Queued → Rendering → Completed/Failed states.
