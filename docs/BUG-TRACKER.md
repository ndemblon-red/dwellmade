# dwellmade — Prioritised Bug Tracker

Last updated: 2026-08-05, after the Designs-tab refactor.

Severity key:

- **P0** — blocks launch, breaks a core path or exposes wrong billing/data.
- **P1** — must fix before public launch; visible quality or trust issue.
- **P2** — post-launch polish.

## Re-verification status (2026-08-05)

| Check                                 | Result                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| Production build (`bun run build`)    | Pass                                                                           |
| Typecheck (`tsgo --noEmit`)           | Pass, 0 errors                                                                 |
| Lint (`eslint .`)                     | Pass, 0 errors, 8 `react-refresh` warnings (shadcn/ui + email brand)           |
| Formatting (`prettier --check .`)     | Pass                                                                           |
| Console/runtime on `/auth`            | Clean on fresh load — the reported hydration mismatch did not reproduce        |
| Workspace responsive 375 / 768 / 1280 | Pass, no horizontal overflow at any width                                      |
| Room flow smoke test                  | Pass — Collect → Curate → Generate → Designs, room switching, Designs re-entry |
| Dependency/security scan              | Not re-run (no package changes since last pass)                                |
| Database/RLS linter                   | Not re-run (no schema changes since last pass)                                 |

---

## P0 — launch blockers

### BUG-001 · Test account is force-flagged as paid

- **Area:** backend / billing
- **Detail:** `public.user_profiles` row `c3aeefe0-ead9-494e-9165-92c11a86d474` is `plan = 'paid'`, `plan_active = true`. This was a temporary override to unblock auditing and is currently the only profile row in the table.
- **Repro:** query `user_profiles`; the account bypasses the free generation limit.
- **Fix:** reset to `plan = 'free'`, `plan_active = false` before launch (or delete the row and let it recreate), then re-test the limit gate end to end.

### BUG-002 · Upgrade path dead-ends — payments not wired

- **Area:** backend / billing
- **Detail:** the Upgrade modal is reachable when a user hits the generation limit, but there is no Stripe checkout behind it, so a limited user cannot become a paying user.
- **Fix:** enable Stripe, add a checkout session server function, and set `plan`/`plan_active` from the webhook. Until then, either ship with a waitlist/contact CTA in the modal or delay launch of the paid tier.
- **Dependency:** commercial terms are now confirmed and published (£15/month, 50 generations, cancel anytime, no refunds — see `/pricing`, `/terms`, `/privacy`). Checkout must charge £15/month and link the terms and privacy pages.

---

## Commercial terms — confirmed 2026-08-05

- Seller: Dwellmade, United Kingdom, hello@dwellmade.co.uk
- Price: £15/month, 50 generations per month, monthly only
- Free allowance: 3 generations per browser before signup; accounts get no extra free allowance
- Cancellation: cancel anytime, access to end of paid period, no refunds for part-used months
- Published at `/pricing`, `/terms`, `/privacy`, linked from the landing footer, auth page and upgrade modal

---

## P1 — fix before public launch

### BUG-003 · Hydration mismatch reported on `/auth`

- **Area:** auth
- **Detail:** a React hydration mismatch was captured in the preview on `/auth` (server rendered a suspense boundary where the client rendered the page shell). A fresh headless load of `/auth` produced no console errors or page errors, so this is currently **unreproducible** and likely a stale dev-module artefact from a hot reload mid-session.
- **Fix:** keep watching. If it recurs, capture the route it navigated from — the reported match id (`/auth/auth`) suggests it appeared after a client-side navigation, not a cold load.

### BUG-004 · Free signed-in accounts see limit copy meant for anonymous users

- **Area:** workspace / billing UX
- **Detail:** the limit gate distinguishes anonymous (3 lifetime) from free accounts, and the modal was updated for the `free_account` reason, but this path has not been exercised since BUG-001 masks it on the only test profile.
- **Fix:** verify after BUG-001 is reverted — sign in as a fresh free account, exhaust the allowance, confirm the modal copy and remaining-count indicator are correct.

### BUG-005 · Email confirmation depends on auto-confirm still being on

- **Area:** auth
- **Detail:** auto-confirm was enabled to unblock testing. The `/auth/confirm` route and branded templates exist and the sender domain `notify.dwellmade.co.uk` is configured, but the real confirm-by-email path has not been validated with auto-confirm off.
- **Fix:** turn auto-confirm off, sign up with a real inbox, click the link, confirm the session lands on `/projects`, and test the Resend button.

### BUG-006 · Right-click is the only way to delete a design

- **Area:** workspace / Designs
- **Detail:** removing a generation requires a right-click on its thumbnail, which is undiscoverable and impossible on touch devices.
- **Fix:** add a visible delete affordance (hover/tap overlay button with a confirm) on each design card in the Designs tab.

### BUG-011 · Wire up email sending and post-auth redirects

- **Area:** auth / email
- **Detail:** the branded auth email templates and the `notify.dwellmade.co.uk` sender exist, but the end-to-end path is not confirmed live: emails need to actually send from the verified domain, and the links in them need to return the user to the right place (confirm → `/projects`, password reset → reset form, magic link → intended destination rather than the landing page).
- **Fix:** verify sending from the verified domain, then check every template's redirect target end to end, including the case where the user opens the link in a different browser or is already signed in.



---

## P2 — post-launch

### BUG-007 · No empty/limit state guidance on the Designs tab

- **Area:** workspace
- **Detail:** the Designs tab disappears entirely when the last design is deleted and silently drops the user back to Collect, with no explanation.
- **Fix:** brief toast or inline note on the fallback.

### BUG-008 · Generated design cards lack prompt context

- **Area:** workspace
- **Detail:** cards are labelled "Design 1/2/…" only; the brief summary and date that used to accompany the selected result are no longer shown.
- **Fix:** add date and a truncated prompt summary under each card.

### BUG-009 · `react-refresh/only-export-components` warnings

- **Area:** codebase hygiene
- **Detail:** 8 lint warnings from shadcn/ui primitives and `src/lib/email-templates/_brand.tsx` exporting non-components alongside components. Dev-experience only; no runtime effect.
- **Fix:** split constants into sibling modules if the noise becomes annoying.

### BUG-010 · Examples section on the landing page is still "Coming soon"

- **Area:** landing
- **Fix:** publish two or three real before/after examples before or shortly after launch.
