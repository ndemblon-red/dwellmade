# Clean up leftover "studio-syn" naming

The old working name still appears in five places. They split into two groups: user-visible strings (safe to rename now) and infrastructure identifiers (renaming would break existing data).

## Rename now (user-visible)

1. `src/routes/index.tsx:1805` — download filename `studio-syn-<id>.png` becomes `dwellmade-<id>.png`, matching the other download button at line 774.

## Rename with a safe migration (local browser storage)

2. `src/lib/store.ts:312` — persisted Zustand key `studio-syn-session`.
3. `src/lib/blobStore.ts:8-9` — session id key `studio-syn-session-id` and IndexedDB name `studio-syn`.

Renaming these is cosmetic (nobody sees them outside devtools) but it orphans any in-progress anonymous session stored in a browser. Options:

- **A. Leave as-is** — zero risk, invisible to users.
- **B. Rename with a one-time migration** — on first load, copy the old localStorage value to the new key and delete the old one; open the old IndexedDB name once, copy blobs across, then delete it.
- **C. Rename with no migration** — simplest, but anonymous users with an unsaved session lose their uploaded images once.

## Do not rename (backend)

4. `src/lib/projects-api.ts:8` and the storage policies in the 2026-06-19 migration reference the storage bucket `studio-syn`. Every saved room and inspiration image already lives under that bucket path. Renaming means creating a new bucket, copying all objects, rewriting stored paths, and re-creating policies — real risk of breaking existing projects for a name no user ever sees. Recommendation: keep the bucket name.

## Recommendation

Do item 1 now, plus item 2/3 using option B. Leave the bucket alone.
