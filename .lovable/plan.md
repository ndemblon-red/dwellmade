# Fix: signup confirmation emails never arrive

## What I checked

- Sender domain `notify.dwellmade.co.uk` is **verified** and email sending is healthy.
- Auth logs show the signup did fire and the email hook "ran successfully".
- But the email log table is **completely empty** (zero rows, ever) and both the email queue and its archive are empty — so no email was ever rendered or queued.

## Diagnosis

The email hook Supabase calls hands off to your app's auth-email route, which lives in the app itself. This project has **never been published**, so there is no live deployment for that route to run on. The hook call succeeds at the relay, then dead-ends — which is exactly why nothing is logged, queued, or sent.

Auto-confirm is off (the login attempt failed with "Email not confirmed"), so accounts genuinely need the email.

## Plan

1. **Publish the app.** This deploys the auth-email route (and the queue processor route) so the hook has somewhere to land. It also provisions the production queue cron.
2. **Re-test a signup** with a fresh address and confirm:
   - a row appears in the email log with status `sent`
   - the email arrives and the confirmation link signs the account in
3. **If it still fails after publishing**, inspect the hook's server logs and the email log's error column to find the exact failure, and fix from there.

## Notes

- No code changes are expected for step 1 — the route and branded templates are already in place.
- Emails will send from `noreply@notify.dwellmade.co.uk` using your dwellmade-branded templates.
- Signup rate limiting: repeated resends within ~20s return a rate-limit error (seen in your logs); that's expected and not the cause.
