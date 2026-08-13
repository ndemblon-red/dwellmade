# Update bug tracker after paid limit modal fix

## Goal
Document the newly implemented "paid monthly limit reached" modal as a resolved bug in `docs/BUG-TRACKER.md` so the tracker stays accurate for launch.

## Changes
1. Add **BUG-013** under P0 — launch blockers (or P1 if you prefer), describing the issue: paid subscribers who exhausted their 50 monthly generations were still shown the "Subscribe for £15/month" upgrade modal instead of a clear "limit reached" state with the next reset date.
2. Mark the bug **resolved** with the fix summary: extend usage response to include `resetsAt`, update `UpgradeModal.tsx` to branch on `reason === "paid_limit_reached"`, and pass the reset date from the workspace.
3. Update the **Last updated** date at the top of `docs/BUG-TRACKER.md` to today (2026-08-13).
4. Add a one-line note to the re-verification/audit section confirming the modal was tested and now shows the correct renewal date instead of an upgrade offer.

No code changes are required; this is a documentation-only task.
