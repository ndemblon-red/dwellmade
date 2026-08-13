# Automated tests for the FAQ accordion

Goal: cover the landing-page FAQ with tests that prove it toggles open/closed, keeps only one item open at a time, and is usable by keyboard.

## Why a small refactor first

The FAQ is currently defined inside the landing route file, which pulls in auth, the router, and image assets. Importing that whole file into a test is heavy and brittle, so the FAQ moves into its own component file first — no visual or behavioural change.

## Changes

1. **Extract the FAQ into `src/components/FaqSection.tsx`**
   - Move `FAQ_ITEMS` and the `FaqSection` component out of `src/routes/index.tsx`, exporting both.
   - Keep the markup, styling, and single-open behaviour byte-identical; shared style constants (colors, `serif`, `dmSans`) move to or import from a small shared module so both files use the same values.
   - `src/routes/index.tsx` imports `FaqSection` for rendering and `FAQ_ITEMS` for the existing FAQPage JSON-LD block.

2. **Accessibility touch-ups needed for keyboard assertions**
   - Give each answer panel an `id` and link it from its button via `aria-controls`, and mark the panel `hidden` when closed so screen readers and tests agree with the visual state.
   - Buttons are already native `<button>` elements, so Tab/Enter/Space work without extra key handlers.

3. **Add `src/components/FaqSection.test.tsx`** (Vitest + React Testing Library, matching the existing `UpgradeModal.test.tsx` setup)
   - Renders all eight questions, with every panel collapsed and `aria-expanded="false"` initially.
   - Clicking a question opens it: `aria-expanded="true"`, `+` swaps to `−`, answer text becomes visible.
   - Clicking the same question again closes it.
   - Opening a second question closes the first — asserts exactly one expanded button across the list.
   - Keyboard: Tab reaches the question buttons in document order; Enter toggles the focused item; Space toggles it; focus stays on the button after toggling.
   - `aria-controls` points at the matching panel and the panel is hidden when collapsed.

## Verification

Run the suite with `bunx vitest run` and confirm the new file passes alongside the existing tests, plus a typecheck.
