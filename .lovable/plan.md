# Auth + Projects Persistence

This is a substantial migration from session-only state to a fully persisted, multi-user app backed by Lovable Cloud (auth + Postgres + Storage). I'll do it in two phases as you outlined.

Before I start I'll need to enable **Lovable Cloud** (it provisions the database, auth, and storage automatically — no external accounts).

A few decisions I'm making by default, flag any you want to change:

- **Auth methods**: email + password and Google sign-in (Lovable Cloud's managed Google broker).
- **Profiles table**: not creating one yet — we don't need username/avatar/roles for the features described. Email comes from the auth user. Easy to add later.
- **Anonymous → authenticated handoff**: when an anonymous user signs in mid-flow, we keep the current store contents in memory, then on first save create a project named "Untitled project" with one room "Room 1" seeded from that state. No silent background writes before sign-in.
- **Image storage**: one private bucket `studio-syn` with per-user folders (`{user_id}/rooms/...`, `.../inspo/...`, `.../generations/...`); access via short-lived signed URLs. RLS scopes everything to `auth.uid()`.
- **Auto-save cadence**: debounced 500ms for brief edits and tag updates; immediate for image uploads and finished generations.

---

## Phase 1 — Auth

1. Enable Lovable Cloud (creates Supabase project, env vars, integration files).
2. Configure Google as a social provider via the managed broker.
3. New `/auth` route — minimal editorial-styled page with email/password (sign in + sign up tabs) and a "Continue with Google" button. Uses `lovable.auth.signInWithOAuth("google", ...)`.
4. Persistent top header in `__root.tsx`:
   - Left: "Studio Syn" wordmark (Instrument Serif).
   - Right: when signed out → "Sign in" link; when signed in → email + a small menu with "Sign out".
5. Anonymous use stays allowed. When an anonymous user hits **Generate**, show a small inline prompt: "Sign in to save and generate" with a Sign in button. Generation itself requires auth (so we can persist the result and bill API correctly).
6. State preservation: the existing zustand store survives the OAuth round-trip naturally (it's in sessionStorage + IndexedDB on the same origin). On first authenticated save we migrate it into the DB.

## Phase 2 — Projects, rooms, persistence

### Schema (one migration)

```
projects(id, user_id, name, master_palette jsonb, created_at, updated_at)
rooms(id, project_id, name, room_photo_url, created_at, updated_at)
inspiration_images(id, room_id, image_url, tags jsonb, created_at)
aesthetic_briefs(id, room_id UNIQUE, palette jsonb, materials jsonb,
                 furniture_style text, vibe text, updated_at)
generations(id, room_id, result_image_url, prompt_used text, created_at)
```

- All tables get explicit `GRANT`s to `authenticated` + `service_role`.
- RLS on every table, policies via a single `project_owner(project_id)` security-definer helper so child tables don't need to re-query `auth.uid()`.
- `updated_at` trigger on `projects`, `rooms`, `aesthetic_briefs`.
- Storage: private bucket `studio-syn`, RLS policies on `storage.objects` scoped to `auth.uid()::text = (storage.foldername(name))[1]`.

### Server functions (TanStack `createServerFn` + `requireSupabaseAuth`)

In `src/lib/projects.functions.ts`:
- `listProjects`, `createProject`, `renameProject`, `deleteProject`, `setMasterPalette`
- `listRooms(projectId)`, `createRoom`, `renameRoom`, `deleteRoom`, `setRoomPhoto`
- `getRoomDetail(roomId)` → returns brief + inspo + generations (with signed URLs)
- `upsertBrief(roomId, brief)` — debounced auto-save target
- `addInspirationImage`, `updateInspirationTags`, `removeInspirationImage`
- `recordGeneration(roomId, prompt, blobBase64)` — uploads to Storage, inserts row, returns signed URL
- `signUrl(path)` helper for refreshing expired signed URLs

The existing `/api/generate` server route stays as the streaming endpoint; on final frame the client calls `recordGeneration` to persist.

### Routes

- `/` — if signed out, marketing-light landing + "Sign in to start"; if signed in, redirect to `/projects`.
- `/_authenticated/projects` — dashboard grid of project cards (name, latest generation thumbnail, room count, "New project").
- `/_authenticated/projects/$projectId` — project view with: editable name, **master palette editor** (reuses the existing swatch UI), rooms sidebar/tabs, "New room" button, and the existing Collect → Curate → Generate flow rendered for the active room.

The whole interior flow (uploads, moodboard, brief editor, before/after) stays exactly as is — only its data source changes from the local zustand store to a TanStack Query–backed room hook that reads/writes through the server functions.

### Client data layer

- Add TanStack Query wiring (QueryClient in router context, `defaultPreloadStaleTime: 0`).
- New `useRoom(roomId)` and `useProject(projectId)` hooks; mutations debounce-saved for brief/tags.
- IndexedDB `blobStore` stays as a **local cache** keyed by storage path: on first fetch of a signed URL we cache the blob; on upload we write to both Storage and the cache so the active session feels instant. Source of truth = Storage.
- Master palette: `useRoom` seeds an empty brief's palette from `project.master_palette` on first open; users can still edit per-room.

### What stays untouched

- Collect / Curate / Generate UI, palette swatch interaction, before/after slider, editorial styling, streaming generation pipeline, tagging server fn.

---

## Technical notes

- `client.server` (service role) only used inside handlers, never at module scope of `*.functions.ts` files.
- Public landing at `/` stays SSR; `/projects/*` lives under `_authenticated/` so the managed auth gate handles redirects.
- Generation history is no longer capped at 5 — full history per room, ordered by `created_at desc`, with pagination if it grows large.
- Migration deletes nothing from the user's current sessionStorage; on first sign-in we offer "Save current work as a new project".

---

Shall I go ahead and enable Lovable Cloud and start with Phase 1?
