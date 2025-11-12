import { redis } from "@/lib/redis";

import { uploadConfig } from "./media/config";

const RATE_USER_KEY = "upload:rate:user";
const RATE_IP_KEY = "upload:rate:ip";
const DAILY_BYTES_KEY = "upload:daily";
const MINUTE_MS = 60_000;

const TOKEN_BUCKET_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local ratePerMinute = tonumber(ARGV[2])
local capacity = tonumber(ARGV[3])
local interval = 60000
local state = redis.call("HMGET", key, "tokens", "timestamp")
local tokens = tonumber(state[1])
local timestamp = tonumber(state[2])
if tokens == nil then tokens = capacity end
if timestamp == nil then timestamp = now end
local elapsed = now - timestamp
if elapsed < 0 then elapsed = 0 end
local refill = elapsed * ratePerMinute / interval
if refill > 0 then
  tokens = math.min(capacity, tokens + refill)
  timestamp = now
end
if tokens < 1 then
  redis.call("HMSET", key, "tokens", tokens, "timestamp", timestamp)
  redis.call("PEXPIRE", key, interval)
  return 0
end
tokens = tokens - 1
redis.call("HMSET", key, "tokens", tokens, "timestamp", timestamp)
redis.call("PEXPIRE", key, interval)
return 1
`;

const consumeToken = async (key: string) => {
  const result = await redis.eval(
    TOKEN_BUCKET_LUA,
    1,
    key,
    Date.now().toString(),
    uploadConfig.rateLimitPerMinute.toString(),
    uploadConfig.rateLimitBurst.toString(),
  );
  return Number(result) === 1;
};

const normalizeKey = (prefix: string, value: string) => `${prefix}:${value}`;

export class RateLimitExceededError extends Error {
  scope: "user" | "ip";

  constructor(scope: "user" | "ip") {
    super("RATE_LIMITED");
    this.scope = scope;
  }
}

const getIpValue = (ip: string | null | undefined) => {
  if (!ip) {
    return "unknown";
  }
  const trimmed = ip.trim();
  return trimmed.length > 0 ? trimmed : "unknown";
};

export const assertWithinRateLimit = async ({
  userId,
  ip,
}: {
  userId: string;
  ip: string | null | undefined;
}): Promise<void> => {
  const userKey = normalizeKey(RATE_USER_KEY, userId);
  const ipKey = normalizeKey(RATE_IP_KEY, getIpValue(ip));
  const [userAllowed, ipAllowed] = await Promise.all([
    consumeToken(userKey),
    consumeToken(ipKey),
  ]);
  if (!userAllowed) {
    throw new RateLimitExceededError("user");
  }
  if (!ipAllowed) {
    throw new RateLimitExceededError("ip");
  }
};

const getMillisUntilMidnight = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  return diff > 0 ? diff : MINUTE_MS;
};

const toDailyKey = (userId: string) => `${DAILY_BYTES_KEY}:${userId}`;

export const trackDailyBytes = async (userId: string, sizeBytes: number): Promise<void> => {
  const key = toDailyKey(userId);
  const increment = Math.max(0, Math.floor(sizeBytes));
  const expireMs = getMillisUntilMidnight();
  await redis
    .multi()
    .incrby(key, increment)
    .pexpire(key, expireMs)
    .exec();
};

export const getDailyBytes = async (userId: string): Promise<number> => {
  const value = await redis.get(toDailyKey(userId));
  if (!value) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
