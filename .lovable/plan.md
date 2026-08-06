# Fix the free-generation counter drifting from what's shown

## What I checked

The anonymous usage row for your browser fingerprint currently reads **count = 3** (limit 3), last used today at 14:36. So the server did record three consumed generations even though the on-screen counter still read 2/3 when you were blocked.

Two things in the current code explain that gap:

1. **The credit is spent on attempt, not on result.** `/api/generate` increments the counter before calling the image model. If the model call fails, the stream drops, or you press Generate twice, the credit is gone even though you never got an image back.
2. **The on-screen counter only refreshes on success.** In the generate stage, usage is re-read after a completed stream or after a limit error — not after an ordinary failure. So a failed attempt silently burns a credit while the display stays behind, and the next click looks like an early block.

There's also a smaller point worth knowing: the anonymous count is lifetime per fingerprint, and your fingerprint row was first created on 5 Aug — so earlier testing on the same browser/IP already contributed to the 3.

## The fix

1. **Only charge for generations that actually produce an image.**
   Split the gate into a reserve step and a settle step: the request still reserves a slot up front (so simultaneous requests can't both slip through), but if the upstream call fails or the stream ends without a completed image, the reservation is released and the count goes back down. Successful generations stay counted exactly once.

2. **Keep the displayed counter honest.**
   Refresh usage after every generation attempt — success, limit block, or error — so the number on screen always matches the server.

3. **Make the block message match reality.**
   When the limit is hit, the modal and counter use the `used`/`limit` values returned by the server rather than the last cached ones.

4. **Reset your test fingerprint** so you can run a clean 3-generation pass afterwards.

## Technical details

- Add a `release_anonymous_generation(_fingerprint text)` and `release_generation(_user_id uuid)` database function that decrements the counter (never below zero); called from the API route when generation fails after the gate passed.
- In `src/routes/api/generate.ts`, wrap the upstream call and the streamed response so a non-OK upstream, or a stream that ends without `image_generation.completed`, triggers the release. Since the response body is piped through, wrap it in a `TransformStream` that tracks whether a completed event was seen and releases on flush if not.
- In `src/routes/index.tsx` `handleGenerate`, call `refreshUsage()` in the `finally` block instead of only on success and on limit errors.
- No change to the paid path's monthly reset or to the atomic locking already in `consume_generation`.
