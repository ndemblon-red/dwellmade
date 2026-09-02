# dwellmade Decisions Log

Recorded product, pricing, and architecture decisions so we don't re-litigate them later.

---

## 2026-08 — Style blend weighting: dominant style always 80%
**Decision:** When a user blends multiple furniture styles, the dominant (top-ranked) style always receives 80% influence regardless of how many styles are in the blend. The remaining 20% is split equally among all other ranked styles.

**Why:** A lower dominant weight (e.g. 60/40) produced visually incoherent results — the styles competed rather than complemented. The accent style should feel like a deliberate moment, not a competing direction. 80% dominant reflects the design principle that one style should be clearly primary; everything else is seasoning.

**Considered:** Equal weighting, 70/30, 60/40. All rejected because the accent influence was either invisible or overwhelming. 80/20 produces a result that reads as one clear style with intentional accent moments.

**Reference:** Nick Lewis / Caroline Winkler principle — one dominant style, others as accents.

---

## 2026-08 — Pricing and margin rationale
**Decision:** Pricing set at £15/month VAT inclusive, 50 generations.

**Why:** Real margin is ~£6.50–7.00 per subscriber after UK VAT, AI inference costs (~£5 for 50 generations), and Stripe fees. Generation limit exists to prevent abuse, not to create tier distinction. The single plan is intentionally simple; the 50-generation cap is a guardrail, not a feature differentiator.

**Trigger to revisit:** significant increase in AI model costs.

---

## 2026-06 — Anonymous-first, auth layered on
**Decision:** The full app is usable without an account. Auth unlocks saving, projects, and history persistence. Accounts are only created via the subscription flow — there is no free signed-in tier.

**Why:** Reducing signup friction is the single biggest lever on conversion for a tool like this. Users should be able to experience the value before being asked for anything.

**Considered:** Auth-required from the start. Rejected — too much friction before the user understands what the tool does.

---

## 2026-06 — Palette selection is user-driven, not auto-derived
**Decision:** The Aesthetic Brief palette is built by the user clicking individual swatches from per-image palette rows, not auto-populated by an aggregation algorithm.

**Why:** Auto-aggregation produced averaged, muddy palettes that didn't match any of the inspiration images. Users know which colours they want — the tool should let them pick, not guess on their behalf.

**Considered:** Auto-derive with user override. Rejected because the default was consistently worse than user selection.

---

## 2026-06 — Collect → Curate → Generate flow
**Decision:** Replace per-image influence sliders and aspect toggles with a two-stage flow: first collect and tag inspiration images, then build a resolved Aesthetic Brief, then generate.

**Why:** Multiple inspiration images often have conflicting palettes and styles. Feeding them all directly to the generator produced incoherent results. The Brief stage gives the user explicit control to resolve conflicts before generation.

**Considered:** Keeping the slider approach with better conflict surfacing. Rejected because sliders still left resolution to the AI at generation time rather than giving the user real design agency.

---

## 2026-06 — Supabase auth with email confirmation enabled
**Decision:** Email confirmation is required for new accounts. Auto-confirm was briefly enabled during initial development but turned off as soon as the `/auth/confirm` route was built.

**Why:** Auto-confirm allows account creation with any email address without verifying ownership, making password recovery unreliable and opening the door to trivial abuse.

**Implementation:** A dedicated `/auth/confirm` route catches the Supabase token callback, exchanges it, and redirects to `/projects`.

---

## 2026-06 — RLS scoped to auth.uid() throughout
**Decision:** All Supabase tables use Row Level Security policies scoped to `auth.uid()`. No table is publicly readable or writable.

**Why:** User data isolation is non-negotiable. RLS at the database level means even a bug in application logic cannot expose one user's data to another.

---

## 2026-06 — Named the product dwellmade
**Decision:** Product name is dwellmade (one word, always lowercase). Domain is dwellmade.co.uk.

**Why:** "Dwell" captures the feeling of a well-designed home — settled, intentional. "Made" implies craft and ownership. The compound reads as "well made" without saying it. Fits the broader naming family (PhotoReminder, Unscreenshot).

**Considered:** Roomsynth, Distilhaus, Hued, Dwelldone, Stilled, Joyd. dwellmade.ai available but £49/yr vs £12/yr for .co.uk — deferred until there is clear commercial traction.

---

## 2026-06 — Anonymous generation limit + bot protection
**Decision:** Anonymous users are limited to 3 lifetime generations tracked by fingerprint cookie + IP. Paid users get 50/month. All limits enforced server-side in `generation-gate.server.ts`.

**Why:** Image generation has a non-trivial per-call cost. Without limits, a single bad actor could run up significant API costs. The 3-generation limit is also the primary conversion mechanic.

**Status:** Implemented. Stripe integration live.
