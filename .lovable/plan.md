# Account page

Today the avatar menu only offers "Sign out". This adds a real account area.

## New page: `/account` (signed-in only)

Editorial-archive styling, same dark card language as `/checkout`. Sections:

1. **Your details**
   - Email address (read-only), sign-in method (password or Google), member since date.

2. **Password**
   - "Send password reset link" button → emails a reset link.
   - Google-only accounts see "You sign in with Google" instead.

3. **Subscription**
   - Plan status: Subscribed (£15/month · 50 generations), or free/no subscription.
   - Usage this month: "12 of 50 generations used · resets 4 September".
   - "Manage subscription" → opens the Stripe billing portal in a new tab (cancel, change card, invoices).
   - If no subscription: "Subscribe" → `/checkout`.
   - If cancelling at period end: "Your access ends on <date>".

4. **Danger zone**
   - "Delete my account" with the same inline confirm pattern already used on `/checkout`.

## Also included

- Avatar menu becomes: **Account** · **Sign out**.
- New `/reset-password` page so the emailed link lands somewhere that actually sets a new password (this route does not exist yet, so reset links would otherwise silently sign people in).
- Footer link to Account when signed in.

## What else is worth adding (my recommendation)

- **Billing history** — skip it; the Stripe portal already lists invoices.
- **Change email** — skip for now; it needs double confirmation emails and is rarely used at this stage.
- **Marketing/product email preference** — skip until there is actually a mailing list.
- **Export my data / GDPR** — your privacy policy promises deletion, which delete-account covers. A data export can wait.

## Technical notes

- `/account` lives under the existing `_authenticated` layout so it redirects to `/auth` when signed out.
- Subscription state read client-side from `user_profiles` (`plan_active`, `comp`, `current_period_end`, `cancel_at_period_end`) plus the existing `/api/usage` endpoint for the counter.
- Portal uses the existing `createPortalSession` server function in `src/utils/payments.functions.ts`; it must open via `window.open(url, "_blank")`. If no subscription row exists it returns an error, which the UI renders as "No subscription found".
- Password reset: `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + "/reset-password" })`; the new public `/reset-password` route detects the recovery session and calls `supabase.auth.updateUser({ password })`.
- Account deletion reuses `deleteMyAccount` from `src/utils/account.functions.ts` unchanged.
- No schema or webhook changes.
