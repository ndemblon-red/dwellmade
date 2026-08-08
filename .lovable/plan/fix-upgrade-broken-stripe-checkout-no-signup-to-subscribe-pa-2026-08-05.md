# Fix upgrade: broken Stripe checkout + no signup-to-subscribe path

Two separate problems, both on the paid path.

## Problem 1 — "Get started" on /pricing dead-ends at sign in

Confirmed by reading the page: the pricing CTA is a plain link to `/auth` with no memory of why you clicked it. After signing in you land on `/projects` and the subscribe intent is gone. There is no way to go from "I want to pay" to paying in one motion.

Stripe still needs an account to attach the subscription to, so the fix isn't to skip signup — it's to make signup a step _inside_ the upgrade, not a detour that loses your place.

Plan:

1. Pricing CTA carries the intent: link to `/auth?next=checkout` (and the same for the "Sign in" path from the upgrade modal).
2. `/auth` shows subscribe-flavoured copy when that intent is present ("Create your account, then complete payment") so it doesn't feel like a wrong turn.
3. After successful sign-in or sign-up, if the intent is `checkout`, go straight to a checkout screen with the Stripe payment form already open — no extra clicks, no hunting for the Upgrade button.
4. Carry the intent through email confirmation too, so someone who signs up, confirms via email, and comes back still lands on checkout rather than the dashboard.
5. Same treatment for Google sign-in, which round-trips through an external redirect.
6. If an already-subscribed user hits that path, send them to `/projects` with a short "you're already subscribed" note instead of a second checkout.

## Problem 2 — the checkout panel itself errors

When checkout does open, it shows Stripe's grey "Something went wrong" panel.

What I checked:

- Stripe (test mode) has **zero checkout sessions, ever** — so this fails on our side before Stripe accepts the session. That grey panel is Stripe's fallback when our app fails to hand it a session.
- Product and price are correct: `dwellmade Basic Monthly`, £15/month, lookup key `dwellmade_basic_monthly`, tax code set.
- One likely culprit: the price has **`tax_behavior: unspecified`** while our checkout turns on Stripe's full tax/compliance handling, which Stripe rejects. Unconfirmed until I see the real error, so step 1 is to expose it rather than guess.

Plan:

1. Surface the real error — show the actual message in the upgrade panel and log it server-side, instead of letting the Stripe iframe swallow it.
2. Reproduce once and read the exact Stripe error.
3. If it's the tax behaviour: recreate the price under the same ID `dwellmade_basic_monthly` with VAT-inclusive tax behaviour, so the displayed price stays £15.
4. If it's account eligibility instead (Stripe go-live isn't finished), fall back to standard tax calculation for now and note it in the bug tracker.
5. Re-test end to end: pricing → create account → checkout with test card `4242 4242 4242 4242` → subscription row written → account shows as paid.

## Notes

- Stripe prices are immutable; changing tax behaviour means creating a new price under the same ID, which takes over the lookup key automatically. No price ID change in code.
- The error message stays visible in the panel permanently — a blank grey box is the worst possible failure for someone trying to pay.
