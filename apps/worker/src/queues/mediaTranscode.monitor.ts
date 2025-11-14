import type { CompletedEvent, FailedEvent, QueueEvents, StalledEvent } from "bullmq";

import { logger } from "../lib/logger";
import { createQueueEvents } from "../lib/queue-connection";
import { MEDIA_TRANSCODE_QUEUE_NAME } from "./mediaTranscode.constants";

const handleCompleted = (event: CompletedEvent) => {
  logger.info("queue", "Job completed", {
    queue: MEDIA_TRANSCODE_QUEUE_NAME,
    jobId: event.jobId,
    returnvalue: event.returnvalue,
  });
};

const handleFailed = (event: FailedEvent) => {
  logger.error("queue", "Job failed", {
    queue: MEDIA_TRANSCODE_QUEUE_NAME,
    jobId: event.jobId,
    failedReason: event.failedReason,
    prev: event.prev,
  });
};

const handleWaiting = (event: { jobId?: string }) => {
  logger.info("queue", "Job waiting", {
    queue: MEDIA_TRANSCODE_QUEUE_NAME,
    jobId: event.jobId,
  });
};

const handleActive = (event: { jobId?: string }) => {
  logger.info("queue", "Job active", {
    queue: MEDIA_TRANSCODE_QUEUE_NAME,
    jobId: event.jobId,
  });
};

const handleStalled = (event: StalledEvent) => {
  logger.warn("queue", "Job stalled", {
    queue: MEDIA_TRANSCODE_QUEUE_NAME,
    jobId: event.jobId,
  });
};

const handleError = (queueEvents: QueueEvents) => {
  queueEvents.on("error", (error) => {
    logger.error("queue", "Queue events error", {
      queue: MEDIA_TRANSCODE_QUEUE_NAME,
      message: error.message,
      stack: error.stack,
    });
  });
};

export const startMediaTranscodeQueueMonitor = async () => {
  const queueEvents = createQueueEvents(MEDIA_TRANSCODE_QUEUE_NAME);
  queueEvents.on("waiting", handleWaiting);
  queueEvents.on("active", handleActive);
  queueEvents.on("completed", handleCompleted);
  queueEvents.on("failed", handleFailed);
  queueEvents.on("stalled", handleStalled);
  handleError(queueEvents);
  await queueEvents.waitUntilReady();
  logger.info("queue", "Queue events listener ready", {
    queue: MEDIA_TRANSCODE_QUEUE_NAME,
  });
  return queueEvents;
};
