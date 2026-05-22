import "expo-sqlite/localStorage/install";

type CacheEntry<T = unknown> = {
  key: string;
  endpoint: string;
  userId: string;
  cachedAt: number;
  expiresAt: number;
  staleUntil: number;
  value: T;
};

type CacheIndexEntry = {
  key: string;
  endpoint: string;
  userId: string;
  cachedAt?: number;
};

export type CachePolicy = {
  enabled: boolean;
  ttlMs: number;
  staleMs: number;
  persist: boolean;
};

const CACHE_PREFIX = "unipool:api-cache:v2:";
const CACHE_INDEX_KEY = "unipool:api-cache:index:v2";
const DEFAULT_USER = "guest";
const MAX_PERSISTED_ENTRIES = 350;
const MAX_MEMORY_ENTRIES = 500;

const memoryCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

const now = () => Date.now();

const hashString = (input: string) => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const normalizeUserId = (userId?: string | null) => userId || DEFAULT_USER;

const headersSignature = (headers?: HeadersInit) => {
  if (!headers) return "";
  if (Array.isArray(headers)) {
    return JSON.stringify([...headers].sort(([a], [b]) => a.localeCompare(b)));
  }
  if (headers instanceof Headers) {
    return JSON.stringify(
      Array.from(headers.entries()).sort(([a], [b]) => a.localeCompare(b)),
    );
  }
  return JSON.stringify(
    Object.entries(headers).sort(([a], [b]) => a.localeCompare(b)),
  );
};

const readIndex = (): CacheIndexEntry[] => {
  try {
    const raw = localStorage.getItem(CACHE_INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeIndex = (entries: CacheIndexEntry[]) => {
  try {
    localStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(entries));
  } catch {
    // Cache writes must never break the request path.
  }
};

const putIndexEntry = (entry: CacheIndexEntry) => {
  const entries = readIndex().filter((item) => item.key !== entry.key);
  entries.push({ ...entry, cachedAt: now() });

  if (entries.length > MAX_PERSISTED_ENTRIES) {
    entries
      .sort((a, b) => (b.cachedAt ?? 0) - (a.cachedAt ?? 0))
      .slice(MAX_PERSISTED_ENTRIES)
      .forEach((staleEntry) => {
        memoryCache.delete(staleEntry.key);
        try {
          localStorage.removeItem(staleEntry.key);
        } catch {
          // Cache eviction is best-effort.
        }
      });
  }

  writeIndex(
    entries
      .sort((a, b) => (b.cachedAt ?? 0) - (a.cachedAt ?? 0))
      .slice(0, MAX_PERSISTED_ENTRIES),
  );
};

const trimMemoryCache = () => {
  if (memoryCache.size <= MAX_MEMORY_ENTRIES) return;

  Array.from(memoryCache.entries())
    .sort(([, a], [, b]) => a.cachedAt - b.cachedAt)
    .slice(0, memoryCache.size - MAX_MEMORY_ENTRIES)
    .forEach(([key]) => memoryCache.delete(key));
};

const removeIndexEntries = (predicate: (entry: CacheIndexEntry) => boolean) => {
  for (const [key, entry] of memoryCache.entries()) {
    if (predicate({ key, endpoint: entry.endpoint, userId: entry.userId })) {
      memoryCache.delete(key);
    }
  }

  const entries = readIndex();
  const kept: CacheIndexEntry[] = [];

  for (const entry of entries) {
    if (predicate(entry)) {
      memoryCache.delete(entry.key);
      try {
        localStorage.removeItem(entry.key);
      } catch {
        // Ignore storage failures.
      }
    } else {
      kept.push(entry);
    }
  }

  writeIndex(kept);
};

export const makeApiCacheKey = (
  endpoint: string,
  userId?: string | null,
  headers?: HeadersInit,
) => {
  const normalizedUserId = normalizeUserId(userId);
  const signature = `${normalizedUserId}:${endpoint}:${headersSignature(headers)}`;
  return `${CACHE_PREFIX}${hashString(signature)}`;
};

export const cachePolicyForEndpoint = (endpoint: string): CachePolicy => {
  const cleanEndpoint = endpoint.split("?")[0];

  if (
    cleanEndpoint.includes("/messages") ||
    /\/ride\/[^/]+\/rating-eligibility$/.test(cleanEndpoint) ||
    cleanEndpoint.endsWith("/read") ||
    cleanEndpoint === "/chat/connections"
  ) {
    return { enabled: false, ttlMs: 0, staleMs: 0, persist: false };
  }

  if (cleanEndpoint === "/user/details") {
    return { enabled: true, ttlMs: 5 * 60_000, staleMs: 24 * 60 * 60_000, persist: true };
  }

  if (
    cleanEndpoint === "/app/state" ||
    cleanEndpoint === "/user/rides" ||
    cleanEndpoint === "/booking/list" ||
    cleanEndpoint === "/trip-card/active" ||
    cleanEndpoint === "/user/pending-ratings" ||
    cleanEndpoint === "/user/notification-prefs" ||
    cleanEndpoint === "/user/passengers" ||
    cleanEndpoint === "/chats/me" ||
    cleanEndpoint === "/rides/involved" ||
    cleanEndpoint === "/passengers/all"
  ) {
    return { enabled: false, ttlMs: 0, staleMs: 0, persist: false };
  }

  if (
    cleanEndpoint === "/rides/nearby" ||
    cleanEndpoint === "/ride/search" ||
    cleanEndpoint.startsWith("/ride/details/") ||
    /\/ride\/[^/]+\/settings$/.test(cleanEndpoint) ||
    /\/ride\/[^/]+\/chat-mute$/.test(cleanEndpoint)
  ) {
    return { enabled: false, ttlMs: 0, staleMs: 0, persist: false };
  }

  if (/^\/user\/[^/?]+$/.test(cleanEndpoint)) {
    return { enabled: true, ttlMs: 30 * 60_000, staleMs: 24 * 60 * 60_000, persist: true };
  }

  if (cleanEndpoint === "/locations/search") {
    return { enabled: true, ttlMs: 12 * 60 * 60_000, staleMs: 7 * 24 * 60 * 60_000, persist: true };
  }

  if (cleanEndpoint === "/institutes" || cleanEndpoint === "/institutes/search") {
    return { enabled: true, ttlMs: 24 * 60 * 60_000, staleMs: 30 * 24 * 60 * 60_000, persist: true };
  }

  return { enabled: true, ttlMs: 15_000, staleMs: 60 * 60_000, persist: false };
};

export const getFreshCache = <T>(key: string): T | undefined => {
  const entry = readEntry<T>(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= now()) return undefined;
  return entry.value;
};

export const getStaleCache = <T>(key: string): T | undefined => {
  const entry = readEntry<T>(key);
  if (!entry) return undefined;
  if (entry.staleUntil <= now()) return undefined;
  return entry.value;
};

export const readEntry = <T>(key: string): CacheEntry<T> | undefined => {
  const memoryEntry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (memoryEntry) return memoryEntry;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    memoryCache.set(key, parsed);
    trimMemoryCache();
    return parsed;
  } catch {
    return undefined;
  }
};

export const writeCache = <T>(
  key: string,
  endpoint: string,
  userId: string | null | undefined,
  value: T,
  policy: CachePolicy,
) => {
  if (!policy.enabled) return;

  const cachedAt = now();
  const entry: CacheEntry<T> = {
    key,
    endpoint,
    userId: normalizeUserId(userId),
    cachedAt,
    expiresAt: cachedAt + policy.ttlMs,
    staleUntil: cachedAt + policy.staleMs,
    value,
  };

  memoryCache.set(key, entry);
  trimMemoryCache();
  putIndexEntry({ key, endpoint, userId: entry.userId, cachedAt: cachedAt });

  if (!policy.persist) return;

  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Cache persistence is best-effort.
  }
};

export const getInflight = <T>(key: string): Promise<T> | undefined =>
  inflight.get(key) as Promise<T> | undefined;

export const setInflight = <T>(key: string, promise: Promise<T>) => {
  inflight.set(key, promise);
  promise.then(
    () => {
      if (inflight.get(key) === promise) {
        inflight.delete(key);
      }
    },
    () => {
      if (inflight.get(key) === promise) {
        inflight.delete(key);
      }
    },
  );
};

const dynamicEndpointMatchers = [
  /^\/app\/state(?:\?|$)/,
  /^\/user\/details(?:\?|$)/,
  /^\/user\/rides(?:\?|$)/,
  /^\/user\/default-address(?:\?|$)/,
  /^\/user\/notification-prefs(?:\?|$)/,
  /^\/user\/passengers(?:\?|$)/,
  /^\/user\/pending-ratings(?:\?|$)/,
  /^\/user\/[^/?]+(?:\?|$)/,
  /^\/booking(?:\/|\?|$)/,
  /^\/bookings(?:\/|\?|$)/,
  /^\/trip-card(?:\/|\?|$)/,
  /^\/ride\/details\//,
  /^\/ride\/[^/]+\/settings(?:\?|$)/,
  /^\/ride\/[^/]+\/chat-mute(?:\?|$)/,
  /^\/ride\/search(?:\?|$)/,
  /^\/rides\/nearby(?:\?|$)/,
  /^\/rides\/involved(?:\?|$)/,
  /^\/passengers\/all(?:\?|$)/,
  /^\/chats(?:\/|\?|$)/,
  /^\/chat(?:\/|\?|$)/,
  /^\/dm(?:\/|\?|$)/,
];

export const invalidateApiCacheForMutation = (
  endpoint: string,
  userId?: string | null,
) => {
  const normalizedUserId = normalizeUserId(userId);
  const specificMatchers = mutationMatchers(endpoint);

  removeIndexEntries((entry) => {
    if (entry.userId !== normalizedUserId && entry.userId !== DEFAULT_USER) {
      return false;
    }
    return specificMatchers.some((matcher) => matcher.test(entry.endpoint));
  });
};

export const invalidateAllDynamicApiCache = (userId?: string | null) => {
  const normalizedUserId = normalizeUserId(userId);
  removeIndexEntries((entry) => {
    if (entry.userId !== normalizedUserId && entry.userId !== DEFAULT_USER) {
      return false;
    }
    return dynamicEndpointMatchers.some((matcher) => matcher.test(entry.endpoint));
  });
};

const mutationMatchers = (endpoint: string) => {
  if (endpoint.startsWith("/user/default-address")) {
    return [
      /^\/app\/state(?:\?|$)/,
      /^\/user\/details(?:\?|$)/,
      /^\/user\/default-address(?:\?|$)/,
    ];
  }

  if (endpoint.startsWith("/user/notification-prefs")) {
    return [
      /^\/user\/notification-prefs(?:\?|$)/,
    ];
  }

  if (endpoint.startsWith("/user/profile") || endpoint.startsWith("/user/verify")) {
    return [
      /^\/app\/state(?:\?|$)/,
      /^\/user\/details(?:\?|$)/,
      /^\/user\/[^/?]+(?:\?|$)/,
      /^\/user\/rides(?:\?|$)/,
      /^\/ride\/details\//,
    ];
  }

  if (
    endpoint.startsWith("/ride") ||
    endpoint.startsWith("/booking") ||
    endpoint.startsWith("/bookings") ||
    endpoint.startsWith("/trip-card")
  ) {
    return [
      /^\/app\/state(?:\?|$)/,
      /^\/user\/rides(?:\?|$)/,
      /^\/booking(?:\/|\?|$)/,
      /^\/bookings(?:\/|\?|$)/,
      /^\/trip-card(?:\/|\?|$)/,
      /^\/ride\/details\//,
      /^\/ride\/[^/]+\/settings(?:\?|$)/,
      /^\/ride\/[^/]+\/chat-mute(?:\?|$)/,
      /^\/ride\/search(?:\?|$)/,
      /^\/rides\/nearby(?:\?|$)/,
      /^\/rides\/involved(?:\?|$)/,
      /^\/passengers\/all(?:\?|$)/,
      /^\/user\/passengers(?:\?|$)/,
      /^\/user\/pending-ratings(?:\?|$)/,
    ];
  }

  if (endpoint.startsWith("/chat") || endpoint.startsWith("/dm")) {
    return [
      /^\/app\/state(?:\?|$)/,
      /^\/chats(?:\/|\?|$)/,
      /^\/chat(?:\/|\?|$)/,
      /^\/dm(?:\/|\?|$)/,
    ];
  }

  return dynamicEndpointMatchers;
};
