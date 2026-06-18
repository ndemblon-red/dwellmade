// IndexedDB-backed blob storage for large image data URLs. sessionStorage
// has a ~5MB quota; persisting base64 photos there overflows quickly. We
// keep only ids + metadata in zustand/sessionStorage and stash the raw
// data URLs here, where browsers allow tens to hundreds of MB.

import { get, set, del, clear, createStore, type UseStore } from "idb-keyval";

const SESSION_KEY = "studio-syn-session-id";
const DB_NAME = "studio-syn";
const STORE_NAME = "blobs";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

let storePromise: Promise<UseStore> | null = null;

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
        const existing = window.sessionStorage.getItem(SESSION_KEY);
        if (!existing) {
          window.sessionStorage.setItem(SESSION_KEY, crypto.randomUUID());
          await clear(store);
        }
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
