# dwellmade

![Tests](https://github.com/natalie/dwellmade/actions/workflows/test.yml/badge.svg?branch=main)

> From inspiration to your actual home.

An AI-powered interior design tool that lets you upload inspiration images, build an aesthetic brief, and see it applied to your own room in real time. No design experience required.

**Not Live yet:** [dwellmade.co.uk](https://dwellmade.co.uk)  
**Stack:** TanStack Start · React 19 · Tailwind · Supabase · Gemini Flash · Zustand

---

## How it works

1. **Collect** — upload inspiration images (Pinterest saves, screenshots, anything). Gemini Flash extracts palette, materials, furniture style and vibe from each.
2. **Curate** — build your Aesthetic Brief by selecting colours from each image's extracted palette, toggling materials, and editing the vibe sentence.
3. **Generate** — upload your room photo, set constraints (keep walls / change flooring etc.), and generate a redesign in real time via streaming SSE.
4. **Compare** — drag the before/after slider to compare your original room with the result.
5. **Save** — sign in to save projects, manage multiple rooms, and set a master palette across a whole home.

---

## Status: early development

Core flow is working end to end. Auth and project persistence shipped. Landing page in progress.

---

## To do

### Now

- [ ] Landing page — two-column hero with before/after slider, cobalt ticker band, how-it-works footer
- [ ] Swap landing page placeholder images for a real before/after generation
- [ ] Anonymous → project migration on sign-in (prompt to save unsaved session work)
- [ ] "Sign in to save" gate at the Generate button for anonymous users

### Next

- [ ] IP rate limiting on `/api/generate` for anonymous users
- [ ] Hard 3-generation anonymous limit with sign-up prompt
- [ ] Cloudflare Turnstile on the generate button (bot protection)
- [ ] Usage counter per authenticated user (`generations_used` in Supabase)
- [ ] Stripe integration + upgrade prompt when free tier exhausted
- [ ] Floorplan upload (collect now, use in future features)

### Later / ideas

- [ ] Real furniture insertion — upload a photo of a piece you own, place it in the room
- [ ] Product URL → scrape image → insert furniture (affiliate/commerce angle)
- [ ] Master palette inheritance improvements across rooms
- [ ] Mobile-optimised experience
- [ ] Examples gallery on landing page
- [ ] Share a generation via link

---

## Local development

```bash
npm install
npm run dev
```

Requires `.env` with:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GEMINI_API_KEY=
```

---

## Repo structure

```
/src
  /components     UI components
  /pages          Route pages (TanStack Start)
  /store          Zustand store
  /lib            Supabase client, API helpers
  /api            Server-side route handlers (generate, tag)
```
