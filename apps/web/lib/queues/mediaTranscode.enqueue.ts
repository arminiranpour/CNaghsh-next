import { MEDIA_TRANSCODE_QUEUE_NAME, type MediaTranscodeJobData } from "@acme/contracts/queues/mediaTranscode";

import { createMediaTranscodeQueue } from "./mediaTranscode.queue";

const parseIntEnv = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
};

const MAX_ATTEMPTS = parseIntEnv(process.env.MEDIA_TRANSCODE_MAX_ATTEMPTS, 5);
const BACKOFF_MS = parseIntEnv(process.env.MEDIA_TRANSCODE_BACKOFF_MS, 30000);

export const enqueueTranscode = async (mediaAssetId: string, attempt = 1): Promise<void> => {
  const queue = createMediaTranscodeQueue();
  if (!queue) {
    throw new Error("MEDIA_TRANSCODE_DISABLED");
  }
  const jobId = `${MEDIA_TRANSCODE_QUEUE_NAME}:${mediaAssetId}:${attempt}`;
  const payload: MediaTranscodeJobData = { mediaAssetId, attempt };
  try {
    await queue.add(
      MEDIA_TRANSCODE_QUEUE_NAME,
      payload,
      {
        jobId,
        attempts: MAX_ATTEMPTS,
        backoff: { type: "exponential", delay: BACKOFF_MS },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  } finally {
    await queue.close();
  }
};
