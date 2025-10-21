#!/usr/bin/env tsx

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { syncAllSubscriptions } from "@/lib/billing/entitlementSync";
import { prisma } from "@/lib/prisma";

async function main() {
  const summary = await syncAllSubscriptions();
  const result = { ok: true, ...summary };

  console.log(JSON.stringify(result, null, 2));

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(__dirname, "..", "..", "..");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportDir = path.join(
    repoRoot,
    "reports",
    "sprint-verification",
    timestamp,
  );

  await mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, "billing-entitlements.json");
  await writeFile(reportPath, JSON.stringify(result, null, 2), "utf8");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
