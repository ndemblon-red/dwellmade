# Changelog

---

## 2026-08

### Style blending
- Added style blend modal between Collect and Curate stages — appears when inspiration images span multiple aesthetic styles
- Drag-to-rank UI with exclude option — dominant style always receives 80% influence, remaining 20% split equally across other ranked styles
- Vibe field regenerates via Gemini Flash when blend is set
- Generation prompt updated to apply blend hierarchy globally across all design decisions, not just furniture style
- lightingMood now correctly wired from brief to generation prompt

### Generate step
- Additional Notes placeholder updated to guide users toward specific spatial instructions

---

## 2026-06

### Auth & persistence
- Supabase auth with email/password and Google OAuth
- `/auth` page with sign in / sign up
- `/auth/confirm` route handles email verification token, redirects to `/projects`
- Email confirmation enabled (auto-confirm turned off)
- Persistent AppHeader with sign in / sign out, user avatar
- Anonymous use still works; session state preserved across sign-in

### Projects & rooms
- `/projects` dashboard — project cards with master palette swatches, room count, last updated
- Project view — rename in place, master palette editor, rooms sidebar (add / rename / delete)
- Master palette pre-fills Aesthetic Brief on first room open
- URL-driven active room state

### Data sync
- `useRoomSync` hook hydrates Zustand store from Supabase on room open
- Auto-persists: room photo + inspiration images to Supabase Storage, brief auto-upserts (debounced 500ms), completed generations upload + insert, removals cascade
- Private storage bucket with per-user folder policies
- RLS on all tables scoped to `auth.uid()`

### Curate stage
- Per-image palette rows — individual swatches are clickable/selectable
- Aesthetic Brief palette built by user selection, not auto-derivation
- RE-DERIVE re-derives materials, furniture style, and vibe only — not palette
- Conflict surfacing for divergent furniture styles

### Core flow
- Collect → Curate → Generate three-stage flow
- Gemini Flash tagging: palette, materials, furniture style, lighting mood, vibe
- Aesthetic Brief: palette, materials, furniture style, vibe
- Streaming SSE generation with intermediate frame previews
- Before/after draggable comparison slider
- Generation history persisted to Supabase
- Constraint switches: keep/change walls, flooring, furniture, decor
- IndexedDB blob storage with session isolation and quota error handling
