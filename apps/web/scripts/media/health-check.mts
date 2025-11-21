import process from "node:process";

import mediaHealthModule from "../../lib/media/health";
import prismaModule from "../../lib/prisma";

type MediaHealthModule = typeof import("../../lib/media/health");
const { getMediaHealth } = mediaHealthModule as MediaHealthModule;
type PrismaModule = typeof import("../../lib/prisma");
const { prisma } = prismaModule as PrismaModule;

const assertNumber = (value: unknown, label: string) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${label} must be a number`);
  }
};

const run = async () => {
  const health = await getMediaHealth();
  assertNumber(health.queue.waiting, "queue.waiting");
  assertNumber(health.database.readyVideos, "database.readyVideos");
  if (!Array.isArray(health.recentFailures)) {
    throw new Error("recentFailures must be an array");
  }
  console.log("media.health OK", JSON.stringify(health.queue));
};

run()
  .catch((error) => {
    console.error("media.health FAILED", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
