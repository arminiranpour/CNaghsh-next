import { z } from "zod";

import { uploadConfig } from "./config";

const uploadRequestSchema = z.object({
  ownerUserId: z.string().min(1).optional(),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  estimatedDurationSec: z.number().int().positive().optional(),
});

export type UploadRequestInput = z.infer<typeof uploadRequestSchema>;

export const parseUploadRequest = (input: unknown): UploadRequestInput => {
  return uploadRequestSchema.parse(input);
};

export const isAllowedMime = (contentType: string) => {
  return uploadConfig.allowedTypes.has(contentType.trim().toLowerCase());
};

export const isWithinSizeLimit = (sizeBytes: number) => {
  return Number.isFinite(sizeBytes) && sizeBytes > 0 && sizeBytes <= uploadConfig.maxSingleUploadBytes;
};

export const validateDuration = (durationSec: number, planMax?: number) => {
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    return true;
  }
  const baseLimit = uploadConfig.maxDurationSec;
  const limit = planMax && planMax > 0 ? Math.min(planMax, baseLimit) : baseLimit;
  return durationSec <= limit;
};
