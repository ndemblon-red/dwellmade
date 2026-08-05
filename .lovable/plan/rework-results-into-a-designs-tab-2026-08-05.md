# Rework Results into a "Designs" tab

## What changes

- The extra tab moves to the **end** of the workflow: Collect → Curate → Generate → **Designs** (numbered 04, subtitle "Original & generated designs").
- Rooms with existing generations still open straight on that tab, now called Designs.
- The Designs tab drops the before/after slider and the "Edit room / Create another version" framing as its centrepiece. Instead it shows a single large image grid:
  - the original room photo first, labelled "Original"
  - every generated design after it, newest-first order preserved from the Versions list
- Thumbnails become much larger (1 column on mobile, 2 on tablet, 3 on wide screens) using the room's natural aspect ratio rather than tight squares.
- Clicking a design selects it (so Generate keeps showing the same one); right-click still removes it, and a Download link appears on hover/under each generated design.
- A quiet action row stays at the bottom: Edit room, Create another version.
- The Generate tab keeps its existing small "Versions" strip unchanged.
- If all designs are deleted, the tab disappears and the app falls back to Collect (existing behaviour retained).

## Technical notes

- `src/lib/store.ts`: rename the `Stage` value `"results"` to `"designs"`.
- `src/lib/useRoomSync.ts`: hydrate completed rooms into `"designs"`.
- `src/routes/index.tsx`:
  - `STAGE_LABELS.designs` = `{ num: "04", title: "Designs", sub: "Original & generated designs" }`; stage list becomes `[...BASE_STAGE_ORDER, "designs"]` when generations exist.
  - Replace `ResultsStage` with `DesignsStage`: no `BeforeAfter`, no `GenerationGallery`; render a large grid of the room photo plus `generations.filter(g => g.dataUrl)`.
  - Keep `GenerationGallery` as-is for the Generate tab.
  - Guard clause for enabled tabs updated for the renamed stage.
