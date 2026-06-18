# Inspo-First Interior Designer

A single-room redesign tool that flips the usual flow: the inspiration board comes first, the prompt comes last (and is optional). No accounts — everything lives in the browser session.

## Core flow

1. **Upload your room** — single photo, drag/drop or file picker, preview with option to replace.
2. **Build your inspiration board** — multi-upload images (Pinterest screenshots, photos, anything). Thumbnails arranged as a board; remove / reorder.
3. **Per-image tagging (auto, editable)** — when an inspo image is added, an AI vision pass extracts structured aspects:
   - palette (3–5 swatches)
   - materials (e.g. oak, brass, linen)
   - furniture style (e.g. mid-century, japandi)
   - lighting mood
   - one-line "vibe" summary
   Each aspect renders as a toggle chip on the image card — user can disable any aspect they don't want pulled in.
4. **Board-level controls**
   - Per-image **influence slider** (0–100%) — how strongly that image's surviving aspects weight the blend.
   - **Keep / change** toggles on the room: walls, flooring, large furniture (sofa, bed), windows, decor. Defaults to "change decor + walls, keep large furniture + architecture".
   - Optional free-text "extra notes" box (this is the only place a prompt appears, and it's optional).
5. **Generate** — backend composes a blended prompt from the surviving tags weighted by sliders, plus the keep/change constraints, and runs an image edit on the room photo using the inspo images as visual references.
6. **Result view** — before/after slider, regenerate, tweak controls and re-run, download. History of generations in this session.

## Screens / routes

- `/` — landing + start (room upload as the entry action)
- `/design` — the workspace: room panel (left), inspo board (center), controls (right), result (bottom or modal)
- `/result/$id` — shareable single-result view within session

Single workspace route is fine if scope stays tight; split if controls get heavy.

## AI plumbing (Lovable AI Gateway)

- **Tagging pass** (per inspo image, on upload): `google/gemini-3-flash-preview` with multimodal input + structured `Output.object` schema returning `{palette, materials, furnitureStyle, lightingMood, vibe}`. Runs via a `createServerFn`.
- **Generation pass**: image edit using the room photo as base + inspo images as references. Model: `google/gemini-3.1-flash-image-preview` (Nano Banana 2 — supports image editing with multiple input images, fast, high quality). Streamed via a server route under `src/routes/api/generate.ts` so the user sees progressive previews with a blur-to-sharp transition.
- **Prompt composition** happens server-side: enabled tags × influence weights → a structured prompt string + keep/change rules appended.

## State & persistence

- All client state (room, inspo board, tags, sliders, generations) in a Zustand store, mirrored to `sessionStorage` so a refresh doesn't nuke the board.
- Generated images returned as base64; cached as object URLs for the session. No DB, no auth, no Lovable Cloud needed.

## Design direction

This is a visually-led product so I'll generate 3 design directions via `design--create_directions` and let you pick one before building. Direction brief: editorial/curatorial feel (think a magazine art-director's pinboard), not the typical SaaS-purple-gradient AI tool — physical board metaphor, generous whitespace, image-forward.

## Tech notes

- TanStack Start, existing stack. No backend account system, no DB.
- Streaming image generation via server route (not `createServerFn`, since RPC can't stream).
- `eventsource-parser` + `flushSync` for SSE rendering, blurred partials → sharp final.
- Drag/drop via native HTML5 (no extra lib needed for MVP).

## Out of scope (for v1)

- Pinterest board API import (manual upload only).
- Accounts / saved projects.
- Multi-room / whole-house projects.
- Locking specific objects via bounding boxes (just text-level keep/change toggles).

## Build order

1. Generate + pick design direction.
2. Workspace shell, room upload, inspo board with drag/drop.
3. Tagging server fn + tag chip UI.
4. Controls panel (sliders, keep/change toggles, notes).
5. Streaming generation server route + result view with before/after.
6. Session persistence + generation history.
