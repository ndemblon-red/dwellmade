# Fix signed-in free generation allowance

## Confirmed cause

- The signed-in account currently has no generation usage.
- The usage endpoint reports it as a free account, but the generation gate blocks every signed-in free account before its first generation.
- The client maps that free-account block to the anonymous “used 3 free generations” modal, which is why the message is incorrect.

## Implementation

1. Add a dedicated lifetime free-generation counter to each user profile, keeping it separate from the paid monthly counter.
2. Update the server-side generation gate so signed-in free accounts can generate up to 3 times, with each successful allowance tracked against the account rather than the browser.
3. Keep anonymous visitors on their existing browser-level 3-generation allowance and paid accounts on the existing 50-per-month allowance.
4. Return accurate usage kinds and limits from the usage endpoint, then update the Generate-stage counter and upgrade modal so free-account, anonymous, and paid-limit messages cannot be confused.
5. Verify a new signed-in account starts at `0 of 3`, can pass the gate three times, and is blocked with the correct account-level upgrade message only on the fourth attempt.

## Technical details

- Apply the profile schema change through a database migration; preserve existing profile rows with a zero default.
- Enforce limits exclusively on the server and avoid trusting client state.
- Keep the current payment CTA unchanged; this fix only corrects allowance enforcement and messaging.
- After the limit fix, resume the authenticated responsiveness audit on the populated project workspace at mobile, tablet, and desktop widths.