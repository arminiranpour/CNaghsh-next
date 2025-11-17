import { MediaModerationStatus, MediaStatus, MediaType, TranscodeJobStatus, type PrismaClient } from "@prisma/client";

import { prisma as defaultPrisma } from "@/lib/prisma";
import { createMediaTranscodeQueue } from "@/lib/queues/mediaTranscode.queue";

export type MediaHealthResponse = {
  queue: {
    waiting: number;
    active: number;
    delayed: number;
    failed: number;
    completedLastHour: number;
  };
  database: {
    readyVideos: number;
    failedVideos: number;
    processingVideos: number;
    pendingModeration: number;
  };
  recentFailures: {
    mediaId: string;
    status: string;
    errorMessage: string | null;
    failedAt: string | null;
  }[];
};

type HealthOptions = {
  prismaClient?: PrismaClient;
  lookbackMinutes?: number;
};

export const getMediaHealth = async (options: HealthOptions = {}): Promise<MediaHealthResponse> => {
  const prisma = options.prismaClient ?? defaultPrisma;
  const lookbackMinutes = options.lookbackMinutes ?? 60;
  const lookbackDate = new Date(Date.now() - lookbackMinutes * 60_000);

  const queue = createMediaTranscodeQueue();
  try {
    const counts = await queue.getJobCounts("waiting", "active", "delayed", "failed");
    const completedLastHour = await prisma.transcodeJob.count({
      where: {
        status: TranscodeJobStatus.done,
        finishedAt: {
          gte: lookbackDate,
        },
      },
    });

    const [readyVideos, failedVideos, processingVideos, pendingModeration, failedJobs] = await Promise.all([
      prisma.mediaAsset.count({
        where: { type: MediaType.video, status: MediaStatus.ready },
      }),
      prisma.mediaAsset.count({
        where: { type: MediaType.video, status: MediaStatus.failed },
      }),
      prisma.mediaAsset.count({
        where: { type: MediaType.video, status: MediaStatus.processing },
      }),
      prisma.mediaAsset.count({
        where: { type: MediaType.video, moderationStatus: MediaModerationStatus.pending },
      }),
      prisma.transcodeJob.findMany({
        where: { status: TranscodeJobStatus.failed },
        orderBy: [{ finishedAt: "desc" }, { createdAt: "desc" }],
        take: 10,
        select: {
          mediaAssetId: true,
          finishedAt: true,
          mediaAsset: {
            select: {
              status: true,
              errorMessage: true,
            },
          },
        },
      }),
    ]);

    return {
      queue: {
        waiting: counts.waiting ?? 0,
        active: counts.active ?? 0,
        delayed: counts.delayed ?? 0,
        failed: counts.failed ?? 0,
        completedLastHour,
      },
      database: {
        readyVideos,
        failedVideos,
        processingVideos,
        pendingModeration,
      },
      recentFailures: failedJobs.map((job) => ({
        mediaId: job.mediaAssetId,
        status: job.mediaAsset?.status ?? "unknown",
        errorMessage: job.mediaAsset?.errorMessage ?? null,
        failedAt: job.finishedAt ? job.finishedAt.toISOString() : null,
      })),
    };
  } finally {
    await queue.close();
  }
};
