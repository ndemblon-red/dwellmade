import { useCallback, useEffect, useRef, useState } from "react";

export function BeforeAfter({
  beforeSrc,
  afterSrc,
  afterBlurred = false,
}: {
  beforeSrc: string;
  afterSrc: string;
  afterBlurred?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const dragging = useRef(false);

  const updatePos = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, x)));
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      updatePos(e.clientX);
    };
    const onUp = () => (dragging.current = false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [updatePos]);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[3/2] bg-zinc-200 rounded-md outline-1 -outline-offset-1 outline-black/5 overflow-hidden select-none cursor-ew-resize"
      onPointerDown={(e) => {
        dragging.current = true;
        updatePos(e.clientX);
      }}
    >
      <img
        src={beforeSrc}
        alt="Original room"
        className="absolute inset-0 size-full object-cover"
        draggable={false}
      />
      <div
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${pos}%` }}
      >
        <img
          src={afterSrc}
          alt="Redesigned room"
          className="absolute inset-0 h-full object-cover transition-[filter] duration-300"
          style={{
            width: containerRef.current?.clientWidth ?? "100%",
            filter: afterBlurred ? "blur(16px)" : "none",
          }}
          draggable={false}
        />
      </div>
      <div
        className="absolute inset-y-0 w-px bg-paper shadow-[0_0_0_1px_rgba(0,0,0,0.15)]"
        style={{ left: `${pos}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-8 bg-paper rounded-full grid place-items-center shadow-lg ring-1 ring-black/10">
          <div className="flex gap-0.5">
            <span className="block w-px h-3 bg-ink/30" />
            <span className="block w-px h-3 bg-ink/30" />
          </div>
        </div>
      </div>
      <span className="absolute bottom-3 left-3 text-[9px] uppercase tracking-widest font-mono bg-ink/80 text-paper px-2 py-1 rounded-sm pointer-events-none">
        Before
      </span>
      <span className="absolute bottom-3 right-3 text-[9px] uppercase tracking-widest font-mono bg-paper/90 text-ink px-2 py-1 rounded-sm pointer-events-none">
        After
      </span>
    </div>
  );
}
