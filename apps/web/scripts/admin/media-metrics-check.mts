import "../storage/env-loader";

import { createRequire } from "module";

import { PrismaClient } from "@prisma/client";

type AdminMediaMetricsModule = typeof import("../../lib/media/admin/metrics");

const require = createRequire(import.meta.url);
const { getAdminMediaMetrics } = require("../../lib/media/admin/metrics") as AdminMediaMetricsModule;

const prisma = new PrismaClient();

const assertTotals = (totals: Record<string, unknown>) => {
  const keys = ["videos", "images", "ready", "failed", "pendingModeration"] as const;
  for (const key of keys) {
    const value = totals[key];
    if (typeof value !== "number" || Number.isNaN(value)) {
      throw new Error(`Invalid totals.${key} value: ${value}`);
    }
  }
};

const assertLast7Days = (entries: Array<Record<string, unknown>>) => {
  if (!Array.isArray(entries)) {
    throw new Error("last7Days must be an array");
  }
  for (const entry of entries) {
    const date = entry.date;
    const uploads = entry.uploads;
    const ready = entry.ready;
    const failed = entry.failed;
    if (typeof date !== "string" || date.length === 0) {
      throw new Error(`Invalid last7Days.date value: ${date}`);
    }
    for (const [key, value] of [
      ["uploads", uploads],
      ["ready", ready],
      ["failed", failed],
    ] as const) {
      if (typeof value !== "number" || Number.isNaN(value)) {
        throw new Error(`Invalid last7Days.${key} value: ${value}`);
      }
    }
  }
};

async function run() {
  const metrics = await getAdminMediaMetrics(prisma);
  assertTotals(metrics.totals as Record<string, unknown>);
  assertLast7Days(metrics.last7Days as Array<Record<string, unknown>>);

  console.log("Media totals:");
  console.log(JSON.stringify(metrics.totals, null, 2));
  console.log("\nLast 7 days:");
  for (const entry of metrics.last7Days) {
    console.log(`${entry.date} → uploads=${entry.uploads}, ready=${entry.ready}, failed=${entry.failed}`);
  }
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
