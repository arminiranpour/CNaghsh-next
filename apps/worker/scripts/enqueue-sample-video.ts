import { config } from "../src/config";
import { logger } from "../src/lib/logger";
import { createQueue } from "../src/lib/queue-connection";
import { MEDIA_TRANSCODE_QUEUE_NAME } from "../src/queues/mediaTranscode.constants";
import type { MediaTranscodeJobData } from "../src/queues/mediaTranscode.types";

const main = async () => {
  const queue = createQueue(MEDIA_TRANSCODE_QUEUE_NAME);
  try {
    const data: MediaTranscodeJobData = { mediaAssetId: "sample-media-id", attempt: 1 };
    const job = await queue.add(
      MEDIA_TRANSCODE_QUEUE_NAME,
      data,
      {
        attempts: config.MEDIA_TRANSCODE_MAX_ATTEMPTS,
        backoff: { type: "exponential", delay: config.MEDIA_TRANSCODE_BACKOFF_MS },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
    logger.info("script", "Enqueued sample media transcode job", {
      queue: MEDIA_TRANSCODE_QUEUE_NAME,
      jobId: job.id,
    });
  } finally {
    await queue.close();
  }
};

main().catch((error) => {
  logger.error("script", "Failed to enqueue sample job", {
    message: error.message,
    stack: error.stack,
  });
  process.exitCode = 1;
});
