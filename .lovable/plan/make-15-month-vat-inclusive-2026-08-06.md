# Make £15/month VAT-inclusive

## What's happening

Your advertised price is £15/month, but checkout and the billing portal show £18 — £15 plus £3 (20% UK VAT) added on top. That's because the Stripe price is treated as tax-exclusive, so tax is calculated and added at checkout rather than being carved out of the £15.

UK consumer pricing convention (and your pricing page copy) is VAT-inclusive: the customer should pay £15 total, of which £2.50 is VAT and £12.50 is your net revenue.

## The fix

Switch the price to VAT-inclusive so the customer is charged exactly £15:

1. Create a replacement price for `dwellmade Basic Monthly` at £15/month with tax behaviour set to **inclusive**, reusing the same lookup key `dwellmade_basic_monthly`. Stripe prices are immutable, so tax behaviour can only change by creating a new price; the lookup key transfers automatically, so no code changes are needed — checkout keeps resolving the same ID.
2. Verify in checkout that the total reads £15.00 with VAT shown as included (roughly £2.50 of the £15), not £18.
3. Confirm the billing portal shows £15/month.

## Existing subscribers

Anyone already subscribed stays on the old £18-total price until moved. Given this is pre-launch, I'd expect that to be just your own test accounts — I'll check for live subscribers before switching, and if any exist we can either leave them or migrate them onto the new price.

## Trade-off to be aware of

VAT-inclusive means your net revenue per subscriber drops from £15 to £12.50 in the UK/EU, and varies by country (Stripe carves out whatever the local rate is from the same £15). The alternative is to keep tax exclusive and change the pricing page to say "£15/month + VAT" — less clean for consumers, but protects the £15 net.

I'll go with VAT-inclusive at £15 unless you'd rather raise the headline price (e.g. £18/month inclusive) to keep the same net.

## Technical notes

- New price created via the payments tooling with `tax_behavior: 'inclusive'` under the existing price ID.
- No change to `src/lib/payments.server.ts` — it resolves the price by lookup key at checkout time.
- `managed_payments` stays enabled; Stripe continues handling tax calculation, filing and remittance.
