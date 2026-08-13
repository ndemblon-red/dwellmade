# Pre-launch finish: blockers, P1 fixes, and go-live

## Context

The full launch re-audit passed on the signed-out side: build, types, lint, formatting, security, database RLS, public routes, and responsive layout are all clean. The signed-in audit for `/projects`, `/account`, and `/checkout` is also clean. What remains is the last mile of launch-critical fixes and verification.

## 1. Resolve the comped test account (BUG-001)

`public.user_profiles` row `c3aeefe0-ead9-494e-9165-92c11a86d474` has `comp = true`. This keeps the test account on the paid path without a real subscription.

- Decide whether this is a permanent internal/team account or should be removed before launch.
- If removing: set `comp = false`, `plan = 'free'`, `plan_active = false`, and clear the Stripe customer/subscription fields.
- Update the bug tracker once the decision is recorded.

## 2. End-to-end Stripe payment test (BUG-002)

Using a fresh, non-comped test account:

1. Confirm the profile starts as `plan = 'free'`, `plan_active = false`.
2. Use the `/debug` panel to set `generations_used_this_month` to 50 to trigger the upgrade gate.
3. Click "Subscribe now" in the Upgrade modal and load `/checkout`.
4. Complete checkout with Stripe test card `4242 4242 4242 4242`.
5. Confirm redirect to `/projects?checkout=success` and the success banner renders.
6. Verify `/account` shows the paid plan and usage resets to 0/50.
7. Trigger a real generation and confirm the counter increments.
8. Open the Stripe billing portal from `/account` and cancel the subscription.
9. Confirm the webhook marks `plan_active = false` and `cancel_at_period_end = true`, with access retained until `current_period_end`.
10. Verify no duplicate subscriptions were created.

## 3. Fix P1 issues before launch

### BUG-006 — Visible delete affordance on design cards

Right-click is the only way to delete a design, which is undiscoverable and impossible on touch devices.

- Add a hover/tap overlay with a delete icon and a one-step confirmation on each design card in the Designs tab.
- Ensure the overlay is reachable on touch devices without relying on hover.

### BUG-005 — Validate email confirmation with auto-confirm off

Auto-confirm is currently enabled for testing. The real confirm-by-email path needs validation before launch.

- Turn auto-confirm off in the backend.
- Sign up with a real inbox, click the confirmation link, and confirm the session lands on `/projects`.
- Test the Resend button and the error state for an expired/invalid link.
- Turn auto-confirm back on only if the launch strategy requires it.

### BUG-004 — Verify free signed-in limit copy

Free signed-in accounts see the upgrade modal after exhausting their allowance. The modal copy and remaining-count indicator for the `free_account` reason have not been exercised since the test profile is comped.

- After resolving BUG-001, sign in as a fresh free account, exhaust the allowance, and confirm the modal copy and remaining-count indicator are correct for a free account.

### BUG-011 — Verify email sending and post-auth redirects

Branded auth email templates exist and the sender domain `notify.dwellmade.co.uk` is configured, but the end-to-end path is not confirmed live.

- Verify emails actually send from the verified domain.
- Check every template's redirect target:
  - Confirm email → `/projects`
  - Password reset → `/reset-password` form
  - Magic link → intended destination, not the landing page
- Test the case where the user opens the link in a different browser or is already signed in.

## 4. Final polish and go-live

- Confirm the landing page examples section (BUG-010) is acceptable to launch as "Coming soon" or add two real before/after examples.
- Resolve or defer the remaining P2 items (empty/limit state guidance, design card context, react-refresh warnings).
- Run one final production build and typecheck after all fixes.
- Publish the site.
- Turn the comped test account decision into a recorded note in `docs/DECISIONS.md` if it stays comped.

## Technical notes

- No schema changes expected unless email testing reveals a missing redirect or template issue.
- The Stripe test uses the sandbox environment; the live environment is not exercised until the account is claimed and switched.
- The `/debug` panel is admin-gated; only the authorized admin email can set generation counts for testing.
