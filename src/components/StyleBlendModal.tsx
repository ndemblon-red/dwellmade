import { useEffect, useMemo, useState } from "react";
import type { InspoImage } from "@/lib/store";

const RANK_LABELS = ["dominant", "accent", "hint"];

/** Formats the ranked style list into the furnitureStyle brief string. */
export function formatBlend(styles: string[]): string {
  if (styles.length === 0) return "";
  if (styles.length === 1) return styles[0];
  return styles
    .map((s, i) => `${s} (${RANK_LABELS[i] ?? "minor influence"})`)
    .join(", ");
}

/** Default influence weights before any user interaction. */
export function defaultWeights(count: number): number[] {
  if (count === 2) return [70, 30];
  if (count === 3) return [65, 25, 10];
  return Array.from({ length: count }, () => Math.round(100 / Math.max(count, 1)));
}

function thumbsFor(inspo: InspoImage[], style: string): string[] {
  return inspo
    .filter(
      (i) =>
        i.status === "ready" &&
        i.dataUrl &&
        i.aspects?.furnitureStyle.trim().toLowerCase() === style.trim().toLowerCase(),
    )
    .map((i) => i.dataUrl)
    .slice(0, 3);
}

export function StyleBlendModal({
  styles,
  inspo,
  onConfirm,
  onSkip,
}: {
  styles: string[];
  inspo: InspoImage[];
  onConfirm: (ranked: string[]) => void;
  onSkip: () => void;
}) {
  const [ranked, setRanked] = useState<string[]>(styles);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    setRanked(styles);
    setExcluded([]);
  }, [styles]);

  const weights = useMemo(() => defaultWeights(ranked.length), [ranked.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= ranked.length || from === to) return;
    setRanked((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center px-4 py-8 overflow-y-auto"
      style={{ backgroundColor: "rgba(10,10,20,0.6)" }}
      role="dialog"
      aria-modal="true"
      aria-label="How do you want to blend your styles?"
    >
      <div
        className="w-full max-w-[560px] p-6 sm:p-8 space-y-5"
        style={{ backgroundColor: "#1A1A2E", color: "#F5F0E8", borderRadius: 4 }}
      >
        <p
          className="text-[10px] font-medium uppercase tracking-[0.18em]"
          style={{ color: "#F0A500" }}
        >
          Your inspiration spans multiple styles
        </p>
        <h2 className="font-serif italic text-3xl leading-tight">How do you want to blend them?</h2>
        <p className="text-sm" style={{ color: "rgba(245,240,232,0.65)" }}>
          Rank by influence — your top style will dominate the result. Remove any you don&apos;t
          want.
        </p>

        <ul className="space-y-2">
          {ranked.map((s, i) => (
            <li
              key={s}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null) move(dragIndex, i);
                setDragIndex(null);
              }}
              className="flex items-center gap-3 px-3 py-2"
              style={{
                borderRadius: 4,
                backgroundColor: "rgba(245,240,232,0.06)",
                border: "1px solid rgba(245,240,232,0.12)",
              }}
            >
              <span
                className="cursor-grab select-none text-sm"
                style={{ color: "rgba(245,240,232,0.45)" }}
                aria-hidden="true"
              >
                ⠿
              </span>
              <span className="font-mono text-[11px]" style={{ color: "#F0A500" }}>
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">
                {s}
                <span className="ml-2 text-[10px]" style={{ color: "rgba(245,240,232,0.5)" }}>
                  {RANK_LABELS[i] ?? "minor influence"} · {weights[i]}%
                </span>
              </span>
              <span className="flex gap-1">
                {thumbsFor(inspo, s).map((src, n) => (
                  <img
                    key={n}
                    src={src}
                    alt=""
                    className="size-8 object-cover"
                    style={{ borderRadius: 2 }}
                  />
                ))}
              </span>
              <span className="flex flex-col">
                <button
                  onClick={() => move(i, i - 1)}
                  disabled={i === 0}
                  aria-label={`Move ${s} up`}
                  className="text-[10px] leading-none disabled:opacity-25"
                >
                  ▲
                </button>
                <button
                  onClick={() => move(i, i + 1)}
                  disabled={i === ranked.length - 1}
                  aria-label={`Move ${s} down`}
                  className="text-[10px] leading-none disabled:opacity-25"
                >
                  ▼
                </button>
              </span>
              <button
                onClick={() => {
                  if (ranked.length <= 1) return;
                  setRanked((p) => p.filter((v) => v !== s));
                  setExcluded((p) => [...p, s]);
                }}
                disabled={ranked.length <= 1}
                aria-label={`Exclude ${s}`}
                title={ranked.length <= 1 ? "At least one style must remain" : "Exclude"}
                className="text-sm disabled:opacity-25"
                style={{ color: "rgba(245,240,232,0.6)" }}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>

        {excluded.length > 0 ? (
          <div className="space-y-2 pt-1">
            <p
              className="text-[10px] uppercase tracking-[0.18em]"
              style={{ color: "rgba(245,240,232,0.4)" }}
            >
              Excluded
            </p>
            <ul className="space-y-2">
              {excluded.map((s) => (
                <li
                  key={s}
                  className="flex items-center gap-3 px-3 py-2 text-sm"
                  style={{
                    borderRadius: 4,
                    border: "1px dashed rgba(245,240,232,0.15)",
                    color: "rgba(245,240,232,0.4)",
                  }}
                >
                  <span className="min-w-0 flex-1 truncate line-through">{s}</span>
                  <button
                    onClick={() => {
                      setExcluded((p) => p.filter((v) => v !== s));
                      setRanked((p) => [...p, s]);
                    }}
                    className="text-[11px] underline underline-offset-4"
                  >
                    Undo
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={onSkip}
            className="text-[12px] underline underline-offset-4"
            style={{ color: "rgba(245,240,232,0.6)" }}
          >
            Skip — use auto-blend
          </button>
          <button
            onClick={() => onConfirm(ranked)}
            className="px-5 py-3 text-sm font-medium"
            style={{ backgroundColor: "#F0A500", color: "#1A1A2E", borderRadius: 4 }}
          >
            Set my blend →
          </button>
        </div>
      </div>
    </div>
  );
}
