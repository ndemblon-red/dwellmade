# Fix: signup confirmation emails never trigger

## What's actually going on

I checked the email pipeline end-to-end:

- Domain `notify.dwellmade.co.uk` — verified, ready to send.
- Branded templates — in place at `src/lib/email-templates/`.
- Webhook route `/lovable/email/auth/webhook` — exists, enqueues into `auth_emails`.
- Queue + cron — `pgmq` and the `process-email-queue` cron job (every 5s) are live and pointed at the preview URL, so sending works (which is why your manual test from Cloud → Emails succeeds).
- `email_send_log` — **completely empty**. Zero rows.
- Cloud → Emails — still reports "No authentication emails yet".

An empty log plus that dashboard state means Supabase Auth is **not** calling your webhook on signup at all. Nothing is being enqueued, so nothing gets sent. The manual test bypasses Supabase Auth entirely and goes straight into the queue, which is why that path works.

The webhook file is correct, but the hook registration on the Auth side never got wired to it. That registration happens through the scaffold tool, not by writing files manually.

## Plan

1. Back up `src/lib/email-templates/_brand.tsx` and the 6 branded templates (`signup`, `magic-link`, `recovery`, `invite`, `email-change`, `reauthentication`) to `/tmp/email-backup/`.
2. Re-run the auth scaffold with `confirm_overwrite: true`. This is the step that registers the Supabase Auth "send email" hook against `/lovable/email/auth/webhook` and flips Cloud → Emails out of the "No auth emails yet" state.
3. Restore the branded templates from the backup so your dwellmade styling is preserved.
4. Verify the webhook route still uses `enqueue_email` into `auth_emails` (no changes expected).
5. Trigger a real signup against the preview URL and confirm:
   - a row appears in `email_send_log` with `template_name = 'signup'`,
   - status transitions `pending → sent`,
   - the email lands from `noreply@notify.dwellmade.co.uk`.

## On publishing

You don't need to publish to test. The cron is already pointed at your **preview** URL (`project--…-dev.lovable.app/lovable/email/queue/process`), and the Supabase Auth hook the scaffold registers also targets the preview deployment. Signup emails will flow on the preview URL once the hook is registered.

## What this does not touch

- The verified domain and NS delegation.
- The branded template styling (backed up and restored).
- Queue tables, cron schedule, or `email_send_state` config.
- Auto-confirm stays off, as you have it.
