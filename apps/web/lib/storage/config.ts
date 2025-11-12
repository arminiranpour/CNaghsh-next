import { z } from "zod";

type StorageConfig = {
  endpoint?: string;
  region: string;
  accessKey: string;
  secretKey: string;
  publicBucket: string;
  privateBucket: string;
  signedUrlTtlSec: number;
  forcePathStyle: boolean;
};

const envSchema = z.object({
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_PUBLIC_BUCKET: z.string().min(1),
  S3_PRIVATE_BUCKET: z.string().min(1),
  S3_SIGNED_URL_TTL_SEC: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.string().optional(),
});

const raw = envSchema.parse({
  S3_ENDPOINT: process.env.S3_ENDPOINT,
  S3_REGION: process.env.S3_REGION,
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
  S3_SECRET_KEY: process.env.S3_SECRET_KEY,
  S3_PUBLIC_BUCKET: process.env.S3_PUBLIC_BUCKET,
  S3_PRIVATE_BUCKET: process.env.S3_PRIVATE_BUCKET,
  S3_SIGNED_URL_TTL_SEC: process.env.S3_SIGNED_URL_TTL_SEC,
  S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE,
});

const signedUrlTtlSec = raw.S3_SIGNED_URL_TTL_SEC
  ? Number.parseInt(raw.S3_SIGNED_URL_TTL_SEC, 10)
  : 300;

if (!Number.isFinite(signedUrlTtlSec) || signedUrlTtlSec <= 0) {
  throw new Error("S3_SIGNED_URL_TTL_SEC must be a positive integer");
}

const endpoint = raw.S3_ENDPOINT?.trim();

const storageConfig: StorageConfig = {
  endpoint: endpoint && endpoint.length > 0 ? endpoint : undefined,
  region: raw.S3_REGION,
  accessKey: raw.S3_ACCESS_KEY,
  secretKey: raw.S3_SECRET_KEY,
  publicBucket: raw.S3_PUBLIC_BUCKET,
  privateBucket: raw.S3_PRIVATE_BUCKET,
  signedUrlTtlSec,
  forcePathStyle: (() => {
    const value = raw.S3_FORCE_PATH_STYLE?.trim().toLowerCase();
    if (!value) {
      return false;
    }
    return value === "true" || value === "1" || value === "yes";
  })(),
};

export { storageConfig };
export type { StorageConfig };
