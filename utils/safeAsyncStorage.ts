/* eslint-disable @typescript-eslint/no-require-imports */
//
// Resilient AsyncStorage.
//
// If the native AsyncStorage module is unavailable or version-skewed
// against the JS bundle (the exact failure that black-screened 2.0.10
// over OTA: a 2.x JS bundle looking up a native module that the 3.x
// build registered under a different name), the real package throws at
// import time and takes the whole app down to a black screen.
//
// This wrapper loads the real implementation defensively. If it cannot,
// it falls back to a non-persistent in-memory store so the app still
// boots and runs; persistence resumes automatically once a matching
// native build ships. Every app module imports AsyncStorage from here,
// never from the package directly, so a single bad native module can
// never crash startup again.

type KV = [string, string | null];

export type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  mergeItem(key: string, value: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  multiGet(keys: readonly string[]): Promise<readonly KV[]>;
  multiSet(pairs: [string, string][]): Promise<void>;
  multiRemove(keys: readonly string[]): Promise<void>;
  multiMerge(pairs: [string, string][]): Promise<void>;
  flushGetRequests?(): void;
};

function createInMemoryFallback(): AsyncStorageLike {
  const store = new Map<string, string>();
  const api: AsyncStorageLike = {
    async getItem(k) {
      return store.has(k) ? (store.get(k) as string) : null;
    },
    async setItem(k, v) {
      store.set(k, String(v));
    },
    async removeItem(k) {
      store.delete(k);
    },
    async mergeItem(k, v) {
      const prev = store.get(k);
      if (prev) {
        try {
          store.set(k, JSON.stringify({ ...JSON.parse(prev), ...JSON.parse(v) }));
        } catch {
          store.set(k, v);
        }
      } else {
        store.set(k, v);
      }
    },
    async clear() {
      store.clear();
    },
    async getAllKeys() {
      return Array.from(store.keys());
    },
    async multiGet(keys) {
      return keys.map((k) => [k, store.has(k) ? (store.get(k) as string) : null] as KV);
    },
    async multiSet(pairs) {
      for (const [k, v] of pairs) store.set(k, String(v));
    },
    async multiRemove(keys) {
      for (const k of keys) store.delete(k);
    },
    async multiMerge(pairs) {
      for (const [k, v] of pairs) await api.mergeItem(k, v);
    },
    flushGetRequests() {},
  };
  return api;
}

let AsyncStorage: AsyncStorageLike;

try {
  // require (not a static import) so a throw during the native module's
  // initialization is catchable here rather than crashing the JS bundle
  // at load time.
  const mod = require("@react-native-async-storage/async-storage");
  const real = (mod && (mod.default ?? mod)) as AsyncStorageLike | undefined;
  if (!real || typeof real.getItem !== "function") {
    throw new Error("AsyncStorage native module unavailable");
  }
  AsyncStorage = real;
} catch (err) {
  console.warn(
    "[safeAsyncStorage] Native AsyncStorage unavailable; using a non-persistent " +
      "in-memory fallback so the app keeps working. Ship a matching native build " +
      "to restore persistence.",
    (err as Error)?.message ?? err,
  );
  AsyncStorage = createInMemoryFallback();
}

export default AsyncStorage;
