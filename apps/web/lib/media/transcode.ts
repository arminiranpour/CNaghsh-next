import { MediaStatus, TranscodeJobStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { enqueueTranscode } from "@/lib/queues/mediaTranscode.enqueue";
import { isMediaTranscodeEnabled } from "@/lib/queues/mediaTranscode.queue";
import { isRedisUnavailableError } from "@/lib/redis";

export class MediaTranscodeDisabledError extends Error {
  constructor() {
    super("MEDIA_TRANSCODE_DISABLED");
  }
}

const queueMediaTranscode = async (mediaAssetId: string) => {
  if (!isMediaTranscodeEnabled()) {
    throw new MediaTranscodeDisabledError();
  }
  const attempt = await prisma.$transaction(async (tx) => {
    const lastAttempt = await tx.transcodeJob.findFirst({
      where: { mediaAssetId },
      orderBy: { attempt: "desc" },
      select: { attempt: true },
    });
    const nextAttempt = (lastAttempt?.attempt ?? 0) + 1;
    await tx.transcodeJob.create({
      data: {
        mediaAssetId,
        status: TranscodeJobStatus.queued,
        attempt: nextAttempt,
      },
    });
    await tx.mediaAsset.update({
      where: { id: mediaAssetId },
      data: {
        status: MediaStatus.processing,
        errorMessage: null,
      },
    });
    return nextAttempt;
  });
  try {
    await enqueueTranscode(mediaAssetId, attempt);
  } catch (error) {
    if (
      isRedisUnavailableError(error)
      || error instanceof MediaTranscodeDisabledError
      || (error instanceof Error && error.message === "MEDIA_TRANSCODE_DISABLED")
    ) {
      await prisma.$transaction(async (tx) => {
        await tx.transcodeJob.deleteMany({
          where: {
            mediaAssetId,
            attempt,
            status: TranscodeJobStatus.queued,
          },
        });
        await tx.mediaAsset.update({
          where: { id: mediaAssetId },
          data: {
            status: MediaStatus.uploaded,
          },
        });
      }).catch(() => undefined);
      throw new MediaTranscodeDisabledError();
    }
    throw error;
  }
  return attempt;
};

export { queueMediaTranscode };
