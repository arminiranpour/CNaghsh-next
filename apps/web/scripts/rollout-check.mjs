#!/usr/bin/env node

const baseUrl =
  process.env.PUBLIC_BASE_URL ??
  process.env.NEXT_PUBLIC_BASE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.BASE_URL ??
  process.env.NEXTAUTH_URL;

if (!baseUrl) {
  throw new Error("PUBLIC_BASE_URL (or equivalent) must be configured before running rollout checks.");
}

function parseFlags(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((flag) => flag.trim().toLowerCase())
    .filter(Boolean);
}

function logHeaderSummary(url, headers) {
  const cacheControl = headers.get("cache-control");
  const age = headers.get("age");
  const nextCache = headers.get("x-nextjs-cache");
  console.log(`→ ${url}`);
  console.log(`  cache-control: ${cacheControl ?? "(missing)"}`);
  if (age) {
    console.log(`  age: ${age}`);
  }
  if (nextCache) {
    console.log(`  x-nextjs-cache: ${nextCache}`);
  }
}

async function ensureOk(path) {
  const url = new URL(path, baseUrl).toString();
  const response = await fetch(url, {
    headers: {
      "user-agent": "qa-rollout-check/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`${url} responded with ${response.status}`);
  }

  return response;
}

async function main() {
  const publicFlags = parseFlags(process.env.NEXT_PUBLIC_FLAGS);
  const serverFlags = parseFlags(process.env.FLAGS);
  const flags = Array.from(new Set([...publicFlags, ...serverFlags])).sort();

  console.log(`Flags: ${flags.join(", ") || "(none)"}`);
  console.log("");

  try {
    const healthResponse = await ensureOk("/api/health");
    const payload = await healthResponse.json();
    if (!payload.ok) {
      throw new Error("Health check returned ok=false");
    }
    console.log(`Health: ok (ts=${payload.ts ?? "unknown"}${payload.version ? `, version=${payload.version}` : ""})`);
  } catch (error) {
    console.error(`Health check failed: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const staticTargets = ["/robots.txt", "/sitemap.xml"];
  for (const path of staticTargets) {
    try {
      const response = await ensureOk(path);
      console.log(`${path}: ${response.status}`);
      logHeaderSummary(path, response.headers);
    } catch (error) {
      console.error(`Failed to fetch ${path}: ${error.message}`);
      process.exitCode = 1;
    }
  }

  const pages = ["/profiles", "/jobs"];
  for (const path of pages) {
    try {
      const response = await ensureOk(path);
      logHeaderSummary(path, response.headers);
    } catch (error) {
      console.error(`Failed to fetch ${path}: ${error.message}`);
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
