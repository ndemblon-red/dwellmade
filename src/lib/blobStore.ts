// IndexedDB-backed blob storage for large image data URLs. sessionStorage
// has a ~5MB quota; persisting base64 photos there overflows quickly. We
// keep only ids + metadata in zustand/sessionStorage and stash the raw
// data URLs here, where browsers allow tens to hundreds of MB.

import { get, set, del, clear, entries, createStore, type UseStore } from "idb-keyval";

const SESSION_KEY = "dwellmade-session-id";
const LEGACY_SESSION_KEY = "studio-syn-session-id";
const DB_NAME = "dwellmade";
const LEGACY_DB_NAME = "studio-syn";
const STORE_NAME = "blobs";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

let storePromise: Promise<UseStore> | null = null;

// One-time migration from the pre-rebrand storage names. Copies any blobs
// belonging to a still-live session into the new database, then drops the old
// one. Best-effort: failures just mean the user re-uploads.
async function migrateLegacy(store: UseStore, sessionAlive: boolean): Promise<void> {
  try {
    const legacy = createStore(LEGACY_DB_NAME, STORE_NAME);
    if (sessionAlive) {
      for (const [k, v] of await entries(legacy)) {
        await set(k as IDBValidKey, v, store);
      }
    }
    indexedDB.deleteDatabase(LEGACY_DB_NAME);
  } catch {
    // ignore
  }
  try {
    window.sessionStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    // ignore
  }
}

function getStore(): Promise<UseStore> {
  if (!isBrowser()) {
    return Promise.reject(new Error("blobStore unavailable on server"));
  }
  if (!storePromise) {
    storePromise = (async () => {
      const store = createStore(DB_NAME, STORE_NAME);
      // Session-only semantics: if sessionStorage doesn't have a session
      // marker, this is a fresh tab. Wipe any leftover blobs from prior
      // sessions so we never leak data across tabs / refreshes of closed
      // sessions.
      try {
        let existing = window.sessionStorage.getItem(SESSION_KEY);
        let legacyAlive = false;
        if (!existing) {
          const legacySession = window.sessionStorage.getItem(LEGACY_SESSION_KEY);
          if (legacySession) {
            // Same tab session, just under the old key — carry it over.
            window.sessionStorage.setItem(SESSION_KEY, legacySession);
            existing = legacySession;
            legacyAlive = true;
          }
        }
        if (!existing) {
          window.sessionStorage.setItem(SESSION_KEY, crypto.randomUUID());
          await clear(store);
        }
        await migrateLegacy(store, legacyAlive);
      } catch {
        // ignore – sessionStorage may be unavailable in some contexts
      }
      return store;
    })();
  }
  return storePromise;
}

export async function setBlob(id: string, dataUrl: string): Promise<void> {
  if (!isBrowser()) return;
  const store = await getStore();
  await set(id, dataUrl, store);
}

export async function getBlob(id: string): Promise<string | undefined> {
  if (!isBrowser()) return undefined;
  try {
    const store = await getStore();
    return (await get<string>(id, store)) ?? undefined;
  } catch {
    return undefined;
  }
}

export async function deleteBlob(id: string): Promise<void> {
  if (!isBrowser()) return;
  try {
    const store = await getStore();
    await del(id, store);
  } catch {
    // best-effort
  }
}

export function newBlobId(): string {
  return crypto.randomUUID();
}
