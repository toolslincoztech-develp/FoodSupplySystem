type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  staleUntil: number;
  epoch: number;
};

type CacheStore = {
  entries: Map<string, CacheEntry<unknown>>;
  inflight: Map<string, Promise<unknown>>;
  prefixEpochs: Map<string, number>;
  epochSeq: number;
};

const globalForCache = globalThis as unknown as {
  __foodSupplyCache?: CacheStore;
};

const store: CacheStore = globalForCache.__foodSupplyCache ?? {
  entries: new Map(),
  inflight: new Map(),
  prefixEpochs: new Map(),
  epochSeq: 0,
};

globalForCache.__foodSupplyCache = store;

export type CacheScope =
  | "auth"
  | "menu"
  | "pos-init"
  | "orders"
  | "dashboard"
  | "finance"
  | "closing"
  | "staff"
  | "stock"
  | "expenses"
  | "expense-categories";

export function tenantCacheKey(
  restaurantId: string,
  scope: CacheScope,
  suffix = "default"
): string {
  return `tenant:${restaurantId}:${scope}:${suffix}`;
}

function getEffectiveEpoch(key: string): number {
  let maxEpoch = 0;
  for (const [prefix, epoch] of store.prefixEpochs.entries()) {
    if (key.startsWith(prefix) && epoch > maxEpoch) {
      maxEpoch = epoch;
    }
  }
  return maxEpoch;
}

export async function getOrSetCache<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  swrMs = 0
): Promise<T> {
  const now = Date.now();
  const existing = store.entries.get(key) as CacheEntry<T> | undefined;

  if (existing) {
    if (now < existing.expiresAt) {
      return existing.value;
    }

    if (swrMs > 0 && now < existing.staleUntil) {
      // Serve stale value immediately (<1ms) and refresh silently in the background
      if (!store.inflight.has(key)) {
        const startEpoch = getEffectiveEpoch(key);
        const bgPromise = fetcher()
          .then((fresh) => {
            if (getEffectiveEpoch(key) === startEpoch) {
              const t = Date.now();
              store.entries.set(key, {
                value: fresh,
                expiresAt: t + ttlMs,
                staleUntil: t + ttlMs + swrMs,
                epoch: startEpoch,
              });
            }
            return fresh;
          })
          .catch(() => existing.value)
          .finally(() => {
            store.inflight.delete(key);
          });
        store.inflight.set(key, bgPromise);
      }
      return existing.value;
    }
  }

  const inflight = store.inflight.get(key) as Promise<T> | undefined;
  if (inflight) {
    return inflight;
  }

  const startEpoch = getEffectiveEpoch(key);
  const promise = fetcher()
    .then((fresh) => {
      if (getEffectiveEpoch(key) === startEpoch) {
        const t = Date.now();
        store.entries.set(key, {
          value: fresh,
          expiresAt: t + ttlMs,
          staleUntil: t + ttlMs + swrMs,
          epoch: startEpoch,
        });
      }
      return fresh;
    })
    .finally(() => {
      store.inflight.delete(key);
    });

  store.inflight.set(key, promise);
  return promise;
}

export function invalidateCachePrefix(prefix: string): void {
  store.epochSeq += 1;
  store.prefixEpochs.set(prefix, store.epochSeq);

  for (const key of store.entries.keys()) {
    if (key.startsWith(prefix)) {
      store.entries.delete(key);
    }
  }
  for (const key of store.inflight.keys()) {
    if (key.startsWith(prefix)) {
      store.inflight.delete(key);
    }
  }
}

export function invalidateTenantCache(
  restaurantId: string,
  scopes?: CacheScope[]
): void {
  if (!scopes || scopes.length === 0) {
    invalidateCachePrefix(`tenant:${restaurantId}:`);
    return;
  }
  for (const scope of scopes) {
    invalidateCachePrefix(`tenant:${restaurantId}:${scope}:`);
  }
}

export function invalidateSuperAdminCache(): void {
  invalidateCachePrefix("superadmin:");
}
