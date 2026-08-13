# Monthly limit reached: a dedicated modal

## Problem

When a paying subscriber uses all 50 generations in a month, they see the same "Ready to make it yours? £15/month — Subscribe now" upgrade modal shown to non-subscribers. They are already subscribed, so the offer is wrong and the "Subscribe now" button would start a second checkout.

## What to build

A separate limit-reached state for subscribers, with no purchase offer:

- Eyebrow: "YOU'VE REACHED YOUR MONTHLY LIMIT"
- Headline: "You've used all 50 generations"
- Body: allowance renews on the billing anniversary, shown as a real date (e.g. "Your next 50 generations unlock on 12 September").
- Usage line: "50 of 50 used this month"
- Primary action: "Got it" (closes the modal)
- Secondary link: "Manage subscription" → /account
- No price block, no Subscribe button, no "Already subscribed? Sign in" line.

Top-ups are explicitly out of scope for now.

## Reset date

The renewal date is not currently sent to the browser. Extend the usage endpoint so the paid response includes the reset timestamp, then show it in the modal. If the date is unavailable for any reason, fall back to "at the start of your next billing month" so the modal never shows a blank or wrong date.

## Unchanged

- Anonymous visitors: still the 3-free-generations upgrade modal with checkout.
- Signed-in free accounts: still the subscribe modal.
- Server-side limit enforcement, counting, and billing rollover logic stay exactly as they are.

## Technical details

- `src/lib/generation-gate.server.ts`: `readUsage` returns `resetsAt` for paid users, derived from the same `billing_period_start` + 1 month rollover already used there; `/api/usage` passes it through, and `Usage` in `src/hooks/use-generation-usage.ts` gains the optional field.
- `src/components/UpgradeModal.tsx`: branch on `reason === "paid_limit_reached"` to render the new content; accept an optional `resetsAt` prop. Keep the existing dark editorial styling (near-black surface, mustard eyebrow, Instrument Serif headline).
- `src/routes/index.tsx`: pass `usage.resetsAt` into `UpgradeModal`; the existing reason selection at lines ~1441 and ~1488 already resolves to `paid_limit_reached` for subscribers.
