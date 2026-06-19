import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { deleteBlob, getBlob, newBlobId, setBlob } from "./blobStore";

export type ImageAspects = {
  palette: string[]; // hex colors
  materials: string[];
  furnitureStyle: string;
  lightingMood: string;
  vibe: string;
};

export type InspoImage = {
  id: string;
  blobId: string;
  dataUrl: string;
  status: "tagging" | "ready" | "error";
  aspects?: ImageAspects;
  error?: string;
};

export type KeepChange = {
  walls: "keep" | "change";
  flooring: "keep" | "change";
  furniture: "keep" | "change";
  decor: "keep" | "change";
};

export type AestheticBrief = {
  palette: string[];
  materials: string[];
  furnitureStyle: string;
  vibe: string;
  /** True once the user has manually edited any brief field. Prevents
   *  auto-derivation from overwriting their choices when new inspo lands. */
  userEdited: boolean;
};

export type Stage = "collect" | "curate" | "generate";

export type Generation = {
  id: string;
  blobId?: string;
  createdAt: number;
  dataUrl: string;
  isFinal: boolean;
  promptSummary: string;
};

type Room = { dataUrl: string; blobId: string; uploadedAt: number };

const MAX_HISTORY = 5;

const EMPTY_BRIEF: AestheticBrief = {
  palette: [],
  materials: [],
  furnitureStyle: "",
  vibe: "",
  userEdited: false,
};

type State = {
  stage: Stage;
  room: Room | null;
  inspo: InspoImage[];
  brief: AestheticBrief;
  keepChange: KeepChange;
  notes: string;
  generations: Generation[];
  activeGenerationId: string | null;
  blobError: string | null;

  setStage: (s: Stage) => void;
  setRoom: (dataUrl: string | null) => void;
  addInspo: (image: { dataUrl: string }) => string;
  updateInspo: (id: string, patch: Partial<InspoImage>) => void;
  removeInspo: (id: string) => void;
  setBrief: (b: AestheticBrief) => void;
  patchBrief: (p: Partial<Omit<AestheticBrief, "userEdited">>) => void;
  resetBriefFromInspo: () => void;
  setKeepChange: (k: keyof KeepChange, v: "keep" | "change") => void;
  setNotes: (s: string) => void;
  startGeneration: (id: string, promptSummary: string) => void;
  updateGeneration: (id: string, dataUrl: string, isFinal: boolean) => void;
  removeGeneration: (id: string) => void;
  clearBlobError: () => void;
};

const DEFAULT_KEEP_CHANGE: KeepChange = {
  walls: "change",
  flooring: "keep",
  furniture: "keep",
  decor: "change",
};

async function trySetBlob(
  id: string,
  dataUrl: string,
  onError: (msg: string) => void,
): Promise<boolean> {
  try {
    await setBlob(id, dataUrl);
    return true;
  } catch (err) {
    const msg =
      err instanceof DOMException && err.name === "QuotaExceededError"
        ? "Storage full — remove some inspiration images or older generations."
        : err instanceof Error
          ? err.message
          : "Could not save image to local storage.";
    onError(msg);
    return false;
  }
}

/** Lazy import to avoid a circular type dep at module load.
 *  Note: palette is NEVER auto-derived — users build it by clicking
 *  per-image swatches in the moodboard. We only refresh materials,
 *  furnitureStyle, and vibe (and only if the user has not edited the brief). */
async function autoDerive(set: (p: Partial<State>) => void, get: () => State) {
  const { brief, inspo } = get();
  if (brief.userEdited) return;
  const ready = inspo.filter((i) => i.status === "ready" && i.aspects);
  if (ready.length === 0) {
    set({ brief: { ...EMPTY_BRIEF, palette: brief.palette } });
    return;
  }
  const { deriveBrief } = await import("./brief");
  const { brief: derived } = deriveBrief(inspo);
  set({ brief: { ...derived, palette: brief.palette, userEdited: false } });
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      stage: "collect",
      room: null,
      inspo: [],
      brief: EMPTY_BRIEF,
      keepChange: DEFAULT_KEEP_CHANGE,
      notes: "",
      generations: [],
      activeGenerationId: null,
      blobError: null,

      setStage: (stage) => set({ stage }),

      setRoom: (dataUrl) => {
        const prev = get().room;
        if (prev) void deleteBlob(prev.blobId);
        if (!dataUrl) {
          set({ room: null });
          return;
        }
        const blobId = newBlobId();
        set({
          room: { dataUrl, blobId, uploadedAt: Date.now() },
          blobError: null,
        });
        void trySetBlob(blobId, dataUrl, (msg) => set({ blobError: msg }));
      },

      addInspo: ({ dataUrl }) => {
        const id = crypto.randomUUID();
        const blobId = newBlobId();
        set((s) => ({
          inspo: [
            ...s.inspo,
            { id, blobId, dataUrl, status: "tagging" },
          ],
          blobError: null,
        }));
        void trySetBlob(blobId, dataUrl, (msg) => set({ blobError: msg }));
        return id;
      },

      updateInspo: (id, patch) => {
        set((s) => ({
          inspo: s.inspo.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        }));
        // If the patch flips status to "ready", refresh the derived brief.
        if (patch.status === "ready") {
          void autoDerive((p) => set(p as Partial<State>), get);
        }
      },

      removeInspo: (id) => {
        const target = get().inspo.find((i) => i.id === id);
        if (target) void deleteBlob(target.blobId);
        set((s) => ({ inspo: s.inspo.filter((i) => i.id !== id) }));
        void autoDerive((p) => set(p as Partial<State>), get);
      },

      setBrief: (brief) => set({ brief: { ...brief, userEdited: true } }),
      patchBrief: (p) =>
        set((s) => ({ brief: { ...s.brief, ...p, userEdited: true } })),
      resetBriefFromInspo: () => {
        set({ brief: { ...EMPTY_BRIEF } });
        void autoDerive((p) => set(p as Partial<State>), get);
      },

      setKeepChange: (k, v) =>
        set((s) => ({ keepChange: { ...s.keepChange, [k]: v } })),

      setNotes: (notes) => set({ notes }),

      startGeneration: (id, promptSummary) =>
        set((s) => ({
          activeGenerationId: id,
          generations: [
            { id, createdAt: Date.now(), dataUrl: "", isFinal: false, promptSummary },
            ...s.generations,
          ],
        })),

      updateGeneration: (id, dataUrl, isFinal) => {
        set((s) => ({
          generations: s.generations.map((g) =>
            g.id === id ? { ...g, dataUrl, isFinal } : g,
          ),
        }));
        if (!isFinal) return;
        const blobId = newBlobId();
        void trySetBlob(blobId, dataUrl, (msg) => set({ blobError: msg })).then(
          (ok) => {
            if (!ok) return;
            set((s) => {
              const updated = s.generations.map((g) =>
                g.id === id ? { ...g, blobId } : g,
              );
              const finals = updated.filter((g) => g.isFinal);
              const pending = updated.filter((g) => !g.isFinal);
              const keepFinals = finals.slice(0, MAX_HISTORY);
              const evicted = finals.slice(MAX_HISTORY);
              for (const e of evicted) {
                if (e.blobId) void deleteBlob(e.blobId);
              }
              return { generations: [...pending, ...keepFinals] };
            });
          },
        );
      },

      removeGeneration: (id) => {
        const target = get().generations.find((g) => g.id === id);
        if (target?.blobId) void deleteBlob(target.blobId);
        set((s) => ({
          generations: s.generations.filter((g) => g.id !== id),
          activeGenerationId:
            s.activeGenerationId === id ? null : s.activeGenerationId,
        }));
      },

      clearBlobError: () => set({ blobError: null }),
    }),
    {
      name: "studio-syn-session",
      version: 3,
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
            length: 0,
            clear: () => {},
            key: () => null,
          } satisfies Storage;
        }
        return window.sessionStorage;
      }),
      partialize: (s) => ({
        stage: s.stage,
        room: s.room
          ? { blobId: s.room.blobId, uploadedAt: s.room.uploadedAt }
          : null,
        inspo: s.inspo.map((i) => ({
          id: i.id,
          blobId: i.blobId,
          status: i.status,
          aspects: i.aspects,
          error: i.error,
        })),
        brief: s.brief,
        keepChange: s.keepChange,
        notes: s.notes,
        generations: s.generations
          .filter((g) => g.isFinal && g.blobId)
          .map((g) => ({
            id: g.id,
            blobId: g.blobId,
            createdAt: g.createdAt,
            isFinal: true,
            promptSummary: g.promptSummary,
          })),
        activeGenerationId: s.activeGenerationId,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state || typeof window === "undefined") return;
        void (async () => {
          const patches: Partial<State> = {};
          if (state.room?.blobId) {
            const dataUrl = await getBlob(state.room.blobId);
            patches.room = dataUrl ? { ...state.room, dataUrl } : null;
          }
          const inspoWithBlobs = await Promise.all(
            (state.inspo ?? []).map(async (i) => {
              const dataUrl = (await getBlob(i.blobId)) ?? "";
              return { ...i, dataUrl } as InspoImage;
            }),
          );
          patches.inspo = inspoWithBlobs.filter((i) => i.dataUrl);
          const gensWithBlobs = await Promise.all(
            (state.generations ?? []).map(async (g) => {
              if (!g.blobId) return { ...g, dataUrl: "" };
              const dataUrl = (await getBlob(g.blobId)) ?? "";
              return { ...g, dataUrl };
            }),
          );
          patches.generations = gensWithBlobs.filter((g) => g.dataUrl);
          useStore.setState(patches as Partial<State>);
        })();
      },
      migrate: () => ({
        stage: "collect" as Stage,
        room: null,
        inspo: [],
        brief: { ...EMPTY_BRIEF },
        keepChange: DEFAULT_KEEP_CHANGE,
        notes: "",
        generations: [],
        activeGenerationId: null,
        blobError: null,
      }) as unknown as State,
    },
  ),
);
