import { MediaStatus, TranscodeJobStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { enqueueTranscode } from "@/lib/queues/mediaTranscode.enqueue";

const queueMediaTranscode = async (mediaAssetId: string) => {
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
  await enqueueTranscode(mediaAssetId, attempt);
  return attempt;
};

export { queueMediaTranscode };
