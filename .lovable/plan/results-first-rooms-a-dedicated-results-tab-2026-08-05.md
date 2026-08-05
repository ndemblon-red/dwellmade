# Results-first rooms: a dedicated Results tab

## Problem

Rooms that already have generated designs currently open into a separate full-screen "Preview" mode that replaces the stage navigation. It sits outside the normal workflow, so it feels disconnected and the existing, working results UI (the before/after comparison plus the history thumbnails at the bottom of Generate) is hidden until you walk back through the workflow.

## Approach

Replace the standalone Preview screen with a proper **Results** tab that sits first in the stage navigation, and reuse the results UI that already works today.

### 1. Results becomes a real stage

- Stage order becomes: **Results → Collect → Curate → Generate**.
- The Results tab appears only when the room has at least one saved design; rooms with no designs keep the current three-step bar and open at Collect.
- Opening a room that has designs selects the Results tab. The stage bar stays visible, so Collect, Curate and Generate remain one click away at all times.
- Remove the separate full-screen preview layout so there is only one shell for the whole room.

### 2. What the Results tab shows

- The selected design in the interactive before/after comparison, with the room photo as "before".
- A browsable gallery of every saved design for the room, newest first. Clicking a thumbnail swaps the comparison; the currently selected one is highlighted.
- Design context (its brief summary and date) plus a Download link.
- Two actions: **Edit room** (goes to Collect with the room photo, references and brief intact) and **Create another version** (goes to Generate with the same brief).

### 3. Keep Generate's history working

The Generate tab keeps its existing latest-result section and history strip, so a design you just made is still visible in place without jumping tabs. Both tabs read the same saved designs and the same selection, so switching between them stays in sync.

## Technical details

- `Stage` in `src/lib/store.ts`: rename `preview` to `results`.
- `src/lib/useRoomSync.ts` (line ~133): hydrate completed rooms into the `results` stage instead of `preview`.
- `src/routes/index.tsx`:
  - Drop the early-return preview branch in `Workspace` (lines 477-490) and render Results inside the normal shell.
  - Make `STAGE_ORDER` dynamic: prepend `results` when `generations.length > 0`; adjust the stage-bar grid to handle 3 or 4 columns and keep the existing enable/disable rules for Curate and Generate.
  - Extract the gallery/thumbnail markup currently inside `ResultSection` (lines 1674-1700) into a shared `GenerationGallery` component used by both `ResultSection` and the new `ResultsStage`.
  - Rewrite `PreviewStage` as `ResultsStage`, driven by `activeGenerationId` with `generations[0]` as fallback, using `BeforeAfter` and `GenerationGallery`.
- No database, storage or generation-pipeline changes.

## Verification

- Room with saved designs opens on Results; the gallery browses between versions and the comparison slider updates.
- Room with no designs opens on Collect and shows no Results tab.
- Edit room and Create another version land on the right stage with the brief preserved.
- Generating a new design adds it to both the Generate history and the Results gallery.
- Check the 4-tab stage bar at mobile width.
