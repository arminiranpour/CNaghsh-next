import { logger } from "../src/lib/logger";
import { createQueue } from "../src/lib/queue-connection";
import { MEDIA_TRANSCODE_QUEUE_NAME } from "../src/queues/mediaTranscode.constants";

const main = async () => {
  const queue = createQueue(MEDIA_TRANSCODE_QUEUE_NAME);
  try {
    await queue.drain(true);
    await queue.clean(0, "completed");
    await queue.clean(0, "failed");
    logger.info("script", "Queue drained", {
      queue: MEDIA_TRANSCODE_QUEUE_NAME,
    });
  } finally {
    await queue.close();
  }
};

main().catch((error) => {
  logger.error("script", "Failed to drain queue", {
    message: error.message,
    stack: error.stack,
  });
  process.exitCode = 1;
});
