import { Queue } from "bullmq";

import { redis } from "@/lib/redis";

const QUEUE_NAME = "media.transcode";

const queue = new Queue(QUEUE_NAME, {
  connection: redis,
});

export const enqueueTranscode = async (mediaAssetId: string, attempt = 1): Promise<void> => {
  const jobId = `media.transcode:${mediaAssetId}:${attempt}`;
  await queue.add(
    QUEUE_NAME,
    { mediaAssetId, attempt },
    {
      jobId,
      removeOnComplete: true,
    },
  );
};
