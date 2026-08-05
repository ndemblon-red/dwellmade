# Fix: upgrade checkout fails with "Something went wrong"

## What I checked

- Stripe (test) has **zero checkout sessions, ever** — so the failure happens on our side, before Stripe accepts the session. The dark "Something went wrong" screen is Stripe's generic fallback when our app fails to hand it a session.
- The product and price are correct: `dwellmade Basic Monthly`, £15/month, lookup key `dwellmade_basic_monthly`, tax code set.
- One thing stands out: the price has **`tax_behavior: unspecified`**, while our checkout code turns on Stripe's full tax/compliance handling. Stripe rejects session creation for a price with unspecified tax behaviour in that mode. The Stripe account also hasn't completed go-live, which can independently block that mode.

## Plan

1. **Surface the real error first.** Right now the Stripe iframe swallows it. Show the actual message in the upgrade modal (and log it server-side) so we stop guessing.
2. **Reproduce once** and capture the exact Stripe error text.
3. **Fix the price tax behaviour.** Recreate the price under the same ID `dwellmade_basic_monthly` with an explicit tax behaviour (inclusive — UK consumer pricing is normally VAT-inclusive at £15), so the displayed price stays £15.
4. **Fall back if compliance handling isn't available yet.** If the error turns out to be account eligibility rather than tax behaviour, switch the session to standard tax calculation until Stripe go-live is finished, and note it in the bug tracker.
5. **Re-test** the full flow: sign in, hit the limit, open Upgrade, complete with test card `4242 4242 4242 4242`, and confirm the subscription lands in the database and the account flips to paid.

## Notes

- Prices are immutable in Stripe; "changing" the amount or tax behaviour means creating a new price under the same ID, which takes over the lookup key automatically. No code change to the price ID.
- Keep the error visible in the modal permanently — a blank dark panel is the worst possible failure mode for a paying customer.
