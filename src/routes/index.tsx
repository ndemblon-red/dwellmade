import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { useStore, type KeepChange } from "@/lib/store";
import { tagInspoImage } from "@/lib/tagging.functions";
import { streamImage } from "@/lib/streamImage";
import { BeforeAfter } from "@/components/BeforeAfter";

export const Route = createFileRoute("/")({
  component: Workspace,
});

const MAX_IMAGE_DIM = 1600;
const MAX_INSPO_DIM = 1024;

async function fileToDataUrl(file: File, maxDim: number): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
  // Downscale via canvas to keep payloads reasonable.
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

function Workspace() {
  const room = useStore((s) => s.room);
  const inspo = useStore((s) => s.inspo);
  const keepChange = useStore((s) => s.keepChange);
  const notes = useStore((s) => s.notes);
  const generations = useStore((s) => s.generations);
  const activeGenerationId = useStore((s) => s.activeGenerationId);
  const blobError = useStore((s) => s.blobError);
  const clearBlobError = useStore((s) => s.clearBlobError);

  const setRoom = useStore((s) => s.setRoom);
  const addInspo = useStore((s) => s.addInspo);
  const updateInspo = useStore((s) => s.updateInspo);
  const removeInspo = useStore((s) => s.removeInspo);
  const toggleAspect = useStore((s) => s.toggleAspect);
  const setInfluence = useStore((s) => s.setInfluence);
  const setKeepChange = useStore((s) => s.setKeepChange);
  const setNotes = useStore((s) => s.setNotes);
  const startGeneration = useStore((s) => s.startGeneration);
  const updateGeneration = useStore((s) => s.updateGeneration);
  const removeGeneration = useStore((s) => s.removeGeneration);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeGen = generations.find((g) => g.id === activeGenerationId) ?? generations[0];

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
            .then((aspects) =>
              updateInspo(id, { status: "ready", aspects }),
            )
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

  const canGenerate = !!room && inspo.some((i) => i.status === "ready" && i.influence > 0);

  const handleGenerate = useCallback(async () => {
    if (!room || generating) return;
    const activeInspo = inspo.filter((i) => i.status === "ready" && i.influence > 0);
    if (activeInspo.length === 0) {
      setError("Add at least one inspiration image and give it some influence.");
      return;
    }
    setError(null);
    setGenerating(true);
    const id = crypto.randomUUID();
    const summary = `${activeInspo.length} reference${activeInspo.length === 1 ? "" : "s"} · ${Object.entries(keepChange).filter(([, v]) => v === "keep").length} preserved`;
    startGeneration(id, summary);

    try {
      await streamImage(
        "/api/generate",
        {
          room: room.dataUrl,
          inspo: activeInspo.map((i) => ({
            dataUrl: i.dataUrl,
            influence: i.influence,
            enabled: i.enabled,
            aspects: i.aspects,
          })),
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
    keepChange,
    notes,
    generating,
    startGeneration,
    updateGeneration,
    removeGeneration,
  ]);

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans">
      <Header />

      <main className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-12 gap-12">
            {/* LEFT — Subject Room + Synthesis Controls */}
            <div className="col-span-12 lg:col-span-7 space-y-10">
              <section className="space-y-4">
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

              <ControlsPanel
                keepChange={keepChange}
                setKeepChange={setKeepChange}
                notes={notes}
                setNotes={setNotes}
              />
            </div>

            {/* RIGHT — Inspiration Board */}
            <div className="col-span-12 lg:col-span-5 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-ink">
                  Inspiration Board
                </h2>
                <UploadButton onFiles={handleInspoUpload} multiple>
                  Add Reference
                </UploadButton>
              </div>

              <div className="space-y-4">
                {inspo.length === 0 ? (
                  <EmptyInspoState onFiles={handleInspoUpload} />
                ) : (
                  inspo.map((i) => (
                    <InspoCard
                      key={i.id}
                      inspo={i}
                      onRemove={() => removeInspo(i.id)}
                      onToggleAspect={(a) => toggleAspect(i.id, a)}
                      onInfluence={(v) => setInfluence(i.id, v)}
                    />
                  ))
                )}
              </div>

              <div className="pt-8">
                <button
                  disabled={!canGenerate || generating}
                  onClick={handleGenerate}
                  className="w-full bg-ink text-paper py-4 px-6 rounded-lg font-medium text-sm transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent"
                >
                  {generating ? "Synthesizing…" : "Generate Workspace Synthesis"}
                </button>
                <p className="mt-4 text-[11px] text-muted-ink text-center tracking-tight">
                  {generating
                    ? "Holding the room steady while the references blend in."
                    : canGenerate
                      ? `Synthesis utilizes ${inspo.filter((i) => i.status === "ready" && i.influence > 0).length} active reference${
                          inspo.filter((i) => i.status === "ready" && i.influence > 0).length === 1 ? "" : "s"
                        } and ${Object.values(keepChange).filter((v) => v === "keep").length} preservation constraints.`
                      : "Upload your room and one inspiration image to begin."}
                </p>
                {error ? (
                  <p className="mt-3 text-[11px] text-destructive text-center">{error}</p>
                ) : null}
                {blobError ? (
                  <p className="mt-3 text-[11px] text-destructive text-center">
                    {blobError}{" "}
                    <button
                      onClick={clearBlobError}
                      className="underline underline-offset-2"
                    >
                      dismiss
                    </button>
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </main>

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

function Header() {
  return (
    <header className="py-8 px-6">
      <div className="max-w-7xl mx-auto flex items-end justify-between border-b border-zinc-950/5 pb-6">
        <div className="space-y-1">
          <h1 className="font-serif text-3xl leading-none text-balance">
            Studio <span className="italic">Syn</span>
          </h1>
          <p className="text-sm text-muted-ink max-w-[52ch] text-pretty">
            Curate visual weight and material influence to resynthesize your room from the references you've pinned.
          </p>
        </div>
        <nav className="hidden md:flex gap-8 text-xs font-medium uppercase tracking-wider text-muted-ink">
          <span className="text-ink">Workspace</span>
          <span>Archive</span>
          <span>Settings</span>
        </nav>
      </div>
    </header>
  );
}

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
          Source · {new Date(room.uploadedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
    <section className="bg-paper ring-1 ring-black/5 p-8 rounded-xl">
      <h3 className="text-sm font-semibold uppercase tracking-widest mb-6">
        Synthesis Parameters
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
        <div className="space-y-4">
          <label className="text-xs font-medium text-muted-ink uppercase tracking-wider">
            Preservation
          </label>
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
        </div>
        <div className="space-y-4">
          <label className="text-xs font-medium text-muted-ink uppercase tracking-wider">
            Additional notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. keep the kids' play corner; lean cosier than the references."
            rows={5}
            className="w-full bg-canvas/70 ring-1 ring-black/5 rounded-md p-3 text-sm font-sans resize-none focus:outline-none focus:ring-ink/40"
          />
        </div>
      </div>
    </section>
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
      className={`p-10 rounded-xl ring-1 ring-black/5 bg-paper text-center cursor-pointer transition-colors ${
        dragging ? "bg-zinc-100" : "hover:bg-zinc-50"
      }`}
    >
      <p className="font-serif text-2xl italic mb-2">Pin your references</p>
      <p className="text-[11px] uppercase tracking-widest text-muted-ink">
        Drop Pinterest screenshots, photos, anything. We'll tag each one.
      </p>
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

function InspoCard({
  inspo,
  onRemove,
  onToggleAspect,
  onInfluence,
}: {
  inspo: import("@/lib/store").InspoImage;
  onRemove: () => void;
  onToggleAspect: (a: keyof import("@/lib/store").EnabledAspects) => void;
  onInfluence: (v: number) => void;
}) {
  const muted = inspo.influence === 0;
  return (
    <div
      className={`bg-paper ring-1 ring-black/5 p-4 rounded-xl space-y-4 transition-opacity ${
        muted ? "opacity-60" : ""
      }`}
    >
      <div className="flex gap-4">
        <img
          src={inspo.dataUrl}
          alt="Inspiration"
          className="size-24 shrink-0 object-cover rounded-md outline-1 -outline-offset-1 outline-black/5"
        />
        <div className="flex-1 min-w-0 space-y-2">
          {inspo.status === "tagging" ? (
            <div className="space-y-1.5">
              <div className="h-3 bg-zinc-200 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-zinc-200 rounded animate-pulse w-1/2" />
              <div className="h-3 bg-zinc-200 rounded animate-pulse w-2/3" />
              <p className="text-[10px] uppercase tracking-widest text-muted-ink pt-1">
                Reading the reference…
              </p>
            </div>
          ) : inspo.status === "error" ? (
            <p className="text-xs text-destructive">{inspo.error ?? "Tagging failed."}</p>
          ) : inspo.aspects ? (
            <>
              <p className="text-xs text-ink/80 line-clamp-2 italic font-serif">
                {inspo.aspects.vibe}
              </p>
              {inspo.aspects.palette.length > 0 ? (
                <div className="flex gap-0.5 h-3 rounded-sm overflow-hidden">
                  {inspo.aspects.palette.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => onToggleAspect("palette")}
                      className="flex-1"
                      style={{
                        backgroundColor: c,
                        opacity: inspo.enabled.palette ? 1 : 0.25,
                      }}
                      title="Palette"
                    />
                  ))}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-1 pt-1">
                <AspectChip
                  active={inspo.enabled.materials}
                  onClick={() => onToggleAspect("materials")}
                  label={inspo.aspects.materials.slice(0, 3).join(" · ") || "materials"}
                />
                <AspectChip
                  active={inspo.enabled.furnitureStyle}
                  onClick={() => onToggleAspect("furnitureStyle")}
                  label={inspo.aspects.furnitureStyle}
                />
                <AspectChip
                  active={inspo.enabled.lightingMood}
                  onClick={() => onToggleAspect("lightingMood")}
                  label={inspo.aspects.lightingMood}
                />
              </div>
            </>
          ) : null}
        </div>
        <button
          onClick={onRemove}
          className="text-[10px] uppercase tracking-widest text-muted-ink hover:text-destructive self-start"
          aria-label="Remove reference"
        >
          ×
        </button>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-medium">
          <span className="uppercase tracking-widest">Influence</span>
          <span>{inspo.influence}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={inspo.influence}
          onChange={(e) => onInfluence(Number(e.target.value))}
          disabled={inspo.status !== "ready"}
          className="w-full accent-ink"
        />
      </div>
    </div>
  );
}

function AspectChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-[10px] px-2 py-0.5 rounded-full ring-1 transition-colors max-w-[14rem] truncate ${
        active
          ? "bg-ink text-paper ring-ink"
          : "bg-zinc-100 text-muted-ink ring-black/5 hover:text-ink"
      }`}
      title={label}
    >
      {label}
    </button>
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
    <section className="py-20 px-6 bg-zinc-100/50 border-t border-zinc-950/5">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-serif text-4xl">Latest Synthesis</h2>
            <p className="text-xs uppercase tracking-widest text-muted-ink mt-2">
              {gen.promptSummary}
              {!gen.isFinal && gen.dataUrl ? " · rendering" : ""}
            </p>
          </div>
          <div className="flex gap-2 items-center">
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
