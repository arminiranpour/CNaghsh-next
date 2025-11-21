import process from "node:process";

import { TranscodeJobStatus } from "@prisma/client";

import mediaTranscodeModule from "../../lib/queues/mediaTranscode.queue";
import prismaModule from "../../lib/prisma";

type MediaTranscodeModule = typeof import("../../lib/queues/mediaTranscode.queue");
const { createMediaTranscodeQueue } = mediaTranscodeModule as MediaTranscodeModule;
type PrismaModule = typeof import("../../lib/prisma");
const { prisma } = prismaModule as PrismaModule;

const MAX_WAITING_JOBS = 100;
const MAX_FAILED_JOBS_LAST_HOUR = 5;
const LOOKBACK_MINUTES = 60;

const run = async () => {
  const queue = createMediaTranscodeQueue();
  try {
    const counts = await queue.getJobCounts("waiting", "delayed", "failed");
    const waiting = counts.waiting ?? 0;
    const delayed = counts.delayed ?? 0;
    const failed = counts.failed ?? 0;
    const failedLastHour = await prisma.transcodeJob.count({
      where: {
        status: TranscodeJobStatus.failed,
        finishedAt: {
          gte: new Date(Date.now() - LOOKBACK_MINUTES * 60_000),
        },
      },
    });
    if (waiting > MAX_WAITING_JOBS || failedLastHour > MAX_FAILED_JOBS_LAST_HOUR) {
      const issue = { waiting, delayed, failed, failedLastHour };
      console.error(`ALERT media.pipeline issue=${JSON.stringify(issue)}`);
      process.exitCode = 1;
    } else {
      console.log(
        `OK media.pipeline waiting=${waiting} delayed=${delayed} failed=${failed} failedLastHour=${failedLastHour}`,
      );
    }
  } finally {
    await prisma.$disconnect();
    await queue.close();
  }
};

run().catch((error) => {
  console.error("ALERT media.pipeline fatal", error);
  process.exitCode = 1;
});
