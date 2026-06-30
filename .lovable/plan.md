## Fix BeforeAfter slider — use clip-path instead of resized inner image

The current implementation in `src/components/BeforeAfter.tsx` wraps the "after" image in a div whose `width: {pos}%` is meant to clip, and tries to compensate by reading `containerRef.current?.clientWidth` during render to set the inner `<img>` width. That ref read is non-reactive and conflicts with `inset-0` on the img, producing the resize-instead-of-reveal behaviour you're seeing.

### Change

Replace the wrapper-div clipping with `clip-path: inset(...)` applied directly to a full-size, absolutely-positioned "after" `<img>` stacked on top of the "before" `<img>`:

- Both `<img>` elements: `absolute inset-0 size-full object-cover` — identical box, perfectly aligned.
- After image gets `style={{ clipPath: \`inset(0 ${100 - pos}% 0 0)\` }}`, revealing it from the left up to the slider position.
- Drop the `containerRef.current?.clientWidth` width hack and the intermediate clipping `<div>` entirely.
- Keep the blur filter on the after image when `afterBlurred` is true (combined into the same `style` object).
- Slider handle, drag logic, before/after labels, container styles — all unchanged.

No other components or styles touched.