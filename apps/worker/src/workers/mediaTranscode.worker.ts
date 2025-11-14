import type { Job } from "bullmq";
import { Worker } from "bullmq";

import { config } from "../config";
import { logger } from "../lib/logger";
import { createWorkerConnection } from "../lib/queue-connection";
import { MEDIA_TRANSCODE_QUEUE_NAME } from "../queues/mediaTranscode.constants";
import type { MediaTranscodeJobData } from "../queues/mediaTranscode.types";

type MediaTranscodeJobResult = { mediaAssetId: string; attempt: number };

const calculateBackoff = (attemptsMade: number) => {
  if (attemptsMade <= 1) {
    return config.MEDIA_TRANSCODE_BACKOFF_MS;
  }
  return config.MEDIA_TRANSCODE_BACKOFF_MS * Math.pow(2, attemptsMade - 1);
};

const processJob = async (job: Job<MediaTranscodeJobData>): Promise<MediaTranscodeJobResult> => {
  const mediaAssetId = job.data?.mediaAssetId;
  const attempt = job.data?.attempt ?? 1;
  if (!mediaAssetId) {
    throw new Error("Missing mediaAssetId");
  }
  logger.info("worker", "Processing media transcode job", {
    queue: MEDIA_TRANSCODE_QUEUE_NAME,
    jobId: job.id,
    mediaAssetId,
    attempt,
    retryCount: job.attemptsMade,
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { mediaAssetId, attempt };
};

export const mediaTranscodeWorker = new Worker<MediaTranscodeJobData, MediaTranscodeJobResult>(
  MEDIA_TRANSCODE_QUEUE_NAME,
  processJob,
  {
    connection: createWorkerConnection(),
    concurrency: config.MEDIA_TRANSCODE_CONCURRENCY,
    settings: {
      backoffStrategy: (attemptsMade) => calculateBackoff(attemptsMade),
    },
  },
);

mediaTranscodeWorker.on("completed", (job) => {
  logger.info("job", "Media transcode job completed", {
    queue: MEDIA_TRANSCODE_QUEUE_NAME,
    jobId: job.id,
    returnvalue: job.returnvalue,
  });
});

mediaTranscodeWorker.on("failed", (job, error) => {
  logger.error("job", "Media transcode job failed", {
    queue: MEDIA_TRANSCODE_QUEUE_NAME,
    jobId: job?.id,
    failedReason: error.message,
    stack: error.stack,
    attemptsMade: job?.attemptsMade,
  });
});

mediaTranscodeWorker.on("error", (error) => {
  logger.error("worker", "Worker runtime error", {
    message: error.message,
    stack: error.stack,
  });
});
