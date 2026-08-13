# dwellmade — Test Plan

A complete inventory of the tests that *should* exist for dwellmade, whether or not they exist today. Use it to see coverage gaps at a glance.

Status is based on the current suite: `src/lib/upgrade-reason.test.ts`, `src/components/UpgradeModal.test.tsx`, `src/components/FaqSection.test.tsx`.

## Critical

| Test | Verifies | Priority | Status |
| --- | --- | --- | --- |
| Anonymous gate blocks at 3 generations | A visitor with 3 recorded generations is refused and the limit error surfaces the anonymous upgrade reason | Critical | Missing |
| Anonymous gate allows under 3 generations | A visitor with 0–2 generations is allowed and the counter increments by one | Critical | Missing |
| Anonymous fingerprint cookie set on first generation | First anonymous generation issues a stable fingerprint cookie and reuses it on later requests | Critical | Missing |
| Paid gate blocks at 50 generations | A subscriber at 50 generations in the current period is refused with the paid limit reason | Critical | Missing |
| Paid gate allows under 50 generations | A subscriber below the monthly cap is allowed and usage is reserved | Critical | Missing |
| Monthly count resets on billing period start | Crossing the Stripe billing anniversary resets the period counter to 0 and moves `resetsAt` forward | Critical | Missing |
| Unauthenticated redirect from protected routes | `/projects`, `/account`, `/studio` and `/checkout` redirect signed-out users away to the public entry point | Critical | Missing |
| Stripe webhook activates subscription | `checkout.session.completed` / `customer.subscription.created` flips `plan_active` to true | Critical | Missing |
| Stripe webhook stores subscription id | The webhook writes the correct `stripe_subscription_id` onto the user profile | Critical | Missing |
| Subscription cancellation deactivates plan | `customer.subscription.deleted` flips `plan_active` to false | Critical | Missing |
| Generation blocked when plan inactive | A user whose `plan_active` is false is gated back to the free/anonymous allowance | Critical | Missing |
| Email/password sign in | Valid credentials create a session and land the user on the intended route | Critical | Missing |
| Google OAuth sign in | The OAuth entry point is invoked with the correct provider and same-origin redirect URL | Critical | Missing |
| Sign out clears session | Signing out clears the Supabase session and returns the nav to its signed-out state | Critical | Missing |

## Important

| Test | Verifies | Priority | Status |
| --- | --- | --- | --- |
| `buildPrompt()` output for a known brief | A fully populated aesthetic brief produces the expected prompt string | Important | Missing |
| `buildPrompt()` omits empty fields | Empty palette/material/style/lighting fields are left out rather than rendered blank | Important | Missing |
| `buildPrompt()` omits empty notes section | The additional-notes block disappears entirely when notes are empty | Important | Missing |
| Prompt injection filter blocks bad patterns | Known override/jailbreak phrasings in user notes are rejected or stripped | Important | Missing |
| Prompt injection filter allows legitimate notes | Ordinary design notes pass through unchanged | Important | Missing |
| Brief aggregates palettes across images | Colours from multiple inspiration images merge with Delta-E dedupe and correct ×N multiplicity | Important | Missing |
| Brief detects furniture style conflicts | Contradictory style tags across images are flagged as a conflict | Important | Missing |
| Checkout-cancel deletes the auth user | "Cancel and delete my account" removes the Supabase auth user | Important | Missing |
| Account deletion cascades to profiles | Deleting the auth user removes the matching `user_profiles` row | Important | Missing |
| Welcome banner shows after subscribing | The post-payment banner renders once on first `/projects` visit after activation | Important | Missing |
| Welcome banner hidden on later visits | The banner does not re-render on subsequent visits | Important | Missing |

## Nice to have

| Test | Verifies | Priority | Status |
| --- | --- | --- | --- |
| Landing page renders | `/` renders hero, steps, FAQ and footer without errors | Nice to have | Missing |
| Before/after slider drags | Pointer drag moves the handle and clamps it inside the container | Nice to have | Missing |
| FAQ accordion opens and closes | Items toggle, only one stays open, keyboard access works | Nice to have | Exists |
| Auth tab respects `?next=checkout` | The signup tab is preselected and post-signup routing goes to `/checkout` | Nice to have | Missing |
| Projects dashboard project count | The dashboard lists exactly the projects returned for the signed-in user | Nice to have | Missing |
| Room sync hydrates the store | Zustand state is populated from persisted room data on load | Nice to have | Missing |
| Master palette pre-fills new room | A new room's brief starts from the saved master palette | Nice to have | Missing |

## Existing tests outside this plan

| Test file | Covers |
| --- | --- |
| `src/lib/upgrade-reason.test.ts` | Mapping of user state and thrown limit errors to the correct upgrade modal reason |
| `src/components/UpgradeModal.test.tsx` | Modal copy per variant, renewal date, Manage subscription link, checkout CTA, close behaviour |

## Summary

- Total tests documented: **32**
- Currently existing: **1**
- Missing: **31**
- Coverage: **3%** (1 / 32)

Counting only the plan above. Two further test files (12 additional cases) cover the upgrade-modal path and are listed separately.
