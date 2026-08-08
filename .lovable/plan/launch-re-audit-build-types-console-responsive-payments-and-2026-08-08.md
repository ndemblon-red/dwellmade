# Launch re-audit: build, types, console, responsive, payments, and database

## Context

Since the last audit (2026-08-05) we have landed: Stripe checkout + subscription lifecycle + billing portal + webhook, account page + password reset + account deletion, generation limit reserve/commit + billing-anniversary reset, the hidden `/debug` panel, VAT-inclusive pricing, and several rebrand/cleanup fixes (favicon, studio-syn removal, image download). The user wants a fresh audit of public-facing routes and the full payment test flow.

## Scope

- Public routes only: `/`, `/auth`, `/auth/confirm`, `/studio`, `/projects`, `/projects/$projectId`, `/checkout`, `/account`, `/reset-password`, `/pricing`, `/terms`, `/privacy`.
- The hidden `/debug` route is only checked for non-admin redirects; no responsive/layout audit of the internal tool.
- The full Stripe sandbox checkout → webhook → profile activation → cancellation flow is tested with a test card.

## 1. Build, types, and lint

- Run `bun run build` and capture all errors; treat any build/SSR/prerender error as a blocker.
- Run `tsgo --noEmit` and report every error by file and root cause.
- Run `bun run lint` and separate correctness errors from `react-refresh/only-export-components` warnings.
- Run `prettier --check .` and note formatting drift.
- Fix only confirmed build/type/lint blockers before moving to the next gate.

## 2. Dependency and security scan

- Run the security dependency scanner and review the report.
- Confirm no unresolved critical or high-severity dependency vulnerabilities.
- Upgrade affected packages only if new findings exist; regenerate the lockfile and re-scan.

## 3. Database lint and RLS review

- Run the managed database linter.
- Review warnings in the context of private user project data and subscription state.
- Prioritise exposed tables, missing RLS policies, unsafe functions, and sensitive-column exposure.
- Verify GRANTs exist for every public table and the `webhook_log` table is not readable by anon.
- Propose a focused migration only for confirmed issues.

## 4. Browser console and network audit (public routes)

Use Playwright against the local app at desktop width, with a fresh browser context per auth state.

### 4.1 Signed-out routes

- `/`: load, scroll, test navigation and the before/after slider; capture console and failed requests.
- `/auth`: switch sign-in/sign-up modes, trigger validation errors, confirm no uncaught errors.
- `/auth/confirm`: verify the intentional missing/expired-token state and its return-to-sign-in action.
- `/studio`: load the anonymous workspace, exercise Collect → Curate → Generate up to the gate, confirm the upgrade modal appears at the 3-generation wall without extra requests.
- `/pricing`, `/terms`, `/privacy`: load and verify links and copy.
- `/projects` and `/projects/$projectId`: confirm redirect to `/auth` with no console/request errors.

### 4.2 Signed-in routes

- Restore the managed signed-in session and verify `/` redirects to `/projects`.
- `/auth`: confirm redirect to `/projects`.
- `/projects`: load projects, open/close user menu, test project creation.
- `/projects/$projectId`: open a real project, switch rooms/stages, verify room, inspiration, brief, image, and usage requests.
- `/checkout`: confirm it loads the embedded checkout for a free user; confirm paid users are redirected to `/projects`.
- `/account`: load account details, subscription status, usage, and management buttons.
- `/reset-password`: request a reset link for the signed-in email and verify the UI state.
- `/studio`: confirm signed-in users are redirected to `/projects`.

### 4.3 Endpoint contract checks

- `GET /api/usage`: valid JSON and success status in both anonymous and signed-in contexts.
- `POST /api/generate`: safe error behavior with an invalid body; no generation consumed.
- `/api/public/payments/webhook`: verify only POST with a valid signature succeeds; other methods/auth fail as expected.
- `/lovable/email/*`: verify only supported methods and expected auth/validation responses.

### 4.4 Triage rules

- Ignore the known preview-shell warning `Unknown message type: RESET_BLANK_CHECK`.
- Treat expected redirects, deliberate invalid-form responses, and navigation-cancelled requests as passes.
- Record every real defect with route, action, console message, request URL/method/status, screenshot, and reproducible steps.
- Fix confirmed defects and rerun the affected route plus a short regression pass.

## 5. Responsive layout audit (public routes)

- Test matrix: 390×844 (phone), 320×568 (narrow edge case), 768×1024 (tablet portrait), 1024×768 (tablet landscape), 1280×1800 (desktop).
- Check every public route for unintended horizontal page overflow and clipped controls.
- Focus on the new / changed surfaces: `/checkout`, `/account`, `/reset-password`, `/auth/confirm`.
- Exercise real states: checkout form, account deletion confirmation, subscription section, upgrade modal, generated design grid, room menus, before/after slider.
- Confirm touch targets remain tappable and hover-only actions are reachable on touch devices.
- Capture before/after screenshots at each primary viewport.

## 6. Payments end-to-end test (sandbox)

Using a fresh free account:

1. Verify the user is `plan = 'free'` and `plan_active = false`.
2. Use the `/debug` panel to set `generations_used_this_month` to 50 (or exhaust 3 anonymous + signed-in free generations) to trigger the upgrade gate.
3. Click "Subscribe now" in the Upgrade modal and load `/checkout`.
4. Complete checkout with Stripe test card `4242 4242 4242 4242`.
5. Confirm redirect to `/projects?checkout=success` and the success banner renders.
6. Verify `/account` shows `plan_active = true` and usage counter resets to 0/50.
7. Trigger a real generation and confirm the counter increments.
8. Open the Stripe billing portal from `/account` and cancel the subscription.
9. Confirm the webhook marks `plan_active = false` and `cancel_at_period_end = true` with access retained until `current_period_end`.
10. Verify no duplicate subscriptions were created and the subscription row in `subscriptions` matches the environment.

## 7. Update the bug tracker

- Update `docs/BUG-TRACKER.md` with every new finding from this audit.
- Severity: P0 (launch blocker), P1 (must fix before launch), P2 (post-launch).
- Carry forward unresolved items from the previous tracker if they are still relevant.
- Mark fixed items as resolved and reference the commit or change.

## 8. Remediation and sign-off

- Produce a single launch report table with pass/fail for each gate, launch impact, and follow-up.
- Fix all P0 issues in the same pass; log P1/P2 with proposed fixes.
- Re-run any failed gate after fixing it before declaring it passed.
- End with a short, ordered remediation list: must fix before launch, fix this week, monitor after launch.

## Completion criteria

- Production build passes, typecheck is clean, lint has no correctness errors.
- No unresolved critical/high dependency vulnerabilities.
- Every public route has a documented pass/fail result in signed-out and signed-in states as applicable.
- No unexplained console errors, failed first-party requests, or CORS failures.
- No unintended horizontal overflow from 320px through desktop on public routes.
- Stripe checkout → webhook → generation → cancellation path is verified in sandbox.
- `docs/BUG-TRACKER.md` is current and reflects the latest state of the app.
