import type { InspoImage, AestheticBrief } from "./store";

export const NOTES_MAX_LENGTH = 280;

const INJECTION_PATTERNS: RegExp[] = [
  /ignore previous instructions/i,
  /ignore the above/i,
  /disregard/i,
  /system prompt/i,
  /you are now/i,
  /new instructions/i,
  /act as/i,
  /pretend you are/i,
];

export function notesLookSuspicious(notes: string): boolean {
  if (!notes) return false;
  return INJECTION_PATTERNS.some((re) => re.test(notes));
}



// --- Color utilities ---------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbDist(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2,
  );
}

function normalizeHex(hex: string): string | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return (
    "#" +
    rgb
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
      .toLowerCase()
  );
}

/** Cluster similar hex colors, returning up to `max` representative swatches. */
export function dedupePalette(hexes: string[], max = 6): string[] {
  const out: Array<{ hex: string; rgb: [number, number, number]; count: number }> = [];
  for (const raw of hexes) {
    const hex = normalizeHex(raw);
    if (!hex) continue;
    const rgb = hexToRgb(hex)!;
    const near = out.find((o) => rgbDist(o.rgb, rgb) < 28);
    if (near) {
      near.count += 1;
    } else {
      out.push({ hex, rgb, count: 1 });
    }
  }
  return out
    .sort((a, b) => b.count - a.count)
    .slice(0, max)
    .map((o) => o.hex);
}

/** Significant palette divergence if average pairwise dominant-color distance is high. */
function palettesDiverge(palettes: string[][]): boolean {
  if (palettes.length < 2) return false;
  const firsts = palettes
    .map((p) => (p[0] ? hexToRgb(p[0]) : null))
    .filter((v): v is [number, number, number] => !!v);
  if (firsts.length < 2) return false;
  let total = 0;
  let n = 0;
  for (let i = 0; i < firsts.length; i++) {
    for (let j = i + 1; j < firsts.length; j++) {
      total += rgbDist(firsts[i], firsts[j]);
      n += 1;
    }
  }
  return n > 0 && total / n > 120;
}

// --- Derivation -------------------------------------------------------------

export type BriefConflicts = {
  styles: string[]; // distinct furniture styles seen across images
  paletteDiverges: boolean;
};

function rankByFrequency(values: string[], max: number): string[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    const key = v.trim().toLowerCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([k]) => k);
}

export function deriveBrief(inspo: InspoImage[]): {
  brief: AestheticBrief;
  conflicts: BriefConflicts;
} {
  const ready = inspo.filter((i) => i.status === "ready" && i.aspects);
  const materials = rankByFrequency(
    ready.flatMap((i) => i.aspects!.materials),
    8,
  );
  const styles = [
    ...new Set(
      ready
        .map((i) => i.aspects!.furnitureStyle.trim())
        .filter(Boolean),
    ),
  ];
  const furnitureStyle =
    styles.length === 0
      ? ""
      : styles.length === 1
        ? styles[0]
        : `${styles[0]} blended with ${styles.slice(1).join(" & ")}`;

  const vibes = ready.map((i) => i.aspects!.vibe.trim()).filter(Boolean);
  const vibe =
    vibes.length === 0
      ? ""
      : vibes.length === 1
        ? vibes[0]
        : vibes.join(" Combined with: ");

  const conflicts: BriefConflicts = {
    styles: styles.length > 1 ? styles : [],
    paletteDiverges: palettesDiverge(ready.map((i) => i.aspects!.palette)),
  };

  // Palette is intentionally empty: users build it by clicking
  // per-image swatches in the moodboard.
  return {
    brief: { palette: [], materials, furnitureStyle, vibe, userEdited: false },
    conflicts,
  };
}

/** Two hex colors match perceptually (RGB distance below threshold). */
export function colorsMatch(a: string, b: string): boolean {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return false;
  return rgbDist(ra, rb) < 28;
}
