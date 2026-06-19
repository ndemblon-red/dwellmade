import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  useStore,
  type AestheticBrief,
  type InspoImage,
  type KeepChange,
  type Stage,
} from "@/lib/store";
import { tagInspoImage } from "@/lib/tagging.functions";
import { streamImage } from "@/lib/streamImage";
import { BeforeAfter } from "@/components/BeforeAfter";
import { deriveBrief, colorsMatch } from "@/lib/brief";

export const Route = createFileRoute("/")({ component: Workspace });

const MAX_IMAGE_DIM = 1600;
const MAX_INSPO_DIM = 1024;

async function fileToDataUrl(file: File, maxDim: number): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Could not decode image"));
    i.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  if (scale === 1 && file.size < 1_000_000) return dataUrl;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.86);
}

const STAGE_ORDER: Stage[] = ["collect", "curate", "generate"];
const STAGE_LABELS: Record<Stage, { num: string; title: string; sub: string }> = {
  collect: { num: "01", title: "Collect", sub: "Room photo & references" },
  curate: { num: "02", title: "Curate", sub: "Build the aesthetic brief" },
  generate: { num: "03", title: "Generate", sub: "Apply brief to room" },
};

function Workspace() {
  const stage = useStore((s) => s.stage);
  const setStage = useStore((s) => s.setStage);
  const room = useStore((s) => s.room);
  const inspo = useStore((s) => s.inspo);
  const brief = useStore((s) => s.brief);

  const canCurate = !!room && inspo.some((i) => i.status === "ready");
  const canGenerate =
    canCurate &&
    (brief.palette.length > 0 ||
      brief.materials.length > 0 ||
      brief.furnitureStyle ||
      brief.vibe);

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans">
      <Header />
      <StageNav
        stage={stage}
        setStage={setStage}
        canCurate={canCurate}
        canGenerate={!!canGenerate}
      />
      <main className="py-10 px-6">
        <div className="max-w-7xl mx-auto">
          {stage === "collect" ? (
            <CollectStage onNext={() => canCurate && setStage("curate")} canNext={canCurate} />
          ) : stage === "curate" ? (
            <CurateStage
              onBack={() => setStage("collect")}
              onNext={() => setStage("generate")}
            />
          ) : (
            <GenerateStage onBack={() => setStage("curate")} />
          )}
        </div>
      </main>
    </div>
  );
}

// --- Header / Nav ------------------------------------------------------------

function Header() {
  return (
    <header className="py-8 px-6">
      <div className="max-w-7xl mx-auto flex items-end justify-between border-b border-zinc-950/5 pb-6">
        <div className="space-y-1">
          <h1 className="font-serif text-3xl leading-none text-balance">
            Studio <span className="italic">Syn</span>
          </h1>
          <p className="text-sm text-muted-ink max-w-[52ch] text-pretty">
            Resynthesize your room from a brief you assemble out of the references you've pinned.
          </p>
        </div>
      </div>
    </header>
  );
}

function StageNav({
  stage,
  setStage,
  canCurate,
  canGenerate,
}: {
  stage: Stage;
  setStage: (s: Stage) => void;
  canCurate: boolean;
  canGenerate: boolean;
}) {
  return (
    <div className="px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-3 gap-2 sm:gap-6 pt-2 pb-6 border-b border-zinc-950/5">
        {STAGE_ORDER.map((s) => {
          const active = stage === s;
          const enabled =
            s === "collect" ||
            (s === "curate" && canCurate) ||
            (s === "generate" && canGenerate);
          const meta = STAGE_LABELS[s];
          return (
            <button
              key={s}
              onClick={() => enabled && setStage(s)}
              disabled={!enabled}
              className={`text-left border-t pt-3 transition-colors ${
                active
                  ? "border-ink text-ink"
                  : enabled
                    ? "border-zinc-300 text-muted-ink hover:text-ink hover:border-ink/40"
                    : "border-zinc-200 text-zinc-300 cursor-not-allowed"
              }`}
            >
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[10px]">{meta.num}</span>
                <span className="font-serif text-xl">{meta.title}</span>
              </div>
              <p className="text-[11px] uppercase tracking-widest mt-1">{meta.sub}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Stage 1: Collect --------------------------------------------------------

function CollectStage({ onNext, canNext }: { onNext: () => void; canNext: boolean }) {
  const room = useStore((s) => s.room);
  const inspo = useStore((s) => s.inspo);
  const setRoom = useStore((s) => s.setRoom);
  const addInspo = useStore((s) => s.addInspo);
  const updateInspo = useStore((s) => s.updateInspo);
  const removeInspo = useStore((s) => s.removeInspo);
  const blobError = useStore((s) => s.blobError);
  const clearBlobError = useStore((s) => s.clearBlobError);
  const [error, setError] = useState<string | null>(null);

  const handleRoomUpload = useCallback(
    async (file: File) => {
      try {
        const dataUrl = await fileToDataUrl(file, MAX_IMAGE_DIM);
        setRoom(dataUrl);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      }
    },
    [setRoom],
  );

  const handleInspoUpload = useCallback(
    async (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        try {
          const dataUrl = await fileToDataUrl(file, MAX_INSPO_DIM);
          const id = addInspo({ dataUrl });
          tagInspoImage({ data: { dataUrl } })
            .then((aspects) => updateInspo(id, { status: "ready", aspects }))
            .catch((err: unknown) =>
              updateInspo(id, {
                status: "error",
                error: err instanceof Error ? err.message : "Tagging failed",
              }),
            );
        } catch (e) {
          setError(e instanceof Error ? e.message : "Upload failed");
        }
      }
    },
    [addInspo, updateInspo],
  );

  return (
    <div className="grid grid-cols-12 gap-10">
      <section className="col-span-12 lg:col-span-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-ink">
            Subject Room
          </h2>
          {room ? (
            <button
              onClick={() => setRoom(null)}
              className="text-[10px] uppercase tracking-widest font-medium underline underline-offset-4 text-muted-ink hover:text-ink"
            >
              Replace
            </button>
          ) : null}
        </div>
        <RoomPanel room={room} onUpload={handleRoomUpload} />
      </section>

      <section className="col-span-12 lg:col-span-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-ink">
            Inspiration
          </h2>
          <UploadButton onFiles={handleInspoUpload} multiple>
            Add Reference
          </UploadButton>
        </div>
        {inspo.length === 0 ? (
          <EmptyInspoState onFiles={handleInspoUpload} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {inspo.map((i) => (
              <CollectInspoTile key={i.id} inspo={i} onRemove={() => removeInspo(i.id)} />
            ))}
          </div>
        )}
      </section>

      <div className="col-span-12 flex flex-col items-center pt-6 gap-3">
        {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
        {blobError ? (
          <p className="text-[11px] text-destructive">
            {blobError}{" "}
            <button onClick={clearBlobError} className="underline underline-offset-2">
              dismiss
            </button>
          </p>
        ) : null}
        <button
          disabled={!canNext}
          onClick={onNext}
          className="bg-ink text-paper py-3 px-8 rounded-lg font-medium text-sm transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent"
        >
          Continue to Curate →
        </button>
        <p className="text-[11px] text-muted-ink">
          {canNext
            ? "Build your aesthetic brief from the references."
            : "Upload a room photo and at least one reference to continue."}
        </p>
      </div>
    </div>
  );
}

function CollectInspoTile({
  inspo,
  onRemove,
}: {
  inspo: InspoImage;
  onRemove: () => void;
}) {
  return (
    <div className="relative bg-paper ring-1 ring-black/5 rounded-lg overflow-hidden">
      <img src={inspo.dataUrl} alt="Inspiration" className="w-full aspect-square object-cover" />
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 size-6 grid place-items-center bg-paper/90 rounded-full text-xs"
        aria-label="Remove"
      >
        ×
      </button>
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
        {inspo.status === "tagging" ? (
          <span className="text-[9px] uppercase tracking-widest bg-paper/90 px-2 py-0.5 rounded">
            Reading…
          </span>
        ) : inspo.status === "error" ? (
          <span className="text-[9px] uppercase tracking-widest bg-destructive text-paper px-2 py-0.5 rounded">
            Failed
          </span>
        ) : inspo.aspects ? (
          <div className="flex gap-0.5 h-2.5 flex-1 rounded-sm overflow-hidden ring-1 ring-black/10">
            {inspo.aspects.palette.slice(0, 6).map((c, i) => (
              <span key={i} className="flex-1" style={{ backgroundColor: c }} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// --- Stage 2: Curate ---------------------------------------------------------

function CurateStage({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const inspo = useStore((s) => s.inspo);
  const brief = useStore((s) => s.brief);
  const patchBrief = useStore((s) => s.patchBrief);
  const togglePaletteColor = useStore((s) => s.togglePaletteColor);
  const addPaletteColor = useStore((s) => s.addPaletteColor);
  const removePaletteColor = useStore((s) => s.removePaletteColor);
  const resetBriefFromInspo = useStore((s) => s.resetBriefFromInspo);

  const { conflicts } = useMemo(() => deriveBrief(inspo), [inspo]);

  // For each selected brief color, count how many image swatches across all
  // tagged references it matches — used to render the "×N" multiplicity badge.
  const allInspoSwatches = useMemo(
    () =>
      inspo
        .filter((i) => i.status === "ready" && i.aspects)
        .flatMap((i) => i.aspects!.palette),
    [inspo],
  );
  const countFor = useCallback(
    (hex: string) =>
      allInspoSwatches.reduce((n, c) => (colorsMatch(c, hex) ? n + 1 : n), 0),
    [allInspoSwatches],
  );

  return (
    <div className="grid grid-cols-12 gap-10">
      <section className="col-span-12 lg:col-span-7 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-ink">
            Moodboard
          </h2>
          <span className="text-[10px] uppercase tracking-widest text-muted-ink">
            {inspo.filter((i) => i.status === "ready").length} tagged ·{" "}
            <span className="text-ink">click swatches to build palette</span>
          </span>
        </div>
        <Moodboard
          inspo={inspo}
          selected={brief.palette}
          onToggle={togglePaletteColor}
        />
      </section>

      <section className="col-span-12 lg:col-span-5 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-ink">
            Aesthetic Brief
          </h2>
          <button
            onClick={resetBriefFromInspo}
            className="text-[10px] uppercase tracking-widest underline underline-offset-4 text-muted-ink hover:text-ink"
            title="Re-derive materials, furniture style, and vibe from references (palette is kept)"
          >
            Re-derive
          </button>
        </div>
        <BriefEditor
          brief={brief}
          patch={patchBrief}
          conflicts={conflicts}
          onAddColor={addPaletteColor}
          onRemoveColor={removePaletteColor}
          countFor={countFor}
        />
      </section>

      <div className="col-span-12 flex justify-between items-center pt-4">
        <button
          onClick={onBack}
          className="text-[11px] uppercase tracking-widest underline underline-offset-4 text-muted-ink hover:text-ink"
        >
          ← Back to Collect
        </button>
        <button
          onClick={onNext}
          className="bg-ink text-paper py-3 px-8 rounded-lg font-medium text-sm hover:bg-accent"
        >
          Continue to Generate →
        </button>
      </div>
    </div>
  );
}

function Moodboard({
  inspo,
  selected,
  onToggle,
}: {
  inspo: InspoImage[];
  selected: string[];
  onToggle: (hex: string) => void;
}) {
  const ready = inspo.filter((i) => i.dataUrl);
  const isSelected = (hex: string) => selected.some((c) => colorsMatch(c, hex));
  if (ready.length === 0) {
    return (
      <div className="aspect-[4/3] bg-paper ring-1 ring-black/5 rounded-xl grid place-items-center">
        <p className="text-muted-ink italic font-serif text-xl">No references yet.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {ready.map((i, idx) => (
        <figure
          key={i.id}
          className={`bg-paper ring-1 ring-black/5 rounded-lg overflow-hidden ${
            idx % 3 === 0 ? "sm:row-span-2" : ""
          }`}
        >
          <img
            src={i.dataUrl}
            alt="Reference"
            className={`w-full object-cover ${idx % 3 === 0 ? "aspect-[3/4]" : "aspect-square"}`}
          />
          {i.aspects?.palette?.length ? (
            <div className="flex gap-1 p-1.5 bg-paper">
              {i.aspects.palette.slice(0, 6).map((c, n) => {
                const sel = isSelected(c);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onToggle(c)}
                    title={sel ? `${c} — selected (click to remove)` : `${c} — click to add to brief`}
                    className={`group relative flex-1 h-6 rounded-sm transition-all ${
                      sel
                        ? "ring-2 ring-ink ring-offset-1 ring-offset-paper -translate-y-0.5 shadow-sm"
                        : "ring-1 ring-black/10 hover:-translate-y-0.5 hover:ring-ink/40"
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {sel ? (
                      <span className="absolute inset-0 grid place-items-center text-[10px] leading-none text-paper drop-shadow-sm">
                        ✓
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </figure>
      ))}
    </div>
  );
}

function BriefEditor({
  brief,
  patch,
  conflicts,
  onAddColor,
  onRemoveColor,
  countFor,
}: {
  brief: AestheticBrief;
  patch: (p: Partial<Omit<AestheticBrief, "userEdited">>) => void;
  conflicts: { styles: string[]; paletteDiverges: boolean };
  onAddColor: (hex: string) => void;
  onRemoveColor: (hex: string) => void;
  countFor: (hex: string) => number;
}) {
  return (
    <div className="bg-paper ring-1 ring-black/5 rounded-xl p-6 space-y-7">
      {/* Palette */}
      <div className="space-y-3">
        <Label
          title="Palette"
          hint={conflicts.paletteDiverges ? "References diverge — pick deliberately." : null}
        />
        <BriefPalette
          palette={brief.palette}
          onAdd={onAddColor}
          onRemove={onRemoveColor}
          countFor={countFor}
        />
      </div>

      {/* Materials */}
      <div className="space-y-3">
        <Label title="Materials" />
        <ChipList
          values={brief.materials}
          onChange={(materials) => patch({ materials })}
          placeholder="Add a material (e.g. oak)"
        />
      </div>

      {/* Furniture style */}
      <div className="space-y-3">
        <Label
          title="Furniture style"
          hint={
            conflicts.styles.length > 1
              ? `${conflicts.styles.length} conflicting styles detected — your selection overrides.`
              : null
          }
        />
        <input
          value={brief.furnitureStyle}
          onChange={(e) => patch({ furnitureStyle: e.target.value })}
          placeholder="e.g. mid-century lounge blended with japandi"
          className="w-full bg-canvas/70 ring-1 ring-black/5 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-ink/40"
        />
        {conflicts.styles.length > 1 ? (
          <div className="flex flex-wrap gap-1.5">
            {conflicts.styles.map((s) => (
              <button
                key={s}
                onClick={() => patch({ furnitureStyle: s })}
                className="text-[10px] px-2 py-0.5 rounded-full ring-1 ring-black/10 bg-zinc-100 hover:ring-ink/40"
              >
                use “{s}”
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Vibe */}
      <div className="space-y-3">
        <Label title="Vibe" />
        <textarea
          value={brief.vibe}
          onChange={(e) => patch({ vibe: e.target.value })}
          rows={3}
          placeholder="One sentence describing the overall feeling."
          className="w-full bg-canvas/70 ring-1 ring-black/5 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-ink/40"
        />
      </div>
    </div>
  );
}

function Label({ title, hint }: { title: string; hint?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-medium uppercase tracking-widest text-muted-ink">
        {title}
      </span>
      {hint ? (
        <span
          className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 ring-1 ring-amber-300/40"
          title={hint}
        >
          ⚠ conflict
        </span>
      ) : null}
    </div>
  );
}

function PaletteEditor({
  palette,
  onChange,
}: {
  palette: string[];
  onChange: (p: string[]) => void;
}) {
  const [draft, setDraft] = useState("#");
  const replace = (idx: number, hex: string) => {
    const next = [...palette];
    next[idx] = hex;
    onChange(next);
  };
  const remove = (idx: number) => onChange(palette.filter((_, i) => i !== idx));
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= palette.length) return;
    const next = [...palette];
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };
  const add = () => {
    if (!/^#[0-9a-fA-F]{6}$/.test(draft)) return;
    if (palette.length >= 8) return;
    onChange([...palette, draft.toLowerCase()]);
    setDraft("#");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {palette.map((c, i) => (
          <div key={i} className="group relative">
            <label className="block size-10 rounded-md ring-1 ring-black/10 cursor-pointer overflow-hidden">
              <span className="block size-full" style={{ backgroundColor: c }} />
              <input
                type="color"
                value={c}
                onChange={(e) => replace(i, e.target.value)}
                className="sr-only"
              />
            </label>
            <div className="absolute inset-x-0 -bottom-5 hidden group-hover:flex justify-between text-[10px] text-muted-ink">
              <button onClick={() => move(i, -1)} title="Move left">‹</button>
              <button onClick={() => remove(i)} title="Remove" className="text-destructive">×</button>
              <button onClick={() => move(i, 1)} title="Move right">›</button>
            </div>
          </div>
        ))}
        {palette.length === 0 ? (
          <span className="text-[11px] italic text-muted-ink">No swatches yet.</span>
        ) : null}
      </div>
      <div className="flex gap-2 items-center pt-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="#hex"
          className="bg-canvas/70 ring-1 ring-black/5 rounded-md px-2 py-1 text-xs w-24 font-mono"
        />
        <button
          onClick={add}
          className="text-[10px] uppercase tracking-widest underline underline-offset-4 text-muted-ink hover:text-ink"
        >
          Add swatch
        </button>
      </div>
    </div>
  );
}

function ChipList({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const remove = (v: string) => onChange(values.filter((x) => x !== v));
  const add = () => {
    const t = draft.trim().toLowerCase();
    if (!t || values.includes(t)) return;
    onChange([...values, t]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <button
            key={v}
            onClick={() => remove(v)}
            className="text-[11px] px-2.5 py-1 rounded-full bg-ink text-paper ring-1 ring-ink hover:opacity-90"
            title="Click to remove"
          >
            {v} <span className="opacity-60">×</span>
          </button>
        ))}
        {values.length === 0 ? (
          <span className="text-[11px] italic text-muted-ink">No chips yet.</span>
        ) : null}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-canvas/70 ring-1 ring-black/5 rounded-md px-2 py-1 text-xs"
        />
        <button
          onClick={add}
          className="text-[10px] uppercase tracking-widest underline underline-offset-4 text-muted-ink hover:text-ink"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// --- Stage 3: Generate -------------------------------------------------------

function GenerateStage({ onBack }: { onBack: () => void }) {
  const room = useStore((s) => s.room);
  const inspo = useStore((s) => s.inspo);
  const brief = useStore((s) => s.brief);
  const keepChange = useStore((s) => s.keepChange);
  const notes = useStore((s) => s.notes);
  const generations = useStore((s) => s.generations);
  const activeGenerationId = useStore((s) => s.activeGenerationId);
  const setKeepChange = useStore((s) => s.setKeepChange);
  const setNotes = useStore((s) => s.setNotes);
  const startGeneration = useStore((s) => s.startGeneration);
  const updateGeneration = useStore((s) => s.updateGeneration);
  const removeGeneration = useStore((s) => s.removeGeneration);
  const blobError = useStore((s) => s.blobError);
  const clearBlobError = useStore((s) => s.clearBlobError);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeGen =
    generations.find((g) => g.id === activeGenerationId) ?? generations[0];

  const briefIsEmpty =
    brief.palette.length === 0 &&
    brief.materials.length === 0 &&
    !brief.furnitureStyle &&
    !brief.vibe;

  const handleGenerate = useCallback(async () => {
    if (!room || generating || briefIsEmpty) return;
    setError(null);
    setGenerating(true);
    const id = crypto.randomUUID();
    const parts: string[] = [];
    if (brief.furnitureStyle) parts.push(brief.furnitureStyle);
    if (brief.palette.length) parts.push(`${brief.palette.length} swatches`);
    if (brief.materials.length) parts.push(`${brief.materials.length} materials`);
    parts.push(
      `${Object.values(keepChange).filter((v) => v === "keep").length} preserved`,
    );
    startGeneration(id, parts.join(" · "));

    try {
      await streamImage(
        "/api/generate",
        {
          room: room.dataUrl,
          inspo: inspo
            .filter((i) => i.status === "ready" && i.dataUrl)
            .slice(0, 3)
            .map((i) => i.dataUrl),
          brief: {
            palette: brief.palette,
            materials: brief.materials,
            furnitureStyle: brief.furnitureStyle,
            vibe: brief.vibe,
          },
          keepChange,
          notes,
        },
        (dataUrl, isFinal) => updateGeneration(id, dataUrl, isFinal),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
      removeGeneration(id);
    } finally {
      setGenerating(false);
    }
  }, [
    room,
    inspo,
    brief,
    keepChange,
    notes,
    generating,
    briefIsEmpty,
    startGeneration,
    updateGeneration,
    removeGeneration,
  ]);

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-12 gap-10">
        <section className="col-span-12 lg:col-span-7 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-ink">
            The Brief
          </h2>
          <BriefSummary brief={brief} />
        </section>

        <section className="col-span-12 lg:col-span-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-ink">
            Constraints
          </h2>
          <ControlsPanel
            keepChange={keepChange}
            setKeepChange={setKeepChange}
            notes={notes}
            setNotes={setNotes}
          />
        </section>
      </div>

      <div className="flex flex-col items-center gap-3">
        {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
        {blobError ? (
          <p className="text-[11px] text-destructive">
            {blobError}{" "}
            <button onClick={clearBlobError} className="underline underline-offset-2">
              dismiss
            </button>
          </p>
        ) : null}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="text-[11px] uppercase tracking-widest underline underline-offset-4 text-muted-ink hover:text-ink"
          >
            ← Back to Curate
          </button>
          <button
            disabled={!room || generating || briefIsEmpty}
            onClick={handleGenerate}
            className="bg-ink text-paper py-3 px-8 rounded-lg font-medium text-sm transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent"
          >
            {generating ? "Synthesizing…" : "Generate Synthesis"}
          </button>
        </div>
      </div>

      {activeGen ? (
        <ResultSection
          before={room?.dataUrl ?? ""}
          gen={activeGen}
          history={generations}
          onSelect={(id) => useStore.setState({ activeGenerationId: id })}
          onRemove={removeGeneration}
        />
      ) : null}
    </div>
  );
}

function BriefSummary({ brief }: { brief: AestheticBrief }) {
  return (
    <div className="bg-paper ring-1 ring-black/5 rounded-xl p-6 space-y-5">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-ink mb-2">
          Palette
        </p>
        {brief.palette.length ? (
          <div className="flex gap-1">
            {brief.palette.map((c) => (
              <span
                key={c}
                className="size-8 rounded-md ring-1 ring-black/10"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        ) : (
          <p className="italic text-muted-ink text-sm">None set.</p>
        )}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-ink mb-2">
          Materials
        </p>
        <p className="text-sm">{brief.materials.join(" · ") || <span className="italic text-muted-ink">None set.</span>}</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-ink mb-2">
          Furniture style
        </p>
        <p className="text-sm">{brief.furnitureStyle || <span className="italic text-muted-ink">None set.</span>}</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-ink mb-2">
          Vibe
        </p>
        <p className="text-sm font-serif italic">{brief.vibe || <span className="not-italic font-sans text-muted-ink">None set.</span>}</p>
      </div>
    </div>
  );
}

// --- Reused atoms ------------------------------------------------------------

function RoomPanel({
  room,
  onUpload,
}: {
  room: { dataUrl: string; uploadedAt: number } | null;
  onUpload: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  if (room) {
    return (
      <div className="relative group">
        <img
          src={room.dataUrl}
          alt="The room you're redesigning"
          className="w-full aspect-[3/2] object-cover rounded-md outline-1 -outline-offset-1 outline-black/5"
        />
        <span className="absolute top-3 right-3 text-[10px] bg-zinc-200 px-2 py-0.5 rounded uppercase font-medium">
          Source
        </span>
      </div>
    );
  }
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onUpload(file);
      }}
      onClick={() => inputRef.current?.click()}
      className={`w-full aspect-[3/2] rounded-md outline-1 -outline-offset-1 outline-black/5 grid place-items-center cursor-pointer transition-colors ${
        dragging ? "bg-zinc-100 outline-ink" : "bg-zinc-200/60 hover:bg-zinc-200"
      }`}
    >
      <div className="text-center space-y-2 px-6">
        <p className="font-serif text-2xl italic">Drop your room here</p>
        <p className="text-[11px] uppercase tracking-widest text-muted-ink">
          or click to choose a photo
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
        }}
      />
    </div>
  );
}

function ControlsPanel({
  keepChange,
  setKeepChange,
  notes,
  setNotes,
}: {
  keepChange: KeepChange;
  setKeepChange: (k: keyof KeepChange, v: "keep" | "change") => void;
  notes: string;
  setNotes: (s: string) => void;
}) {
  const rows: Array<{ key: keyof KeepChange; label: string }> = [
    { key: "walls", label: "Walls & surfaces" },
    { key: "flooring", label: "Flooring" },
    { key: "furniture", label: "Major furniture" },
    { key: "decor", label: "Decor & lighting" },
  ];
  return (
    <div className="bg-paper ring-1 ring-black/5 p-6 rounded-xl space-y-6">
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between text-sm">
            <span>{r.label}</span>
            <KeepChangeToggle
              value={keepChange[r.key]}
              onChange={(v) => setKeepChange(r.key, v)}
            />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-medium text-muted-ink uppercase tracking-widest">
          Additional notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. keep the kids' play corner; lean cosier than the references."
          rows={4}
          className="w-full bg-canvas/70 ring-1 ring-black/5 rounded-md p-3 text-sm font-sans resize-none focus:outline-none focus:ring-ink/40"
        />
      </div>
    </div>
  );
}

function KeepChangeToggle({
  value,
  onChange,
}: {
  value: "keep" | "change";
  onChange: (v: "keep" | "change") => void;
}) {
  return (
    <div className="flex bg-zinc-200/70 p-0.5 rounded-md">
      {(["keep", "change"] as const).map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1 text-[10px] uppercase tracking-widest font-medium rounded-sm transition-colors ${
            value === opt ? "bg-paper text-ink shadow-sm" : "text-muted-ink hover:text-ink"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function UploadButton({
  children,
  onFiles,
  multiple = false,
}: {
  children: React.ReactNode;
  onFiles: (files: FileList) => void;
  multiple?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        onClick={() => ref.current?.click()}
        className="text-xs font-medium underline underline-offset-4 hover:text-ink"
      >
        {children}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) onFiles(e.target.files);
          e.currentTarget.value = "";
        }}
      />
    </>
  );
}

function EmptyInspoState({ onFiles }: { onFiles: (files: FileList) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
      }}
      onClick={() => ref.current?.click()}
      className={`w-full aspect-[3/2] rounded-md ring-1 ring-black/5 bg-paper grid place-items-center cursor-pointer transition-colors ${
        dragging ? "bg-zinc-100" : "hover:bg-zinc-50"
      }`}
    >
      <div className="text-center px-6">
        <p className="font-serif text-2xl italic mb-2">Pin your references</p>
        <p className="text-[11px] uppercase tracking-widest text-muted-ink">
          Drop Pinterest screenshots, photos, anything. We'll tag each one.
        </p>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}

function ResultSection({
  before,
  gen,
  history,
  onSelect,
  onRemove,
}: {
  before: string;
  gen: import("@/lib/store").Generation;
  history: import("@/lib/store").Generation[];
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section className="py-12 px-0">
      <div className="space-y-8">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-serif text-4xl">Latest Synthesis</h2>
            <p className="text-xs uppercase tracking-widest text-muted-ink mt-2">
              {gen.promptSummary}
              {!gen.isFinal && gen.dataUrl ? " · rendering" : ""}
            </p>
          </div>
          {gen.isFinal && gen.dataUrl ? (
            <a
              href={gen.dataUrl}
              download={`studio-syn-${gen.id.slice(0, 8)}.png`}
              className="text-[10px] uppercase tracking-widest font-medium underline underline-offset-4"
            >
              Download
            </a>
          ) : null}
        </div>

        {gen.dataUrl ? (
          <BeforeAfter
            beforeSrc={before}
            afterSrc={gen.dataUrl}
            afterBlurred={!gen.isFinal}
          />
        ) : (
          <div className="w-full aspect-[3/2] bg-zinc-200 rounded-md grid place-items-center">
            <p className="text-[11px] uppercase tracking-widest text-muted-ink animate-pulse">
              Waiting for first frame…
            </p>
          </div>
        )}

        {history.length > 1 ? (
          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-widest text-muted-ink">
              Session history
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-3">
              {history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => onSelect(h.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onRemove(h.id);
                  }}
                  className={`relative aspect-square bg-zinc-200 rounded-sm overflow-hidden ring-1 transition-all ${
                    h.id === gen.id ? "ring-ink" : "ring-black/5 hover:ring-ink/30"
                  }`}
                  title="Click to view, right-click to remove"
                >
                  {h.dataUrl ? (
                    <img
                      src={h.dataUrl}
                      alt="Generation"
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="size-full animate-pulse bg-zinc-300" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
