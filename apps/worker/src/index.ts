import { config } from "./config";
import { logger } from "./lib/logger";
import { startMediaTranscodeQueueMonitor } from "./queues/mediaTranscode.monitor";
import { MEDIA_TRANSCODE_QUEUE_NAME } from "./queues/mediaTranscode.constants";
import { mediaTranscodeWorker } from "./workers/mediaTranscode.worker";

const bootstrap = async () => {
  await startMediaTranscodeQueueMonitor();
  await mediaTranscodeWorker.waitUntilReady();
  logger.info("bootstrap", "Media transcode worker running", {
    queue: MEDIA_TRANSCODE_QUEUE_NAME,
    concurrency: config.MEDIA_TRANSCODE_CONCURRENCY,
    maxAttempts: config.MEDIA_TRANSCODE_MAX_ATTEMPTS,
    backoffMs: config.MEDIA_TRANSCODE_BACKOFF_MS,
  });
};

bootstrap().catch((error) => {
  logger.error("bootstrap", "Worker startup failed", {
    message: error.message,
    stack: error.stack,
  });
  process.exitCode = 1;
});
