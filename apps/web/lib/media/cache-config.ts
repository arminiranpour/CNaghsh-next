import { z } from "zod";

const positiveInt = (label: string, fallback: number) =>
  z
    .union([
      z
        .coerce
        .number({ invalid_type_error: `${label} must be a number` })
        .int(`${label} must be an integer`)
        .gt(0, `${label} must be positive`),
      z.undefined(),
    ])
    .transform((value: number | undefined) => value ?? fallback);

const schema = z.object({
  HLS_SEGMENT_MAX_AGE_SEC: positiveInt("HLS_SEGMENT_MAX_AGE_SEC", 31_536_000),
  HLS_MANIFEST_MAX_AGE_SEC: positiveInt("HLS_MANIFEST_MAX_AGE_SEC", 120),
  POSTER_MAX_AGE_SEC: positiveInt("POSTER_MAX_AGE_SEC", 31_536_000),
});

const values = schema.parse({
  HLS_SEGMENT_MAX_AGE_SEC: process.env.HLS_SEGMENT_MAX_AGE_SEC ?? undefined,
  HLS_MANIFEST_MAX_AGE_SEC: process.env.HLS_MANIFEST_MAX_AGE_SEC ?? undefined,
  POSTER_MAX_AGE_SEC: process.env.POSTER_MAX_AGE_SEC ?? undefined,
});

export const mediaCacheConfig = {
  hlsSegmentMaxAgeSeconds: values.HLS_SEGMENT_MAX_AGE_SEC,
  hlsManifestMaxAgeSeconds: values.HLS_MANIFEST_MAX_AGE_SEC,
  posterMaxAgeSeconds: values.POSTER_MAX_AGE_SEC,
} as const;

const buildPublicCacheControl = (maxAge: number, options?: { immutable?: boolean }) => {
  const directives = [`public`, `max-age=${maxAge}`];
  if (options?.immutable) {
    directives.push(`immutable`);
  }
  return directives.join(", ");
};

export const getHlsSegmentCacheControl = () =>
  buildPublicCacheControl(mediaCacheConfig.hlsSegmentMaxAgeSeconds, { immutable: true });

export const getHlsManifestCacheControl = () =>
  buildPublicCacheControl(mediaCacheConfig.hlsManifestMaxAgeSeconds);

export const getPosterCacheControl = () =>
  buildPublicCacheControl(mediaCacheConfig.posterMaxAgeSeconds, { immutable: true });

export const getOriginalCacheControl = () => "private, max-age=0, no-store";
