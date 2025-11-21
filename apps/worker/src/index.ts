import { config } from "./config";
import { logError, logInfo } from "./lib/logger";
import { startMediaTranscodeQueueMonitor } from "./queues/mediaTranscode.monitor";
import { MEDIA_TRANSCODE_QUEUE_NAME } from "./queues/mediaTranscode.constants";
import { mediaTranscodeWorker } from "./workers/mediaTranscode.worker";
import { initSentry } from "./sentry";

initSentry();

const bootstrap = async () => {
  await startMediaTranscodeQueueMonitor();
  await mediaTranscodeWorker.waitUntilReady();
  logInfo("worker.bootstrap.ready", {
    queue: MEDIA_TRANSCODE_QUEUE_NAME,
    concurrency: config.MEDIA_TRANSCODE_CONCURRENCY,
    maxAttempts: config.MEDIA_TRANSCODE_MAX_ATTEMPTS,
    backoffMs: config.MEDIA_TRANSCODE_BACKOFF_MS,
  });
};

bootstrap().catch((error) => {
  logError("worker.bootstrap.failure", {
    message: error.message,
    stack: error.stack,
  });
  process.exitCode = 1;
});
