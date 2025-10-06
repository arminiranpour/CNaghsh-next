const stores = new Map<string, Map<string, { hits: number; expiresAt: number }>>();

type RateLimiterOptions = {
  /** Maximum number of attempts within the window. */
  max: number;
  /** Duration of the window in milliseconds. */
  windowMs: number;
  /** Optional namespace to isolate rate limiters. */
  namespace?: string;
};

export type RateLimiter = {
  /** Returns whether the key is currently allowed without mutating the counter. */
  allow: (key: string) => boolean;
  /** Increments the counter for the key and returns whether it is still within the limit. */
  hit: (key: string) => boolean;
  /** Clears the stored counter for the key. */
  reset: (key: string) => void;
};

export function createInMemoryRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { max, windowMs, namespace = "default" } = options;
  if (max <= 0) {
    throw new Error("Rate limiter max must be greater than 0");
  }
  if (windowMs <= 0) {
    throw new Error("Rate limiter windowMs must be greater than 0");
  }

  const store = ((): Map<string, { hits: number; expiresAt: number }> => {
    if (!stores.has(namespace)) {
      stores.set(namespace, new Map());
    }

    return stores.get(namespace)!;
  })();

  function getEntry(key: string) {
    const normalizedKey = key.trim().toLowerCase();
    const now = Date.now();
    const existing = store.get(normalizedKey);

    if (!existing || existing.expiresAt <= now) {
      return { normalizedKey, entry: undefined, now } as const;
    }

    return { normalizedKey, entry: existing, now } as const;
  }

  return {
    allow(key: string) {
      const { entry } = getEntry(key);
      if (!entry) {
        return true;
      }

      return entry.hits < max;
    },
    hit(key: string) {
      const { entry, normalizedKey, now } = getEntry(key);

      if (!entry) {
        store.set(normalizedKey, { hits: 1, expiresAt: now + windowMs });
        return true;
      }

      if (entry.hits >= max) {
        return false;
      }

      entry.hits += 1;
      return entry.hits <= max;
    },
    reset(key: string) {
      const normalizedKey = key.trim().toLowerCase();
      store.delete(normalizedKey);
    },
  };
}
