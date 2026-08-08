# Fix paid subscription entitlement race

## Confirmed cause

- `bordain+3@gmail.com` has an active sandbox subscription for `dwellmade_basic_monthly`, valid through 5 September 2026.
- The subscription webhook ran at 15:45 and successfully created the subscription record.
- This account’s profile row was only created at 15:48, when generation access was first checked.
- The webhook currently updates an existing profile but does not create one. Because no profile existed at webhook time, the update matched zero rows and the account remained `free` with `plan_active = false`.
- Webhook database errors and zero-row updates are not checked, so this partial failure still returns success and is not retried.

## Implementation

1. Repair the affected account by synchronizing its profile from its existing active subscription so generation access works immediately.
2. Change subscription webhook processing to create-or-update the profile atomically by account ID, covering checkout that finishes before any profile row exists.
3. Preserve unrelated profile fields such as complimentary access and generation usage while updating only payment entitlement fields.
4. Check every subscription/profile database write and fail the webhook when a write does not succeed, allowing the payment provider to retry instead of silently accepting a partial update.
5. Keep canceled and unpaid subscription handling intact, but add the same explicit write-error handling.

## Verification

- Confirm the affected account reports `plan = paid`, `plan_active = true`, and retains the correct customer, subscription, and billing-period values.
- Confirm its usage endpoint reports the paid 50-generation allowance and generation no longer opens the upgrade modal.
- Exercise the webhook path for an account with no pre-existing profile and verify both the subscription and paid profile are created.
- Verify duplicate webhook delivery remains idempotent and does not reset generation usage or complimentary status.

## Technical details

- The generation gate remains server-enforced and continues to require either complimentary access or an active paid plan.
- No schema change is required; this is a webhook write-path fix plus reconciliation of one affected account.
- The account currently holds a sandbox/test subscription, matching the payment environment used during published-flow testing.
