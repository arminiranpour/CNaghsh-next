import { Queue } from "bullmq";

import { MEDIA_TRANSCODE_QUEUE_NAME, type MediaTranscodeJobData } from "@acme/contracts/queues/mediaTranscode";

import { redis } from "@/lib/redis";

export const createMediaTranscodeQueue = () =>
  new Queue<MediaTranscodeJobData>(MEDIA_TRANSCODE_QUEUE_NAME, {
    connection: redis.duplicate(),
  });
