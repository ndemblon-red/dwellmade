# Temporary test access and accurate generation-limit messaging

## Confirmed behavior

- The signed-in account currently has no generation usage.
- The usage endpoint reports it as a free account, but the generation gate blocks every signed-in free account before its first generation.
- The client maps that free-account block to the anonymous “used 3 free generations” modal, which is why the message is incorrect.
- The intended launch rule remains: visitors receive 3 browser-level generations before signup; creating an account does not grant another free allowance.

## Implementation

1. Temporarily activate the paid entitlement on the current test account so it can create populated project, room, inspiration, and generation content without changing the product’s launch rules.
2. Correct the signed-in free-account UI: replace the false “used 3 free generations” wording with an accurate message that the visitor allowance has ended and a subscription is required to generate while signed in.
3. Keep anonymous visitors on the existing browser-level 3-generation allowance and paid accounts on the existing 50-per-month allowance.
4. Populate one representative project and room through the real app flow, then test the authenticated dashboard and workspace at mobile, tablet, and desktop widths across Collect → Curate → Generate.
5. Fix only responsive defects confirmed by that audit and re-run the affected checks for overflow, touch targets, console errors, and failed requests.
6. Revert the current test account to the free tier after testing and verify generation is blocked with the corrected upgrade message.

## Technical details

- Enforce limits exclusively on the server and avoid trusting client state.
- No schema change or permanent test bypass is needed; the temporary entitlement is a data-only change to the current account and must be removed in the same work item.
- Keep the current payment CTA and underlying allowance rules unchanged.
- Do not count temporary test-account generation activity as a new free-user entitlement.
