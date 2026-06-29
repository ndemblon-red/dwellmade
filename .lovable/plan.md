# Why no row appeared in email_send_log

## What the data shows

- Your auth Redirect URLs (the screenshot) are fine. Those settings only control where the **confirm link** is allowed to redirect to after the user clicks it. They have nothing to do with whether the email gets sent.
- Cloud → Emails status: **"Setting up"** (it was "No auth emails yet" before the re-scaffold). The hook registration is in progress, not active yet.
- `auth.users` shows the signup did happen: `ndemblon@gmail.com` at 13:22:14, unconfirmed.
- `email_send_log` is empty because that signup hit Supabase Auth while the hook was still in "Setting up" state. During that window, Auth falls back to default behaviour and doesn't call your webhook, so nothing gets enqueued and nothing is logged.

The re-scaffold worked — it just hasn't finished registering on the Auth side. This usually completes within a minute or two.

## Plan

1. **Wait ~1–2 minutes**, then re-check Cloud → Emails. It should flip from "Setting up" to showing your 6 templates listed.
2. **Trigger a fresh signup** with a different email (existing ones won't re-send a confirmation). I'll watch `email_send_log` and `auth.users` for the new row.
3. **Confirm the flow end-to-end**:
   - new row in `email_send_log` with `template_name = 'signup'`, status `pending → sent`
   - email arrives from `noreply@notify.dwellmade.co.uk` with your branded template
4. **If status is still "Setting up" after a few minutes** or the new signup still doesn't enqueue, I'll inspect the Go API auth logs for the webhook call attempt and report what Supabase Auth is actually doing (network error, 4xx from the webhook, hook disabled, etc.) before changing anything.

## What I'm NOT touching

- Your Redirect URLs / Site URL — already correct.
- Branded templates, domain, queue, cron — all in place.
- Auto-confirm stays off.

## One small note about the Redirect URLs (optional, separate issue)

Your allowed list only has `https://dwellmade.lovable.app/**` (the published URL). The Site URL is set to your preview URL. If you want confirm links sent **from the preview** to work for testers before you publish, add `https://id-preview--b9f0be19-caae-4d23-8bf5-c0b64fdfb863.lovable.app/**` to the allowed Redirect URLs. Not required for the email to send — only for the link to be honoured when clicked.
