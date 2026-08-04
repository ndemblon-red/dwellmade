# Room management and completed-room previews

## Goal
Make projects work naturally as collections of rooms: users can reliably manage room names, quickly switch rooms, and immediately see the latest finished design instead of being dropped back at the start of the workflow.

## Changes

### 1. Repair the room actions menu
- Keep the existing room `···` action control, but move/render its dropdown so it is not clipped by the horizontal scrolling room bar.
- Make **Rename** open a focused inline name field and save on Enter or blur; Escape cancels.
- Preserve **Delete** with its confirmation step.
- Ensure the menu closes after an action, on outside click, and when another room is selected.

### 2. Add a compact completed-room preview
- After a room is hydrated, detect whether it has at least one finished saved generation.
- For completed rooms, open a compact **Room preview** by default rather than resetting to Collect.
- Show the original room and latest finished design in the existing interactive before/after comparison, sized as a restrained project summary rather than a full-page feature.
- Include the room name, latest-generation context, and clear actions:
  - **Edit room** — enter the existing Collect → Curate → Generate workflow.
  - **Create another version** — open Generate with the current brief and generation history intact.
- Rooms without a completed generation continue to open at the beginning of the workflow.

### 3. Preserve the multi-room project experience
- Keep the horizontal room switcher as the primary navigation within a project.
- Switching rooms updates the compact preview/workflow in place; it does not navigate away from the project.
- Keep each room’s existing generation history available when entering its Generate stage.
- Do not add a new database table or completion flag: a room is considered completed when it has at least one persisted final generation.

## Technical details
- Extend the workspace view state with a room-preview mode while leaving the persisted room content unchanged.
- Change room hydration so completed rooms select preview mode and unfinished rooms select Collect.
- Reuse `BeforeAfter` for the preview and the existing generation selection data, avoiding duplicate image logic.
- Fix the dropdown at the project-route UI layer; no backend change is required for renaming because `rooms.name` and `updateRoom` already support it.

## Verification
- Rename rooms with Enter, blur, and cancel with Escape on desktop and touch-sized layouts.
- Confirm the room menu is visible above the scroll container and closes correctly.
- Switch between an unfinished room and one or more completed rooms and verify each opens in the correct state.
- Verify Edit room and Create another version preserve the selected room, brief, and generation history.
- Check compact preview sizing and controls on mobile, tablet, and desktop.