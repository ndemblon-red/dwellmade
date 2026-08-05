# Day 2 — Payments and usage enforcement

## Context

- Stripe is enabled on the project; test webhook is registered at `https://project--b9f0be19-caae-4d23-8bf5-c0b64fdfb863-dev.lovable.app/api/public/payments/webhook?env=sandbox`.
- Auto-subscribed webhook events: `subscription.created`, `subscription.updated`, `subscription.canceled`, `transaction.completed`, `transaction.payment_failed`.
- Current pricing: £15/month for 50 generations. 3 free generations before signup.
- The user wants the first plan to be named "Basic Monthly" so future tiers (Pro, Premium, etc.) can be added without confusion.

## Plan

1. Create the Stripe product
   - Product name: **dwellmade Basic Monthly**
   - Product ID: `dwellmade_basic_subscription`
   - Price ID: `dwellmade_basic_monthly`
   - Price: £15.00 GBP, recurring monthly, quantity 1 only
   - Tax code: `txcd_10103001` (SaaS / electronic services)

2. Add Stripe SDK + shared utility
   - Install `stripe@22.0.2`, `@stripe/stripe-js@9.2.0`, `@stripe/react-stripe-js@6.2.0`.
   - Create `src/lib/stripe.server.ts` with the gateway-aware `createStripeClient` and `getStripeErrorMessage`.
   - Create `src/lib/stripe.ts` for the client-side `loadStripe` helper and environment derivation from `VITE_PAYMENTS_CLIENT_TOKEN`.

3. Extend the database schema
   - Add columns to `public.user_profiles`: `stripe_customer_id`, `stripe_subscription_id`, `current_period_end`, `cancel_at_period_end`, `comp boolean default false`.
   - Create a `public.subscriptions` table to mirror webhook events (if not already present).
   - Ensure `GRANT`s and RLS policies are in place.

4. Build checkout
   - Create `src/utils/payments.functions.ts` with `createCheckoutSession` (protected by `requireSupabaseAuth`, resolves Customer by `metadata.userId`, returns `clientSecret`).
   - Use `managed_payments: { enabled: true }` for full tax compliance (UK seller, digital product, eligible).
   - Create `src/components/StripeEmbeddedCheckout.tsx` and `src/hooks/useStripeCheckout.tsx`.
   - Wire `UpgradeModal.tsx` to open the embedded checkout when the user hits the generation limit.

5. Build webhook handler
   - Create `src/routes/api/public/payments/webhook.ts`.
   - Verify signature using `verifyWebhook` from `src/lib/stripe.server.ts`.
   - Handle `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` to update `user_profiles` and `subscriptions`.
   - Handle `checkout.session.completed` to fulfill immediately for non-unpaid payment methods.

6. Update usage enforcement
   - Modify `src/lib/generation-gate.server.ts` to treat users as paid when `plan_active = true` OR `comp = true`.
   - Remove the hardcoded test-account override; rely on the `comp` flag.

7. Post-checkout UX
   - Add a `?checkout=success` handler on the projects page to refresh the subscription/usage state.
   - Add a test-mode banner on payment surfaces.

8. Verify end-to-end
   - Test with Stripe test card `4242 4242 4242 4242`.
   - Confirm webhook updates `user_profiles.plan_active` and unlocks generations.

## Technical details

- All server-side Stripe calls go through `createStripeClient(env)`; never instantiate `new Stripe(process.env.STRIPE_SECRET_KEY)`.
- The webhook route must be exactly `/api/public/payments/webhook` so the Lovable proxy bypasses auth for Stripe callbacks.
- The `price_id` used in checkout is the human-readable lookup key (`dwellmade_basic_monthly`), which is stable across test and live environments.
