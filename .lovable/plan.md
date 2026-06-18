## Problem

`sessionStorage` has a ~5MB quota per origin. We're persisting the entire Zustand store as JSON, including base64 data URLs for:
- the room photo
- every inspiration image
- every generation in history (including in-progress streamed previews)

A second generation easily pushes total payload past 5MB and the whole `setItem` call fails — which also means nothing further persists for the rest of the session.

## Fix

Move large binary blobs out of `sessionStorage` into **IndexedDB** (via `idb-keyval`, ~tens of MB available), and keep only lightweight metadata in the Zustand persisted state. Also trim generation history.

### Changes

1. **Add `idb-keyval`** as a dependency (tiny, ~600 bytes, Worker-safe — browser-only usage).

2. **New `src/lib/blobStore.ts`** — thin wrapper around `idb-keyval` with `getBlob(id)`, `setBlob(id, dataUrl)`, `deleteBlob(id)`, SSR-safe (no-op when `window` is undefined).

3. **Refactor `src/lib/store.ts`**:
   - Store shape changes so image fields hold a **blob id** (string) instead of the raw `dataUrl`.
     - `room: { blobId, uploadedAt } | null`
     - `InspoImage.blobId` instead of `dataUrl`
     - `Generation.blobId` instead of `dataUrl`
   - Setters (`setRoom`, `addInspo`, `updateGeneration`) write the data URL to IndexedDB and only put the id in state.
   - Removers (`removeInspo`, `removeGeneration`, clearing room) delete the corresponding blob.
   - Use Zustand `persist` `partialize` to be explicit about what's serialised (everything except transient fields).
   - Cap `generations` to the latest **5** entries; delete blobs for evicted ones.
   - Skip persisting in-progress generations (`isFinal: false`) so a half-streamed image never bloats storage; only the final frame is saved.

4. **Component updates** — anywhere that currently reads `image.dataUrl` (in `src/routes/index.tsx` and `src/components/BeforeAfter.tsx`) switches to a small `useBlobUrl(blobId)` hook that loads the data URL from IndexedDB and returns it (with a loading fallback). The hook lives in `src/lib/blobStore.ts`.

5. **Migration / safety**: on store rehydrate, if the persisted shape still contains `dataUrl` fields from the old version, wipe the store (one-time) so users don't get stuck. Bump persist `version` to `2`.

6. **Quota guard**: wrap `setBlob` in try/catch; on `QuotaExceededError` surface a toast ("Storage full — clear some inspiration images or history") instead of crashing.

### Out of scope

- No server-side storage, no Lovable Cloud — still session-only, just using the right browser API for binary data.
- No change to the generation pipeline, tagging, or UI layout.

### Technical notes

- `idb-keyval` is pure JS, no native deps, works in all modern browsers; SSR guard ensures the TanStack Start server build doesn't touch it.
- IndexedDB is **persistent across reloads** by default (unlike `sessionStorage`). To preserve "session-only" semantics, we'll namespace the IDB database with a per-tab session id stored in `sessionStorage`, and on store rehydrate purge any blobs whose session id doesn't match — keeping behaviour identical to today.
