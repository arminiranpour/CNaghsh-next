import Redis from "ioredis";

type GlobalRedisState = typeof globalThis & {
  webRedisClient?: Redis | null;
};

const globalForRedis = globalThis as GlobalRedisState;

const normalizeRedisUrl = (value: string | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.toLowerCase() === "disabled") {
    return null;
  }
  return trimmed;
};

const createRedisClient = (redisUrl: string) =>
  new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
  });

export const getRedisUrl = (): string | null => normalizeRedisUrl(process.env.REDIS_URL);

export const isRedisEnabled = (): boolean => getRedisUrl() !== null;

export const getRedis = (): Redis | null => {
  if (globalForRedis.webRedisClient !== undefined) {
    return globalForRedis.webRedisClient;
  }

  const redisUrl = getRedisUrl();
  if (!redisUrl) {
    globalForRedis.webRedisClient = null;
    return null;
  }

  const client = createRedisClient(redisUrl);
  globalForRedis.webRedisClient = client;
  return client;
};

export const isRedisUnavailableError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : "";
  return /ECONNREFUSED|ENOTFOUND|getaddrinfo|Connection is closed|connect ECONN|All sentinels are unreachable/i.test(message);
};
