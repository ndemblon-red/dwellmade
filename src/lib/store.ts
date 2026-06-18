import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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
  dataUrl: string; // base64 data URL
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
  createdAt: number;
  dataUrl: string;
  isFinal: boolean;
  promptSummary: string;
};

type State = {
  room: { dataUrl: string; uploadedAt: number } | null;
  inspo: InspoImage[];
  keepChange: KeepChange;
  notes: string;
  generations: Generation[];
  activeGenerationId: string | null;

  setRoom: (dataUrl: string | null) => void;
  addInspo: (image: Omit<InspoImage, "id" | "status" | "enabled" | "influence">) => string;
  updateInspo: (id: string, patch: Partial<InspoImage>) => void;
  removeInspo: (id: string) => void;
  toggleAspect: (id: string, aspect: keyof EnabledAspects) => void;
  setInfluence: (id: string, influence: number) => void;
  setKeepChange: (k: keyof KeepChange, v: "keep" | "change") => void;
  setNotes: (s: string) => void;
  startGeneration: (id: string, promptSummary: string) => void;
  updateGeneration: (id: string, dataUrl: string, isFinal: boolean) => void;
  removeGeneration: (id: string) => void;
};

const DEFAULT_KEEP_CHANGE: KeepChange = {
  walls: "change",
  flooring: "keep",
  furniture: "keep",
  decor: "change",
};

export const useStore = create<State>()(
  persist(
    (set) => ({
      room: null,
      inspo: [],
      keepChange: DEFAULT_KEEP_CHANGE,
      notes: "",
      generations: [],
      activeGenerationId: null,

      setRoom: (dataUrl) =>
        set({ room: dataUrl ? { dataUrl, uploadedAt: Date.now() } : null }),

      addInspo: (image) => {
        const id = crypto.randomUUID();
        set((s) => ({
          inspo: [
            ...s.inspo,
            {
              ...image,
              id,
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
        }));
        return id;
      },

      updateInspo: (id, patch) =>
        set((s) => ({
          inspo: s.inspo.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        })),

      removeInspo: (id) =>
        set((s) => ({ inspo: s.inspo.filter((i) => i.id !== id) })),

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

      updateGeneration: (id, dataUrl, isFinal) =>
        set((s) => ({
          generations: s.generations.map((g) =>
            g.id === id ? { ...g, dataUrl, isFinal } : g,
          ),
        })),

      removeGeneration: (id) =>
        set((s) => ({
          generations: s.generations.filter((g) => g.id !== id),
          activeGenerationId: s.activeGenerationId === id ? null : s.activeGenerationId,
        })),
    }),
    {
      name: "studio-syn-session",
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
    },
  ),
);
