# dwellmade — Prioritised Bug Tracker

Last updated: 2026-08-13, after the paid limit reached modal fix.

Severity key:

- **P0** — blocks launch, breaks a core path or exposes wrong billing/data.
- **P1** — must fix before public launch; visible quality or trust issue.
- **P2** — post-launch polish.

## Re-verification status (2026-08-08)

| Check                                    | Result                                                                                                                                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production build (`bun run build`)       | Pass                                                                                                                                                                                              |
| Typecheck (`tsgo --noEmit`)              | Pass, 0 errors                                                                                                                                                                                    |
| Lint (`eslint .`)                        | Pass, 0 errors, 10 `react-refresh` warnings (shadcn/ui + email brand + LegalPage)                                                                                                                 |
| Formatting (`prettier --check .`)        | Pass (fixed 18 Prettier errors before this run)                                                                                                                                                   |
| Dependency/security scan                 | Pass — no high/critical vulnerabilities                                                                                                                                                           |
| Supabase security scan                   | Pass — no issues found                                                                                                                                                                            |
| Database/RLS linter                      | 2 INFO-level flags — `anonymous_generations` and `webhook_log` have RLS enabled but no policies. Both are intentional; they are only written/read via service role or SECURITY DEFINER functions. |
| Signed-out browser audit (public routes) | Pass — all public routes (`/`, `/auth`, `/auth/confirm`, `/studio`, `/pricing`, `/terms`, `/privacy`) load cleanly with no console or network errors                                              |
| Protected-route redirects (signed out)   | Pass — `/projects`, `/projects/:id`, `/account`, `/checkout` all redirect to `/auth` correctly                                                                                                    |
| API endpoint contracts (signed out)      | Pass — `GET /api/usage` returns anonymous allowance; `POST /api/generate` with invalid body returns 400; `GET /api/public/payments/webhook` now returns 405                                       |
| Responsive layout audit (public routes)  | Pass — no horizontal overflow from 320px through 1280px on `/`, `/auth`, `/auth/confirm`, `/studio`, `/pricing`, `/terms`, `/privacy`                                                             |
| `/debug` non-admin redirect              | Pass — redirects to `/` when not signed in as the admin email                                                                                                                                     |

---

## Audit notes

- The managed browser session is currently **signed out**. Authenticated-route testing (signed-in `/projects`, `/account`, `/checkout`, and the full Stripe sandbox payment flow) requires a signed-in session. Sign in via the Lovable preview; the session will inject on the next turn.
- Paid subscribers who exhaust their 50 monthly generations now see a dedicated "limit reached" modal with the next billing reset date, instead of being re-offered the £15/month subscription.
- The only code change made during this audit was adding a `GET` handler to `src/routes/api/public/payments/webhook.ts` that returns HTTP 405, so unsupported webhook methods are rejected cleanly.

---

## P0 — launch blockers

### BUG-001 · Test account is comped — RESOLVED (decision: keep)

- **Area:** backend / billing
- **Detail:** `public.user_profiles` row `c3aeefe0-ead9-494e-9165-92c11a86d474` (ndemblon@gmail.com) has `comp = true`.
- **Decision (2026-08-13):** keep it. This is the permanent internal/team test account and should always retain paid access without a Stripe subscription.
- **Status:** closed — no action needed at launch.


### BUG-002 · Stripe checkout needs end-to-end validation

- **Area:** backend / billing
- **Detail:** the Upgrade modal now opens an embedded Stripe checkout for `dwellmade_basic_monthly` (£15/month). The webhook at `/api/public/payments/webhook` updates `user_profiles` and `subscriptions` on `customer.subscription.*` and `checkout.session.completed` events. Checkout is configured for full tax compliance handling (`managed_payments`) in supported countries.
- **Status:** implemented. Needs end-to-end validation with a real test card in the preview before launch.
- **Validation:** sign in as a free/non-comped account, exhaust the 3 anonymous generations, click "Subscribe now" in the Upgrade modal, complete checkout with test card `4242 4242 4242 4242`, and confirm `/projects?checkout=success` shows the success banner and the profile becomes `plan_active = true`.

### BUG-012 · Webhook GET handler returned 200

- **Area:** backend / security
- **Detail:** `GET /api/public/payments/webhook` was returning HTTP 200 instead of rejecting the unsupported method. This was flagged during the endpoint contract audit.
- **Status:** fixed — now returns HTTP 405 with "Method not allowed".
- **Validation:** `GET /api/public/payments/webhook` returns 405 in the signed-out audit.


### BUG-013 · Paid users at 50 generations saw the subscribe modal again

- **Area:** workspace / billing UX
- **Detail:** when a paid subscriber exhausted their 50 monthly generations, the Upgrade modal still presented the "Subscribe for £15/month" offer. This was confusing because they were already subscribed.
- **Status:** fixed — the workspace now distinguishes `paid_limit_reached` and the modal shows a non-commercial "You've used all 50 generations" state with the next billing reset date and a "Manage subscription" link.
- **Validation:** sign in as a paid subscriber, exhaust 50 generations, and confirm the modal displays the correct renewal date and no payment offer.

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
- **Detail:** auto-confirm was enabled to unblock testing.
- **Status (2026-08-13):** auto-confirm is now **off** — signups must confirm by email. Recent test accounts were already receiving confirmation emails, so the branded template + sender domain path is live.
- **Fix:** remaining check — sign up with a real inbox, click the link, confirm the session lands on `/projects`, and test the Resend button.

### BUG-006 · Right-click is the only way to delete a design

- **Area:** workspace / Designs
- **Detail:** removing a generation requires a right-click on its thumbnail, which is undiscoverable and impossible on touch devices.
- **Status:** fixed — each design card now shows a visible delete button in the top-right corner; the right-click shortcut is still present as a convenience. A `confirm()` dialog prevents accidental deletion.
- **Validation:** open the Designs tab with at least one generated image; confirm the delete button is visible and clickable on desktop and touch devices; confirm deleting requires confirmation and removes the card.


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
