import Redis from "ioredis";

import { config } from "../config";

const globalForRedis = globalThis as unknown as { mediaWorkerRedis?: Redis };

const createClient = () => new Redis(config.REDIS_URL);

const redis = globalForRedis.mediaWorkerRedis ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.mediaWorkerRedis = redis;
}

export { redis };
