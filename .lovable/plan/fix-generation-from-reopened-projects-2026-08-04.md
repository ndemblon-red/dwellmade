# Fix generation from reopened projects

## Confirmed issue

- Freshly uploaded images are sent to generation as inline `data:` URLs.
- Persisted room and inspiration images are rehydrated as signed HTTPS storage URLs.
- The generation endpoint currently validates every image with `startsWith("data:")`, so reopened projects fail before the image model is called.

## Implementation

1. Update the generation request schema to accept either a valid image data URL or a valid HTTPS image URL for the room and inspiration inputs.
2. Keep malformed strings, non-HTTPS remote URLs, and invalid request shapes rejected before the generation limit check or model call.
3. Preserve the existing Gemini multimodal request format, which already passes these values as `image_url` content and supports both representations.
4. Add focused validation coverage for:
   - a fresh project using inline room and inspiration images;
   - a reopened project using signed HTTPS room and inspiration images;
   - mixed inline/HTTPS inspiration inputs;
   - rejected malformed or insecure image values.
5. Reproduce the reopened-project flow in preview and verify generation proceeds past request validation without console or network errors.

## Technical details

- The fix belongs at the API validation boundary; no database, storage, generation prompt, or persistence changes are required.
- Existing server-side usage enforcement remains unchanged and continues to run before the upstream model request.
