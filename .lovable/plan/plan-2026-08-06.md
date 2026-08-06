Create a dwellmade favicon

Create a simple but on-brand favicon mark — a lowercase "d" inside a circle — using the dwellmade palette and type feel, then wire it into the app.

## Plan

1. Generate a favicon mark
   - Lowercase "d" inside a circle.
   - Use the brand type feel (Instrument Serif italic) and palette (near-black #1a1a2e with mustard #f0a500 accent, or the reverse on dark).
   - Output as a 128x128 PNG so it is crisp at 16x16 and 32x32 in browser tabs.

2. Add the static file
   - Create a `public/` directory at the project root if it does not exist.
   - Save the generated image as `public/favicon.png`.

3. Wire it into the root route
   - Add `{ rel: "icon", type: "image/png", href: "/favicon.png" }` to the `links` array in `src/routes/__root.tsx`.

4. Verify
   - Run the build/typecheck to confirm no errors.
   - Spot-check the browser tab in the live preview to see the favicon load.

## Technical notes

- No schema or backend changes required.
- The existing app has no `public/` directory and no favicon link, so the favicon link will be added fresh.
- If a generated raster logo is used, resize it to a square favicon size before saving; the source file will not be copied directly at full resolution.
