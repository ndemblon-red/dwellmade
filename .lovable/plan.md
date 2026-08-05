# Day 2 — Stripe checkout for the dwellmade subscription

Note on price: the day-1 legal and pricing work locked the plan at **£15/month for 50 generations** (the tracker item still says £12). This plan uses £15/month to match `/pricing`, `/terms` and the upgrade modal.

## What we're building

A working subscription purchase: the "Subscribe now" button in the upgrade modal (currently a `console.log` placeholder) takes the user to a hosted Stripe checkout, and on successful payment their account flips to the paid plan so generations are unblocked.

## Provider

Stripe, using Lovable's built-in payments — no Stripe account or API keys needed to start, and a test environment is created immediately so we can buy the plan with a test card before touching real money. Going live later requires claiming the account.

Because dwellmade is a digital/SaaS product, this will be set up with Stripe's full compliance handling: Stripe handles tax compliance, fraud protection, disputes and buyer-side support in ~80 countries for +3.5% per transaction on top of base Stripe fees. It can be changed per transaction or turned off later.

## Steps

1. **Enable Stripe payments** on the project (creates the test environment).
2. **Create the product**: "dwellmade" — £15/month recurring, 50 generations, with the correct Stripe tax code for SaaS.
3. **Checkout server function** — authenticated only. Creates a checkout session for the signed-in user, stores their Stripe customer id on `user_profiles`, and returns the hosted checkout URL. Success returns to `/projects?checkout=success`, cancel returns to where they were.
4. **Wire the modal** — replace the placeholder click handler with a call to that function plus a loading state and error toast. Anonymous users hitting the 3-generation wall are sent to `/auth` first, since a subscription needs an account.
5. **Webhook** — a public endpoint that verifies the Stripe signature and updates `user_profiles`:
   - subscription created/active → `plan = 'paid'`, `plan_active = true`, reset `generations_used_this_month`, set `billing_period_start`
   - renewal → reset the monthly counter and roll `billing_period_start`
   - cancelled/unpaid → `plan_active = false` at period end (access to end of paid period, per the published terms)
6. **Schema additions** to `user_profiles`: `stripe_customer_id`, `stripe_subscription_id`, `current_period_end`, `cancel_at_period_end`.
7. **Post-checkout state** — on returning to `/projects?checkout=success`, refetch usage so the banner and gate reflect the new plan immediately rather than waiting on webhook timing.
8. **Remove the test override** that forces the audit account to paid (BUG-001), so the real paid path is what gets tested.
9. **Verify** in the test environment: subscribe with a Stripe test card, confirm the profile flips to paid, confirm generations run and the counter increments toward 50, confirm a cancelled subscription keeps access until period end.

## Not in this step

Billing portal / self-serve cancellation, monthly counter reset via scheduled job (the renewal webhook covers the normal case), and going live with a claimed Stripe account — those are the following items on the Day 2 list.

## Technical notes

- Checkout session creation is a `createServerFn` with `requireSupabaseAuth`; the webhook is a TanStack server route under `src/routes/api/public/` with signature verification before any write.
- Webhook writes use the service-role client, loaded inside the handler.
- `src/lib/generation-gate.server.ts` needs no logic change — it already gates on `plan`/`plan_active`; the webhook is what sets those.
- Idempotency: webhook handlers key off the Stripe event id so retries don't double-reset counters.
