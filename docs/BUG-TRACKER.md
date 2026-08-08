# dwellmade — Prioritised Bug Tracker

Last updated: 2026-08-05, after the payments integration.

Severity key:

- **P0** — blocks launch, breaks a core path or exposes wrong billing/data.
- **P1** — must fix before public launch; visible quality or trust issue.
- **P2** — post-launch polish.

## Re-verification status (2026-08-05)

| Check                                 | Result                                                                            |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| Production build (`bun run build`)    | Pass                                                                              |
| Typecheck (`tsgo --noEmit`)           | Pass, 0 errors                                                                    |
| Lint (`eslint .`)                     | Pass, 0 errors, 10 `react-refresh` warnings (shadcn/ui + email brand + LegalPage) |
| Formatting (`prettier --check .`)     | Pass                                                                              |
| Console/runtime on `/auth`            | Clean on fresh load — the reported hydration mismatch did not reproduce           |
| Workspace responsive 375 / 768 / 1280 | Pass, no horizontal overflow at any width                                         |
| Room flow smoke test                  | Pass — Collect → Curate → Generate → Designs, room switching, Designs re-entry    |
| Stripe checkout build                 | Pass — all payment modules and webhook compile and bundle                         |
| Anonymous generation gate             | Pass — returns 402 with `limit_reached` after 3 anonymous generations             |
| Webhook endpoint                      | Pass — `POST /api/public/payments/webhook` returns 200/400 as expected            |
| Dependency/security scan              | Not re-run (no package changes since last pass)                                   |
| Database/RLS linter                   | Not re-run (schema changes applied via migration)                                 |

---

## P0 — launch blockers

### BUG-001 · Test account is comped

- **Area:** backend / billing
- **Detail:** `public.user_profiles` row `c3aeefe0-ead9-494e-9165-92c11a86d474` now has `comp = true`. This keeps the test account on the paid code path without a real subscription. Before launch, decide whether to remove the comp flag (and require the test account to subscribe like everyone else) or keep it as a permanent internal/team account.
- **Repro:** query `user_profiles` for the row above; `comp` is `true`.
- **Fix:** remove `comp` flag and reset `plan = 'free'`, `plan_active = false` if the test account should not have free access.

### BUG-002 · Stripe checkout is wired

- **Area:** backend / billing
- **Detail:** the Upgrade modal now opens an embedded Stripe checkout for `dwellmade_basic_monthly` (£15/month). The webhook at `/api/public/payments/webhook` updates `user_profiles` and `subscriptions` on `customer.subscription.*` and `checkout.session.completed` events. Checkout is configured for full tax compliance handling (`managed_payments`) in supported countries.
- **Status:** implemented. Needs end-to-end validation with a real test card in the preview before launch.
- **Validation:** sign in as a free/non-comped account, exhaust the 3 anonymous generations, click "Subscribe now" in the Upgrade modal, complete checkout with test card `4242 4242 4242 4242`, and confirm `/projects?checkout=success` shows the success banner and the profile becomes `plan_active = true`.

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
- **Detail:** the limit gate distinguishes anonymous (3 lifetime) from free accounts, and the modal was updated for the `free_account` reason, but this path has not been exercised since the test profile is comped.
- **Fix:** verify after BUG-001 is resolved — sign in as a fresh free account, exhaust the allowance, confirm the modal copy and remaining-count indicator are correct.

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
- **Detail:** 10 lint warnings from shadcn/ui primitives, `src/lib/email-templates/_brand.tsx` and `src/components/LegalPage.tsx` exporting non-components alongside components. Dev-experience only; no runtime effect.
- **Fix:** split constants into sibling modules if the noise becomes annoying.

### BUG-010 · Examples section on the landing page is still "Coming soon"

- **Area:** landing
- **Fix:** publish two or three real before/after examples before or shortly after launch.
