import { z } from "zod";

const schema = z.object({
  REDIS_URL: z.string().min(1),
  MEDIA_TRANSCODE_CONCURRENCY: z.coerce.number().int().positive(),
  MEDIA_TRANSCODE_BACKOFF_MS: z.coerce.number().int().nonnegative(),
  MEDIA_TRANSCODE_MAX_ATTEMPTS: z.coerce.number().int().positive(),
});

export const config = schema.parse({
  REDIS_URL: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  MEDIA_TRANSCODE_CONCURRENCY: process.env.MEDIA_TRANSCODE_CONCURRENCY ?? "2",
  MEDIA_TRANSCODE_BACKOFF_MS: process.env.MEDIA_TRANSCODE_BACKOFF_MS ?? "30000",
  MEDIA_TRANSCODE_MAX_ATTEMPTS: process.env.MEDIA_TRANSCODE_MAX_ATTEMPTS ?? "5",
});
