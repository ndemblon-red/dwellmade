# Confirm commercial terms and publish pricing, privacy and terms

Final Day 1 item: lock the launch commercials and publish the customer-facing legal pages the payment provider will require at checkout.

## Confirmed facts

- Seller: Dwellmade, United Kingdom. Contact: hello@dwellmade.co.uk
- Price: £15/month for 50 generations. Monthly only, no annual plan.
- Free allowance: 3 generations per browser before signup. Creating an account does not grant more.
- Cancellation: cancel anytime, access continues to the end of the paid period, no refunds for partial periods.

## 1. Correct the price everywhere

The upgrade modal currently shows £12/month. Update it to £15/month and keep the "Cancel anytime" line. Search the landing page and any other copy for a stale price and align it.

## 2. New page: /pricing

Single plan card in the existing editorial-archive style: £15/month, 50 generations a month, what is included, the 3-free-before-signup allowance, cancel-anytime line, and a link to terms. CTA routes to signup (checkout wiring stays as tracked in BUG-002).

## 3. New page: /terms

Sections: who we are (Dwellmade, UK, hello@dwellmade.co.uk); the service description; account and eligibility; acceptable use for uploaded photos, including that the user must have the right to upload them; AI output — designs are visualisations, not architectural or structural advice, and results may vary; ownership — the user keeps their uploads and may use generated images, Dwellmade keeps the platform; subscription, billing and price changes; cancellation and no-refund terms as confirmed; UK statutory consumer rights, including that by starting generations immediately the customer agrees to service beginning during the 14-day cancellation period; suspension and termination; liability limits; governing law of England and Wales; how we notify changes.

## 4. New page: /privacy

Sections: who the controller is; what we collect (account email, room and inspiration photos, generated designs, usage counters, an anonymous fingerprint cookie for the free allowance); why and on what lawful basis; who processes it on our behalf — hosting/database/storage, the AI model provider used for tagging and generation, the transactional email sender on notify.dwellmade.co.uk, and later the payment provider; that uploads are sent to the AI provider to produce designs; retention and deletion, including how to delete a project, room or account; cookies actually used (auth session and the `dm_fp` allowance cookie — no third-party analytics claimed); UK GDPR rights and how to exercise them via hello@dwellmade.co.uk; international transfers; how to complain to the ICO; last-updated date.

Copy will state only what the app genuinely does. Anything not verifiable in the codebase (certifications, encryption guarantees, DPAs) will be left out rather than asserted.

## 5. Link them

Add a footer to the landing page with Pricing, Privacy, Terms and the contact email, matching the existing type and palette. Add compact Privacy and Terms links to the auth page and the upgrade modal.

## 6. Tracker update

Record in `docs/BUG-TRACKER.md` that pricing and terms are confirmed, and note the remaining dependency: the payment provider's checkout must surface these links and the £15 price when BUG-002 is done.

## Technical notes

New file routes `src/routes/pricing.tsx`, `src/routes/privacy.tsx`, `src/routes/terms.tsx`, each with its own `head()` title/description/OG tags. Content is static JSX using existing tokens and the landing page's typographic scale — no new dependencies, no schema change, no server functions. A shared `LegalPage` layout component keeps the three pages consistent. Build, typecheck, lint and Prettier run afterwards, plus a responsive check of the new pages at 375/768/1280.
