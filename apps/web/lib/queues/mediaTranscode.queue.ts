import { Queue } from "bullmq";

import { MEDIA_TRANSCODE_QUEUE_NAME, type MediaTranscodeJobData } from "@acme/contracts/queues/mediaTranscode";

import { getRedis, isRedisEnabled } from "@/lib/redis";

export const createMediaTranscodeQueue = () => {
  const redis = getRedis();
  if (!redis) {
    return null;
  }
  return new Queue<MediaTranscodeJobData>(MEDIA_TRANSCODE_QUEUE_NAME, {
    connection: redis.duplicate(),
  });
};

export const isMediaTranscodeEnabled = () => isRedisEnabled();
