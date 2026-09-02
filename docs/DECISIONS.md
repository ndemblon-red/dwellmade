# dwellmade Decisions Log

Recorded product, pricing, and architecture decisions so we don't re-litigate them later.

## 2026-08-06 — Pricing and margin rationale

- **Pricing set at £15/month VAT inclusive, 50 generations.**
- **Estimated real margin: ~£6.50–7.00 per subscriber** after UK VAT, AI inference costs (~£5 for 50 generations), and Stripe fees.
- **Generation limit exists to prevent abuse, not to create tier distinction.** The single plan is intentionally simple; the 50-generation cap is a guardrail, not a feature differentiator.
- **Trigger to revisit:** significant increase in AI model costs.

---

### 2026-08 — Style blend weighting: dominant style always 80%
**Decision:** When a user blends multiple furniture styles, the dominant (top-ranked) style always receives 80% influence regardless of how many styles are in the blend. The remaining 20% is split equally among all other ranked styles.

**Why:** A lower dominant weight (e.g. 60/40) produced visually incoherent results — the styles competed rather than complemented. The accent style should feel like a deliberate moment, not a competing direction. 80% dominant reflects the design principle that one style should be clearly primary; everything else is seasoning.

**Considered:** Equal weighting, 70/30, 60/40. All rejected because the accent influence was either invisible or overwhelming. 80/20 produces a result that reads as one clear style with intentional accent moments.

**Reference:** Nick Lewis / Caroline Winkler principle — one dominant style, others as accents.
