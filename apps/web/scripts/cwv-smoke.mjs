#!/usr/bin/env node
const baseUrl = process.env.CWV_BASE_URL ?? "http://localhost:3000";
const paths = ["/profiles", "/jobs"];

async function inspectUrl(path) {
  const target = new URL(path, baseUrl).toString();
  process.stdout.write(`Fetching ${target}...\n`);

  try {
    const response = await fetch(target, {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent": "cwv-smoke/1.0",
      },
    });

    const cacheControl = response.headers.get("cache-control") ?? "n/a";
    const age = response.headers.get("age") ?? "n/a";
    const xCache = response.headers.get("x-cache") ?? "n/a";

    console.log(`→ ${path} | cache-control: ${cacheControl} | age: ${age} | x-cache: ${xCache}`);
  } catch (error) {
    console.error(`Failed to fetch ${target}:`, error);
  }
}

async function main() {
  for (const path of paths) {
    // eslint-disable-next-line no-await-in-loop
    await inspectUrl(path);
  }

  console.log("\nVerification hints:");
  console.log("  pnpm -w dev");
  console.log("  pnpm -F @app/web run perf:baseline");
  console.log("  curl -sI http://localhost:3000/logo.svg | grep -iE 'cache-control|etag|last-modified'");
  console.log("  ORCH_BYPASS_CACHE=1 pnpm -F @app/web run search:smoke");
  console.log("  pnpm -F @app/web run cwv:smoke");
  console.log("  PRISMA_SLOW_LOG=1 pnpm -w dev");
}

main().catch((error) => {
  console.error("cwv-smoke script failed:", error);
  process.exitCode = 1;
});
