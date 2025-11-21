import { TranscodeJobStatus } from "@prisma/client";

import { config } from "../src/config";
import { logger } from "../src/lib/logger";
import { prisma } from "../src/lib/prisma";
import { createQueue } from "../src/lib/queue-connection";
import { MEDIA_TRANSCODE_QUEUE_NAME } from "../src/queues/mediaTranscode.constants";
import type { MediaTranscodeJobData } from "../src/queues/mediaTranscode.types";

const resolveMediaId = () => {
  const fromEnv = process.env.MEDIA_ID?.trim();
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }
  const fromArg = process.argv[2]?.trim();
  if (fromArg && fromArg.length > 0) {
    return fromArg;
  }
  return null;
};

const main = async () => {
  const mediaId = resolveMediaId();
  if (!mediaId) {
    throw new Error("MEDIA_ID is required via environment variable or CLI argument");
  }

  const media = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
  if (!media) {
    throw new Error(`Media asset ${mediaId} not found`);
  }

  const latestJob = await prisma.transcodeJob.findFirst({
    where: { mediaAssetId: mediaId },
    orderBy: { attempt: "desc" },
  });
  const nextAttempt = (latestJob?.attempt ?? 0) + 1;

  const createdJob = await prisma.transcodeJob.create({
    data: {
      mediaAssetId: mediaId,
      attempt: nextAttempt,
      status: TranscodeJobStatus.queued,
    },
  });

  const queue = createQueue(MEDIA_TRANSCODE_QUEUE_NAME);
  try {
    const payload: MediaTranscodeJobData = { mediaAssetId: mediaId, attempt: nextAttempt };
    const job = await queue.add(
      MEDIA_TRANSCODE_QUEUE_NAME,
      payload,
      {
        jobId: `${MEDIA_TRANSCODE_QUEUE_NAME}:${mediaId}:${nextAttempt}`,
        attempts: config.MEDIA_TRANSCODE_MAX_ATTEMPTS,
        backoff: { type: "exponential", delay: config.MEDIA_TRANSCODE_BACKOFF_MS },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
    logger.info("script", "Enqueued media transcode job", {
      queue: MEDIA_TRANSCODE_QUEUE_NAME,
      jobId: job.id,
      mediaAssetId: mediaId,
      attempt: nextAttempt,
      transcodeJobId: createdJob.id,
    });
  } finally {
    await queue.close();
  }
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    logger.error("script", "Failed to enqueue media transcode job", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    await prisma.$disconnect().catch(() => {});
    process.exitCode = 1;
  });
