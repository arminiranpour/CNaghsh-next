import type { QueueEvents } from "bullmq";

import { logger } from "../lib/logger";
import { createQueueEvents } from "../lib/queue-connection";
import { MEDIA_TRANSCODE_QUEUE_NAME } from "./mediaTranscode.constants";

const readJobId = (event: unknown): string | number | undefined => {
  if (typeof event !== "object" || event === null) {
    return undefined;
  }
  const candidate = event as { jobId?: unknown };
  const jobId = candidate.jobId;
  if (typeof jobId === "string" || typeof jobId === "number") {
    return jobId;
  }
  return undefined;
};

const handleCompleted = (event: unknown) => {
  const jobId = readJobId(event);
  const returnvalue =
    typeof event === "object" && event !== null && "returnvalue" in event
      ? (event as { returnvalue?: unknown }).returnvalue
      : undefined;
  logger.info("queue", "Job completed", {
    queue: MEDIA_TRANSCODE_QUEUE_NAME,
    jobId,
    returnvalue,
  });
};

const handleFailed = (event: unknown) => {
  const jobId = readJobId(event);
  const failedReason =
    typeof event === "object" && event !== null && "failedReason" in event
      ? (event as { failedReason?: unknown }).failedReason
      : undefined;
  const prev =
    typeof event === "object" && event !== null && "prev" in event
      ? (event as { prev?: unknown }).prev
      : undefined;
  logger.error("queue", "Job failed", {
    queue: MEDIA_TRANSCODE_QUEUE_NAME,
    jobId,
    failedReason,
    prev,
  });
};

const handleWaiting = (event: unknown) => {
  logger.info("queue", "Job waiting", {
    queue: MEDIA_TRANSCODE_QUEUE_NAME,
    jobId: readJobId(event),
  });
};

const handleActive = (event: unknown) => {
  logger.info("queue", "Job active", {
    queue: MEDIA_TRANSCODE_QUEUE_NAME,
    jobId: readJobId(event),
  });
};

const handleStalled = (event: unknown) => {
  logger.warn("queue", "Job stalled", {
    queue: MEDIA_TRANSCODE_QUEUE_NAME,
    jobId: readJobId(event),
  });
};

const handleError = (queueEvents: QueueEvents) => {
  queueEvents.on("error", (error: unknown) => {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    logger.error("queue", "Queue events error", {
      queue: MEDIA_TRANSCODE_QUEUE_NAME,
      message: normalizedError.message,
      stack: normalizedError.stack,
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
