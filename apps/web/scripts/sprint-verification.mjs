#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "../../..");
const reportBaseDir = join(repoRoot, "reports", "sprint-verification");

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const rawArgs = process.argv.slice(2);
const onlyRaw = rawArgs.find((entry) => entry.startsWith("--only="));
const options = {
  skipServerCheck: rawArgs.includes("--skip-server-check"),
  listOnly: rawArgs.includes("--list"),
  only: onlyRaw
    ? onlyRaw
        .slice("--only=".length)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : null,
};

const manualChecks = [
  {
    id: "detail-views",
    title: "Job detail view counter",
    steps: [
      "Open a job detail page in the browser while dev server is running.",
      "Confirm a POST request to `/api/jobs/<id>/views` succeeds (200) without UI errors.",
    ],
  },
  {
    id: "slow-query",
    title: "Prisma slow query logging",
    steps: [
      "Start dev server with `PRISMA_SLOW_LOG=1 pnpm -w dev`.",
      "Trigger list pages and confirm `[perf:db] slow_query` entries appear in the server logs.",
    ],
  },
  {
    id: "robots-staging",
    title: "Robots meta on staging",
    steps: [
      "Launch dev server with `NEXT_PUBLIC_ENV=staging` and load a page.",
      "Verify the rendered HTML includes `<meta name=\"robots\" content=\"noindex, nofollow\">`.",
    ],
  },
  {
    id: "sentry-flags",
    title: "Sentry flag gating",
    steps: [
      "With no `SENTRY_DSN` or without `sentry` flag, confirm the browser console lacks Sentry SDK logs.",
      "With `SENTRY_DSN` and `NEXT_PUBLIC_FLAGS=sentry`, ensure SDK initializes and emits setup logs.",
    ],
  },
];

const tasks = [
  {
    id: "rollout",
    title: "Rollout health + headers",
    command: ["node", "apps/web/scripts/rollout-check.mjs"],
    requiresServer: true,
  },
  {
    id: "seo-baseline",
    title: "SEO baseline",
    command: ["pnpm", "-F", "@app/web", "run", "seo:baseline"],
    requiresServer: true,
  },
  {
    id: "seo-profiles",
    title: "SEO smoke — profiles",
    command: ["pnpm", "-F", "@app/web", "run", "seo:smoke:profiles"],
    requiresServer: true,
  },
  {
    id: "seo-jobs",
    title: "SEO smoke — jobs",
    command: ["pnpm", "-F", "@app/web", "run", "seo:smoke:jobs"],
    requiresServer: true,
  },
  {
    id: "perf-baseline",
    title: "Performance baseline",
    command: ["pnpm", "-F", "@app/web", "run", "perf:baseline"],
    requiresServer: true,
  },
  {
    id: "cwv-smoke",
    title: "CWV smoke",
    command: ["pnpm", "-F", "@app/web", "run", "cwv:smoke"],
    requiresServer: true,
  },
  {
    id: "search-smoke",
    title: "Search smoke (warm cache)",
    command: ["pnpm", "-F", "@app/web", "run", "search:smoke"],
  },
  {
    id: "search-bypass",
    title: "Search smoke (bypass cache)",
    command: ["pnpm", "-F", "@app/web", "run", "search:smoke"],
    env: { ORCH_BYPASS_CACHE: "1" },
  },
  {
    id: "qa-analytics",
    title: "Analytics consent smoke",
    command: ["pnpm", "-F", "@app/web", "run", "qa:analytics"],
    requiresServer: true,
  },
  {
    id: "unit-jsonld",
    title: "Unit test — seo jsonld",
    command: [
      "pnpm",
      "-F",
      "@app/web",
      "test",
      "--run",
      "apps/web/lib/seo/__tests__/jsonld.test.ts",
    ],
  },
  {
    id: "unit-metadata",
    title: "Unit test — metadata routes",
    command: [
      "pnpm",
      "-F",
      "@app/web",
      "test",
      "--run",
      "apps/web/app/__tests__/metadata-routes.test.ts",
    ],
  },
  {
    id: "unit-analytics",
    title: "Unit test — analytics provider",
    command: [
      "pnpm",
      "-F",
      "@app/web",
      "test",
      "--run",
      "apps/web/lib/analytics/__tests__/provider.test.ts",
    ],
  },
];

if (options.only) {
  const validIds = new Set(tasks.map((task) => task.id));
  const unknown = options.only.filter((id) => !validIds.has(id));
  if (unknown.length > 0) {
    console.error(`Unknown task id(s): ${unknown.join(", ")}`);
    printTaskList();
    process.exit(1);
  }
}

if (options.listOnly) {
  printTaskList();
  process.exit(0);
}

mkdirSync(reportBaseDir, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = join(reportBaseDir, timestamp);
mkdirSync(runDir, { recursive: true });

const activeTasks = options.only
  ? tasks.filter((task) => options.only.includes(task.id))
  : tasks;

(async () => {
  console.log(`Sprint verification harness`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Report directory: ${runDir}`);
  console.log("");

  if (!options.skipServerCheck && activeTasks.some((task) => task.requiresServer)) {
    await assertServerHealthy();
    console.log("✔ Dev server reachable (health check passed)");
    console.log("");
  } else if (options.skipServerCheck) {
    console.log("⚠️ Skipping server health check (requested)");
    console.log("");
  }

  const results = [];
  for (const task of activeTasks) {
    // eslint-disable-next-line no-await-in-loop
    const result = await runTask(task);
    results.push(result);
    console.log("");
  }

  const summary = {
    startedAt: timestamp,
    baseUrl,
    tasks: results,
    manualChecks,
  };

  writeFileSync(join(runDir, "summary.json"), JSON.stringify(summary, null, 2));

  console.log("Manual follow-ups:");
  for (const check of manualChecks) {
    console.log(`• ${check.title}`);
  }
  console.log("");

  const failures = results.filter((result) => result.status !== "passed");
  if (failures.length > 0) {
    console.error(`❌ ${failures.length} task(s) failed. See logs in ${runDir}.`);
    process.exitCode = 1;
  } else {
    console.log("✅ All automated tasks passed");
  }
})();

function runTask(task) {
  return new Promise((resolve) => {
    console.log(`▶ ${task.title}`);
    const logPath = join(runDir, `${task.id}.log`);
    const logStream = createWriteStream(logPath);
    const start = performance.now();
    const child = spawn(task.command[0], task.command.slice(1), {
      cwd: repoRoot,
      env: { ...process.env, ...task.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      logStream.write(chunk);
    });

    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
      logStream.write(chunk);
    });

    child.on("close", (code, signal) => {
      logStream.end();
      const durationMs = Math.round(performance.now() - start);
      const status = code === 0 ? "passed" : "failed";
      console.log(`↳ ${task.title} — ${status.toUpperCase()} (${durationMs} ms)`);
      resolve({
        id: task.id,
        title: task.title,
        status,
        exitCode: code,
        signal,
        durationMs,
        logPath,
      });
    });
  });
}

async function assertServerHealthy() {
  const healthUrl = new URL("/api/health", baseUrl);
  try {
    const response = await fetch(healthUrl, {
      headers: { "user-agent": "sprint-verification-harness/1.0" },
    });
    if (!response.ok) {
      throw new Error(`Health endpoint responded with ${response.status}`);
    }
    const payload = await response.json().catch(() => ({}));
    if (payload?.ok !== true) {
      throw new Error("Health endpoint did not return ok=true");
    }
  } catch (error) {
    console.error(`Unable to reach dev server at ${healthUrl.href}`);
    console.error("Start the app with `pnpm -w dev` before running the harness.");
    throw error;
  }
}

function printTaskList() {
  console.log("Available tasks:");
  for (const task of tasks) {
    console.log(`- ${task.id}: ${task.title}`);
  }
}
