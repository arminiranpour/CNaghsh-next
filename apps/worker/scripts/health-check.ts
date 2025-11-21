import process from "node:process";

import { MEDIA_TRANSCODE_QUEUE_NAME } from "../src/queues/mediaTranscode.constants";
import { createQueue } from "../src/lib/queue-connection";
import { prisma } from "../src/lib/prisma";
import { redis } from "../src/lib/redis";

type ComponentStatus = "ok" | "error";

const result = {
  service: "media-worker",
  status: "ok" as ComponentStatus,
  redis: "ok" as ComponentStatus,
  db: "ok" as ComponentStatus,
  queue: "ok" as ComponentStatus,
  timestamp: new Date().toISOString(),
};

const failures: string[] = [];

const fail = (component: "redis" | "db" | "queue", message: string) => {
  result[component] = "error";
  failures.push(`${component}:${message}`);
};

const run = async () => {
  try {
    await redis.ping();
  } catch (error) {
    fail("redis", error instanceof Error ? error.message : "unknown");
  }

  let queue: ReturnType<typeof createQueue> | undefined;
  try {
    queue = createQueue(MEDIA_TRANSCODE_QUEUE_NAME);
    await queue.getJobCounts("waiting", "active", "delayed", "failed");
  } catch (error) {
    fail("queue", error instanceof Error ? error.message : "unknown");
  } finally {
    if (queue) {
      await queue.close();
    }
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    fail("db", error instanceof Error ? error.message : "unknown");
  } finally {
    await prisma.$disconnect();
  }

  try {
    await redis.quit();
  } catch {
  }

  if (failures.length > 0) {
    result.status = "error";
  }

  console.log(JSON.stringify(result));
  if (failures.length > 0) {
    console.error(`health-check failures: ${failures.join(",")}`);
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error("health-check fatal error", error);
  process.exitCode = 1;
});
