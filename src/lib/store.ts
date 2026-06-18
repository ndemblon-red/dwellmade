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

export type EnabledAspects = {
  palette: boolean;
  materials: boolean;
  furnitureStyle: boolean;
  lightingMood: boolean;
};

export type InspoImage = {
  id: string;
  blobId: string;
  // dataUrl lives in memory only; rehydrated from IndexedDB on load.
  dataUrl: string;
  status: "tagging" | "ready" | "error";
  aspects?: ImageAspects;
  enabled: EnabledAspects;
  influence: number; // 0-100
  error?: string;
};

export type KeepChange = {
  walls: "keep" | "change";
  flooring: "keep" | "change";
  furniture: "keep" | "change";
  decor: "keep" | "change";
};

export type Generation = {
  id: string;
  blobId?: string; // assigned when isFinal flips true
  createdAt: number;
  dataUrl: string; // memory only for in-flight, also memory for finals after rehydrate
  isFinal: boolean;
  promptSummary: string;
};

type Room = { dataUrl: string; blobId: string; uploadedAt: number };

const MAX_HISTORY = 5;

type State = {
  room: Room | null;
  inspo: InspoImage[];
  keepChange: KeepChange;
  notes: string;
  generations: Generation[];
  activeGenerationId: string | null;
  blobError: string | null;

  setRoom: (dataUrl: string | null) => void;
  addInspo: (image: { dataUrl: string }) => string;
  updateInspo: (id: string, patch: Partial<InspoImage>) => void;
  removeInspo: (id: string) => void;
  toggleAspect: (id: string, aspect: keyof EnabledAspects) => void;
  setInfluence: (id: string, influence: number) => void;
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

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      room: null,
      inspo: [],
      keepChange: DEFAULT_KEEP_CHANGE,
      notes: "",
      generations: [],
      activeGenerationId: null,
      blobError: null,

      setRoom: (dataUrl) => {
        const prev = get().room;
        if (prev) void deleteBlob(prev.blobId);
        if (!dataUrl) {
          set({ room: null });
          return;
        }
        const blobId = newBlobId();
        // Optimistically set in memory; persist blob async.
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
            {
              id,
              blobId,
              dataUrl,
              status: "tagging",
              influence: 70,
              enabled: {
                palette: true,
                materials: true,
                furnitureStyle: true,
                lightingMood: true,
              },
            },
          ],
          blobError: null,
        }));
        void trySetBlob(blobId, dataUrl, (msg) => set({ blobError: msg }));
        return id;
      },

      updateInspo: (id, patch) =>
        set((s) => ({
          inspo: s.inspo.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        })),

      removeInspo: (id) => {
        const target = get().inspo.find((i) => i.id === id);
        if (target) void deleteBlob(target.blobId);
        set((s) => ({ inspo: s.inspo.filter((i) => i.id !== id) }));
      },

      toggleAspect: (id, aspect) =>
        set((s) => ({
          inspo: s.inspo.map((i) =>
            i.id === id
              ? { ...i, enabled: { ...i.enabled, [aspect]: !i.enabled[aspect] } }
              : i,
          ),
        })),

      setInfluence: (id, influence) =>
        set((s) => ({
          inspo: s.inspo.map((i) => (i.id === id ? { ...i, influence } : i)),
        })),

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
        // Intermediate frames: in-memory only. They render via the
        // partialize filter that excludes non-final generations from
        // sessionStorage.
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
            // Attach blobId, then evict beyond MAX_HISTORY.
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
          activeGenerationId: s.activeGenerationId === id ? null : s.activeGenerationId,
        }));
      },

      clearBlobError: () => set({ blobError: null }),
    }),
    {
      name: "studio-syn-session",
      version: 2,
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
      // Strip large dataUrls before writing to sessionStorage. The
      // dataUrls live in IndexedDB (via blobStore) and are rehydrated
      // below.
      partialize: (s) => ({
        room: s.room ? { blobId: s.room.blobId, uploadedAt: s.room.uploadedAt } : null,
        inspo: s.inspo.map((i) => ({
          id: i.id,
          blobId: i.blobId,
          status: i.status,
          aspects: i.aspects,
          enabled: i.enabled,
          influence: i.influence,
          error: i.error,
        })),
        keepChange: s.keepChange,
        notes: s.notes,
        // Only persist finalised generations — partial frames would
        // otherwise bloat storage and never have a blob written.
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
        // Asynchronously fetch each blob and patch the in-memory state.
        void (async () => {
          const patches: Partial<State> = {};
          if (state.room?.blobId) {
            const dataUrl = await getBlob(state.room.blobId);
            patches.room = dataUrl
              ? { ...state.room, dataUrl }
              : null;
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
      migrate: (_persisted, _version) => {
        // v1 stored dataUrls directly; the shape is incompatible.
        // Returning a clean default forces a fresh session.
        return {
          room: null,
          inspo: [],
          keepChange: DEFAULT_KEEP_CHANGE,
          notes: "",
          generations: [],
          activeGenerationId: null,
          blobError: null,
        } as unknown as State;
      },
    },
  ),
);
