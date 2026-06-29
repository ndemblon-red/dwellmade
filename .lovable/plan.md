# Fix "No authentication emails yet"

Your branded templates, webhook route, and verified domain (`notify.dwellmade.co.uk`) are all in place — but the Cloud → Emails panel still shows "No authentication emails yet". That means the backend hasn't registered your custom auth hook against the webhook route. This usually happens when the templates were created manually instead of through the official scaffolding tool, which is what wires the auth hook up.

## Steps

1. **Back up the branded styling.** Copy `src/lib/email-templates/_brand.tsx` and the 6 template files (`signup.tsx`, `magic-link.tsx`, `recovery.tsx`, `invite.tsx`, `email-change.tsx`, `reauthentication.tsx`) to a temp location so the brand work isn't lost if the scaffold overwrites them.

2. **Re-run the auth scaffold tool with `confirm_overwrite: true`.** This is what registers the Supabase auth hook to point at `/lovable/email/auth/webhook` and flips the Cloud dashboard out of the "No auth emails yet" state. It will also normalize the webhook route to the current canonical shape.

3. **Restore the branded templates.** After scaffolding completes, put the branded `_brand.tsx` and the 6 templates back in place so the visual styling (dwellmade wordmark, Instrument Serif headings, cream/mustard/pink palette, near-black CTA at 4px radius) is preserved.

4. **Verify the webhook route still uses `enqueue_email`** (it currently does) — no changes needed if the scaffold output matches.

5. **Publish the app.** Modern-stack server routes only go live on publish, and the auth hook registration targets the published URL. Without a publish, Supabase has nowhere to deliver events.

6. **Confirm in Cloud → Emails** that the "No auth emails yet" panel is gone and the 6 templates appear. Trigger a real signup/magic link to confirm delivery; check `email_send_log` if anything looks off.

## What this does not change

- Domain (`notify.dwellmade.co.uk`) — already verified, untouched.
- Branded styling — preserved via the backup/restore step.
- Email infrastructure tables and queue — already set up.

After the plan runs, you should see your branded confirm-signup, magic-link, recovery, invite, email-change, and reauthentication emails listed in Cloud → Emails, and they'll send from `noreply@notify.dwellmade.co.uk`.
