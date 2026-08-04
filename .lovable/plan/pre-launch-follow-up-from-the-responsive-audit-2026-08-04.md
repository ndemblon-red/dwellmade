# Pre-launch follow-up from the responsive audit

## Findings

- **Fixed in this batch:** `/studio` had confirmed page-level horizontal overflow at 390px. The workspace, stage navigation, action rows, project dashboard, and project detail shells now fit at 390px, 768px, and 1280px with no console errors in the signed-out preview.
- **Fixed in this batch:** project and room delete actions were hover-dependent on larger layouts; they are now visible on touch-sized screens and keyboard focus reveals them on desktop.
- **Still needs fixing before launch:** sign-out currently clears the auth session and navigates home, but does not cancel or clear cached protected project queries. Browser Back may briefly restore stale project content or trigger post-sign-out authorization errors.
- **Verification gap, not a confirmed defect:** the managed browser session is currently signed out, so `/projects` and `/projects/$projectId` could only be reviewed in source, not exercised with real project data at mobile and tablet sizes.

## Implementation

1. Update the shared account-menu sign-out flow to cancel in-flight queries, clear the protected query cache, sign out, and replace navigation with `/auth`.
2. Once a signed-in preview session is available, test `/projects` and one populated project at phone, tablet, and desktop widths, including long names, room scrolling, touch delete controls, and every Collect → Curate → Generate stage.
3. Re-run the affected sign-out and responsive checks, recording any console or failed-network requests.

## Launch assessment

No other confirmed launch-blocking visual bugs were found in this batch. The sign-out cache cleanup should be completed before launch; the authenticated device pass is required to close the remaining test gap.
