# dwellmade Decisions Log

Recorded product, pricing, and architecture decisions so we don't re-litigate them later.

## 2026-08-06 — Pricing and margin rationale

- **Pricing set at £15/month VAT inclusive, 50 generations.**
- **Estimated real margin: ~£6.50–7.00 per subscriber** after UK VAT, AI inference costs (~£5 for 50 generations), and Stripe fees.
- **Generation limit exists to prevent abuse, not to create tier distinction.** The single plan is intentionally simple; the 50-generation cap is a guardrail, not a feature differentiator.
- **Trigger to revisit:** significant increase in AI model costs.
