# Day 1, Item 3: Responsive layout audit and fixes

## Goal

Make every user-facing route comfortable and fully usable on phone, tablet, and desktop without changing dwellmade’s established visual direction or app behavior.

## Confirmed starting point

- The landing page, auth page, and confirmation page fit without horizontal overflow at 390px, 768px, and 1280px.
- The anonymous `/studio` workspace overflows horizontally at 390px. The stage navigation is too dense, and the Inspiration header/action is clipped.
- Several authenticated controls need touch-specific verification: project header actions, project deletion, room menus, palette editing, and all Collect → Curate → Generate states.

## Audit and implementation

1. **Test matrix**
   - Phone: 390 × 844, plus a 320px narrow-width edge case.
   - Tablet: 768 × 1024 in portrait and 1024 × 768 in landscape.
   - Desktop: 1280 × 1800, with a wider 1440px spot check.
   - Check `/`, `/auth`, `/auth/confirm`, `/studio`, `/projects`, and a real `/projects/$projectId` workspace.

2. **Exercise real states, not only empty pages**
   - Landing comparison slider and navigation.
   - Auth sign-in, sign-up, validation errors, and check-your-email state.
   - Studio and project workspaces through Collect, Curate, and Generate, including uploaded room/reference images, populated palettes and chips, notes, generated-result history, comparison slider, and upgrade modal.
   - Project creation cards, master palette, multiple room tabs, rename/delete menus, and empty/loading states.

3. **Apply targeted responsive fixes**
   - Remove the confirmed mobile workspace overflow and make section headers/actions wrap or stack cleanly.
   - Simplify the stage navigation at narrow widths while preserving all three stages and their enabled/active states.
   - Convert multi-item headers to shrink-safe grid/stack patterns where necessary.
   - Ensure action rows, brief strips, toggles, modals, image grids, and navigation remain readable and tappable without clipping.
   - Make hover-revealed project and room actions available to touch and keyboard users.
   - Preserve intentional horizontal scrolling only for the room selector; no page-level horizontal scrolling.

4. **Visual and interaction verification**
   - Capture before/after screenshots at each primary viewport.
   - Check page width, text wrapping, overlapping elements, fixed image proportions, menus/modals staying inside the viewport, and minimum practical tap targets.
   - Test pointer and touch interaction for both before/after sliders.
   - Confirm layout fixes introduce no console errors, failed requests, or regressions at desktop size.

## Technical approach

- Keep changes limited to responsive presentation and accessibility of existing controls.
- Reuse the current semantic design tokens and dwellmade typography, palette, grid, and spacing language.
- Prefer responsive Tailwind utilities in existing components; add global CSS only for genuinely shared behavior.
- Do not change generation, authentication, persistence, quota, or payment logic.

## Completion criteria

- No user-facing route has unintended horizontal page overflow from 320px through wide desktop.
- Every important action remains visible and operable with mouse, keyboard, and touch.
- Collect, Curate, and Generate remain coherent with both empty and populated content.
- Screenshots confirm clean phone, tablet portrait/landscape, and desktop layouts with no clipping or overlap.