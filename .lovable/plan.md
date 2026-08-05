# Re-verify after the Designs refactor, then build the bug tracker

The room workflow changed materially since yesterday's audits (new `designs` stage, room rename/delete, results-first hydration, signed-URL generation input). Some Day 1 checks are now stale; others are unaffected.

## What needs re-running

1. **Build + typecheck** — touched `store.ts`, `useRoomSync.ts`, `index.tsx`, `$projectId.tsx`. Run production build and type check.
2. **Lint/format** — new code added since the 871-error cleanup; run eslint and prettier check.
3. **Console/runtime errors** — there is an open hydration mismatch reported on `/auth` (server/client markup differs). Reproduce and fix.
4. **Responsive pass, workspace only** — the stage nav is now 4 tabs and the Designs grid is new. Re-check the workspace and Designs grid at 375 / 768 / 1280. Landing, /auth and /projects were not touched, so no re-check needed.
5. **End-to-end room flow smoke test** — Collect → Curate → Generate → Designs, plus room switching, rename, delete, and reopening a room with existing designs.

## What does not need re-running

- Dependency/security scan (no package changes since it last passed).
- Database/RLS linter (no schema changes since the last pass).
- Landing page and auth email template reviews.

## Then: the prioritised bug tracker

Produce `docs/BUG-TRACKER.md` containing every open issue found across the Day 1–2 audits plus anything the re-runs surface, each with: ID, title, area (workspace / auth / projects / backend / landing), severity (P0 blocker, P1 launch-blocking polish, P2 post-launch), repro, and proposed fix. Known items to carry in already:

- Hydration mismatch on `/auth`.
- Test account still force-flagged as paid in `user_profiles` — must be reverted before launch.
- Stripe/payments not yet wired, so the upgrade path dead-ends.
- Generation limit messaging for signed-in free accounts.

Anything found as P0 during the re-runs gets fixed in the same pass; P1/P2 are logged only.

## Technical notes

Checks run via `bun run build`, `tsgo --noEmit`, `bun run lint`, `prettier --check .`, and Playwright against `localhost:8080` with the injected preview session.
