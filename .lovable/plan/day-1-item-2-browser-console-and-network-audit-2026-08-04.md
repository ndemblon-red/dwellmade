# Day 1, Item 2: Browser console and network audit

## Goal

Exercise every user-facing route and its important interactions in a real browser, recording JavaScript errors, failed requests, broken redirects, and unexpected response codes. Test service endpoints separately so expected method/auth failures are not mistaken for page defects.

## Automated smoke pass

Use Playwright against the local app at desktop size, with a fresh browser context for each auth state.

1. **Public routes**
   - `/`: load the landing page, use its navigation, test the before/after control, and verify local assets/fonts.
   - `/auth`: switch auth modes and validate form behavior without creating disposable users.
   - `/studio`: load the anonymous workspace and exercise the Collect → Curate → Generate controls up to—but not including—a paid AI generation.
   - `/auth/confirm`: verify the intentional missing/expired-token state and its return-to-sign-in action.
2. **Authentication boundaries**
   - Visit `/projects` and a project URL while signed out; confirm both redirect cleanly to `/auth` with no console or request errors.
   - Restore the managed signed-in session and verify `/`, `/studio`, and `/auth` redirect or render as intended.
3. **Authenticated routes**
   - `/projects`: load projects, open/close the user menu, and test project creation only if it can be removed afterward.
   - `/projects/$projectId`: open a real project, switch rooms/stages, and verify room, inspiration, brief, image, and usage requests.
4. **Capture evidence on every step**
   - Browser console: uncaught errors, unhandled promise rejections, framework warnings, and failed resource messages.
   - Network: requests with status `400+`, aborted requests that are not explained by navigation, malformed API responses, and CORS failures.
   - Save a screenshot and a compact route-by-route result table.

## Endpoint contract checks

- `GET /api/usage`: expect valid JSON and a successful status in both anonymous and signed-in contexts.
- `POST /api/generate`: validate its safe error behavior with an invalid body; do not consume a generation during the smoke pass.
- `/lovable/email/auth/webhook`, `/lovable/email/auth/preview`, and `/lovable/email/queue/process`: verify only their supported methods and expected authentication/validation responses. These are service routes, not navigable pages.
- Review matching server logs for any browser request that returns `500`, stalls, or produces an ambiguous client error.

## Triage rules

- Ignore the known preview-shell warning `Unknown message type: RESET_BLANK_CHECK`; it originates from the preview host rather than the app.
- Treat expected redirects, deliberate invalid-form responses, and cancelled requests caused by navigation as passes when behavior matches the route contract.
- Record each real defect with route, action, console message, request URL/method/status, screenshot, and reproducible steps.
- Fix only confirmed defects, then rerun the affected route and a short regression pass across all routes.

## Manual testing handoff

Provide a checklist for Chrome plus one secondary browser, covering:

- Signed-out landing, auth, anonymous studio, and protected-route redirects.
- Email/password sign-up, confirmation-link, sign-in, sign-out, and Google sign-in flows.
- Project creation, room navigation, image upload, palette selection, brief editing, and persistence after refresh.
- One explicitly approved real generation to verify streaming, quota display, saved output, and before/after comparison.
- For every failure, capture the Console and Network request details before refreshing.

## Completion criteria

- Every user-facing route has a documented pass/fail result in signed-out or signed-in state as applicable.
- No unexplained uncaught console errors, failed first-party requests, CORS errors, or server `500` responses remain.
- Auth redirects and service endpoint responses match their intended contracts.
- A concise issue list and repeatable manual checklist are ready for the rest of launch week.
