import { MediaType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { uploadConfig } from "./config";

export type MediaEntitlements = {
  maxVideos: number;
  maxTotalStorageGB: number;
  maxDurationPerVideoSec: number;
};

export type MediaUsage = {
  videoCount: number;
  totalStorageBytes: number;
  todaysUploadBytes: number;
};

const GB = 1024 * 1024 * 1024;

const DEFAULT_MEDIA_ENTITLEMENTS: MediaEntitlements = {
  maxVideos: 100,
  maxTotalStorageGB: 50,
  maxDurationPerVideoSec: uploadConfig.maxDurationSec,
};

export async function getUserMediaEntitlements(userId: string): Promise<MediaEntitlements> {
  if (!userId) {
    return DEFAULT_MEDIA_ENTITLEMENTS;
  }
  return DEFAULT_MEDIA_ENTITLEMENTS;
}

export async function getUserMediaUsage(userId: string): Promise<MediaUsage> {
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);

  const [videoCount, totalStorage, todaysStorage] = await Promise.all([
    prisma.mediaAsset.count({
      where: { ownerUserId: userId, type: MediaType.video },
    }),
    prisma.mediaAsset.aggregate({
      where: { ownerUserId: userId, type: MediaType.video },
      _sum: { sizeBytes: true },
    }),
    prisma.mediaAsset.aggregate({
      where: {
        ownerUserId: userId,
        type: MediaType.video,
        createdAt: { gte: startOfDay },
      },
      _sum: { sizeBytes: true },
    }),
  ]);

  const totalStorageBytes = totalStorage._sum.sizeBytes ? Number(totalStorage._sum.sizeBytes) : 0;
  const todaysUploadBytes = todaysStorage._sum.sizeBytes ? Number(todaysStorage._sum.sizeBytes) : 0;

  return {
    videoCount,
    totalStorageBytes,
    todaysUploadBytes,
  };
}

type UploadBlockReason = "VIDEO_LIMIT" | "STORAGE_LIMIT" | "DURATION_LIMIT";

type UploadDecision =
  | { ok: true; reason?: undefined }
  | { ok: false; reason: UploadBlockReason };

export async function canUploadVideo(
  userId: string,
  sizeBytes: number,
  durationSec: number,
  entitlements?: MediaEntitlements,
): Promise<UploadDecision> {
  const plan = entitlements ?? (await getUserMediaEntitlements(userId));
  const usage = await getUserMediaUsage(userId);

  if (usage.videoCount >= plan.maxVideos) {
    return { ok: false, reason: "VIDEO_LIMIT" };
  }

  const storageLimitBytes = plan.maxTotalStorageGB * GB;
  const projectedStorage = usage.totalStorageBytes + sizeBytes;
  if (storageLimitBytes > 0 && projectedStorage > storageLimitBytes) {
    return { ok: false, reason: "STORAGE_LIMIT" };
  }

  if (durationSec > 0) {
    const durationLimit = Math.min(plan.maxDurationPerVideoSec, uploadConfig.maxDurationSec);
    if (durationSec > durationLimit) {
      return { ok: false, reason: "DURATION_LIMIT" };
    }
  }

  return { ok: true };
}
