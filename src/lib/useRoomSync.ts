// useRoomSync — bridges the zustand workspace store with the Supabase-backed
// database for the current room. On mount, it hydrates the store from the DB.
// While mounted, it observes store changes and pushes them back:
//   - new ready inspo images → upload + insert + remember remote id
//   - tag updates on synced inspo → debounced update
//   - room photo set → upload + update rooms row
//   - brief edits → debounced upsert
//   - finished generations → upload + insert
//   - removals → delete row + storage object
//
// A local `localId → { remoteId, remotePath }` map is used to skip work for
// items that were just hydrated from the DB.

import { useEffect, useRef } from "react";
import { useStore, type Generation, type InspoImage } from "@/lib/store";
import {
  deleteGeneration,
  deleteInspo,
  getBrief,
  insertGeneration,
  insertInspo,
  listGenerations,
  listInspo,
  removeStorage,
  signedUrl,
  updateInspoTags,
  updateRoom,
  uploadDataUrl,
  upsertBrief,
  type Room as DBRoom,
} from "@/lib/projects-api";

type RemoteRef = { remoteId: string; remotePath: string };

export function useRoomSync(room: DBRoom, masterPalette: string[]) {
  const replace = useStore((s) => s.replaceWorkspace);
  const setCurrentRoomId = useStore((s) => s.setCurrentRoomId);
  const setStage = useStore((s) => s.setStage);

  // Maps from in-memory local id -> remote info
  const inspoMap = useRef(new Map<string, RemoteRef>());
  const generationMap = useRef(new Map<string, RemoteRef>());
  const roomPath = useRef<string | null>(null);
  const hydrated = useRef(false);

  // --- Hydrate on mount / room change ---
  useEffect(() => {
    let cancelled = false;
    hydrated.current = false;
    inspoMap.current.clear();
    generationMap.current.clear();
    roomPath.current = null;

    (async () => {
      const [brief, inspo, gens] = await Promise.all([
        getBrief(room.id),
        listInspo(room.id),
        listGenerations(room.id),
      ]);
      if (cancelled) return;

      const roomDataUrl = room.room_photo_url
        ? await signedUrl(room.room_photo_url).catch(() => "")
        : "";
      if (room.room_photo_url) roomPath.current = room.room_photo_url;

      const inspoItems: InspoImage[] = await Promise.all(
        inspo.map(async (r) => {
          const url = await signedUrl(r.image_url).catch(() => "");
          const tags = (r.tags ?? {}) as Partial<InspoImage["aspects"]>;
          const localId = crypto.randomUUID();
          inspoMap.current.set(localId, {
            remoteId: r.id,
            remotePath: r.image_url,
          });
          return {
            id: localId,
            blobId: "remote",
            dataUrl: url,
            status: "ready",
            aspects: tags as InspoImage["aspects"],
          };
        }),
      );

      const generationItems: Generation[] = await Promise.all(
        gens.map(async (g) => {
          const url = await signedUrl(g.result_image_url).catch(() => "");
          const localId = crypto.randomUUID();
          generationMap.current.set(localId, {
            remoteId: g.id,
            remotePath: g.result_image_url,
          });
          return {
            id: localId,
            createdAt: new Date(g.created_at).getTime(),
            dataUrl: url,
            isFinal: true,
            promptSummary: g.prompt_used.slice(0, 80),
          };
        }),
      );

      const palette = brief?.palette ?? (masterPalette.length > 0 ? [...masterPalette] : []);

      const hasCompletedGeneration = generationItems.length > 0;

      // Guard against stale async writes after room switch / unmount.
      if (cancelled) return;

      replace({
        room: roomDataUrl
          ? {
              dataUrl: roomDataUrl,
              blobId: "remote",
              uploadedAt: new Date(room.updated_at).getTime(),
            }
          : null,
        inspo: inspoItems,
        brief: {
          palette,
          materials: brief?.materials ?? [],
          furnitureStyle: brief?.furniture_style ?? "",
          vibe: brief?.vibe ?? "",
          userEdited: !!brief,
        },
        generations: generationItems,
      });
      if (cancelled) return;
      setCurrentRoomId(room.id);
      if (cancelled) return;
      // Completed rooms open on the Results tab; unfinished rooms start at Collect.
      setStage(hasCompletedGeneration ? "results" : "collect");
      if (cancelled) return;
      hydrated.current = true;
    })();

    return () => {
      cancelled = true;
      useStore.getState().resetWorkspace();
      setCurrentRoomId(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  // --- Watch for changes and push to DB ---
  useEffect(() => {
    let briefTimer: ReturnType<typeof setTimeout> | null = null;
    const tagTimers = new Map<string, ReturnType<typeof setTimeout>>();
    const inFlightInspo = new Set<string>();
    const inFlightGen = new Set<string>();
    let lastInspoIds = new Set<string>();
    let lastGenIds = new Set<string>();
    let lastRoomDataUrl: string | null = null;
    let roomUploading = false;

    const unsub = useStore.subscribe((state) => {
      if (!hydrated.current || state.currentRoomId !== room.id) return;

      // --- Room photo ---
      const dataUrl = state.room?.dataUrl ?? null;
      if (dataUrl !== lastRoomDataUrl) {
        lastRoomDataUrl = dataUrl;
        if (!dataUrl) {
          // Cleared.
          if (roomPath.current) {
            void removeStorage(roomPath.current);
            void updateRoom(room.id, { room_photo_url: null });
            roomPath.current = null;
          }
        } else if (!roomUploading && state.room?.blobId !== "remote") {
          roomUploading = true;
          (async () => {
            try {
              const path = await uploadDataUrl("rooms", dataUrl);
              if (roomPath.current) await removeStorage(roomPath.current);
              roomPath.current = path;
              await updateRoom(room.id, { room_photo_url: path });
            } catch (e) {
              console.error("Room upload failed", e);
            } finally {
              roomUploading = false;
            }
          })();
        }
      }

      // --- Inspiration: additions ---
      const currentInspoIds = new Set(state.inspo.map((i) => i.id));
      for (const item of state.inspo) {
        if (item.status !== "ready" || !item.aspects) continue;
        if (inspoMap.current.has(item.id) || inFlightInspo.has(item.id)) {
          // Existing — check for tag changes (debounced).
          const ref = inspoMap.current.get(item.id);
          if (ref && item.aspects) {
            if (tagTimers.has(item.id)) clearTimeout(tagTimers.get(item.id)!);
            tagTimers.set(
              item.id,
              setTimeout(() => {
                void updateInspoTags(ref.remoteId, item.aspects!);
                tagTimers.delete(item.id);
              }, 600),
            );
          }
          continue;
        }
        if (item.blobId === "remote" || !item.dataUrl) continue;
        inFlightInspo.add(item.id);
        (async () => {
          try {
            const path = await uploadDataUrl("inspo", item.dataUrl);
            const row = await insertInspo(room.id, path, item.aspects!);
            inspoMap.current.set(item.id, {
              remoteId: row.id,
              remotePath: path,
            });
          } catch (e) {
            console.error("Inspo upload failed", e);
          } finally {
            inFlightInspo.delete(item.id);
          }
        })();
      }
      // --- Inspiration: removals ---
      for (const oldId of lastInspoIds) {
        if (currentInspoIds.has(oldId)) continue;
        const ref = inspoMap.current.get(oldId);
        if (ref) {
          void deleteInspo(ref.remoteId);
          void removeStorage(ref.remotePath);
          inspoMap.current.delete(oldId);
        }
      }
      lastInspoIds = currentInspoIds;

      // --- Brief: debounced upsert ---
      if (briefTimer) clearTimeout(briefTimer);
      briefTimer = setTimeout(() => {
        void upsertBrief(room.id, {
          palette: state.brief.palette,
          materials: state.brief.materials,
          furniture_style: state.brief.furnitureStyle,
          vibe: state.brief.vibe,
        });
      }, 500);

      // --- Generations: new finals ---
      const currentGenIds = new Set(state.generations.map((g) => g.id));
      for (const g of state.generations) {
        if (!g.isFinal || !g.dataUrl) continue;
        if (generationMap.current.has(g.id) || inFlightGen.has(g.id)) continue;
        inFlightGen.add(g.id);
        (async () => {
          try {
            const path = await uploadDataUrl("generations", g.dataUrl);
            const row = await insertGeneration(room.id, path, g.promptSummary);
            generationMap.current.set(g.id, {
              remoteId: row.id,
              remotePath: path,
            });
          } catch (e) {
            console.error("Generation upload failed", e);
          } finally {
            inFlightGen.delete(g.id);
          }
        })();
      }
      // --- Generations: removals ---
      for (const oldId of lastGenIds) {
        if (currentGenIds.has(oldId)) continue;
        const ref = generationMap.current.get(oldId);
        if (ref) {
          void deleteGeneration(ref.remoteId);
          void removeStorage(ref.remotePath);
          generationMap.current.delete(oldId);
        }
      }
      lastGenIds = currentGenIds;
    });

    return () => {
      unsub();
      if (briefTimer) clearTimeout(briefTimer);
      for (const t of tagTimers.values()) clearTimeout(t);
    };
  }, [room.id]);
}
