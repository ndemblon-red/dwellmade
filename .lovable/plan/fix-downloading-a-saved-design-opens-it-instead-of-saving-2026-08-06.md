# Fix: downloading a saved design opens it instead of saving

## What's happening

Freshly generated designs are held in the browser as inline image data, so the
Download link saves a file correctly. Designs loaded back from a saved project
come from a signed cloud-storage link on a different domain. Browsers ignore the
"save as" hint on cross-domain links, so the browser just navigates to the image
and shows it full size — no file is saved.

## The fix

Replace the plain download links with a shared download action that:

1. Fetches the image bytes into memory first.
2. Creates a temporary local blob link and triggers the save with the filename
   `dwellmade-<id>.png`.
3. Revokes the temporary link afterwards.
4. Falls back to opening the image in a new tab if the fetch fails (e.g. an
   expired signed link), with a short toast explaining it.

This works for both inline data images and signed cloud links, so both the
Designs grid and the "Latest Synthesis" header behave identically.

## Technical notes

- Add a `downloadImage(url, filename)` helper (new small module under `src/lib/`).
- Use it in `src/routes/index.tsx` at the two current `<a download>` sites
  (Designs grid caption, ~line 772; Latest Synthesis header, ~line 1803),
  swapping the anchors for buttons styled the same way.
- No backend, storage, or data changes.
