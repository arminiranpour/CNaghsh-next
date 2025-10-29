const baseUrl =
  process.env.PUBLIC_BASE_URL ??
  process.env.NEXT_PUBLIC_BASE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.BASE_URL ??
  process.env.NEXTAUTH_URL;

if (!baseUrl) {
  throw new Error("PUBLIC_BASE_URL (or equivalent) must be configured before running the CWV smoke script.");
}

const normalizedBaseUrl = `${baseUrl.replace(/\/+$/, "")}/`;

const TARGETS = [
  new URL("/profiles", normalizedBaseUrl).toString(),
  new URL("/jobs", normalizedBaseUrl).toString(),
];

async function main() {
  for (const url of TARGETS) {
    await inspectUrl(url);
  }

  echoVerification();
}

async function inspectUrl(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    const xCache = response.headers.get("x-cache") ?? "n/a";
    const age = response.headers.get("age") ?? "n/a";
    const cacheControl = response.headers.get("cache-control") ?? "n/a";

    console.log(`→ ${url} | x-cache: ${xCache} | age: ${age} | cache-control: ${cacheControl}`);
  } catch (error) {
    console.error("[cwv:smoke] fetch_failed", {
      url,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function echoVerification() {
  const commands = [
    "pnpm -w dev",
    "pnpm -F @app/web run perf:baseline",
    "pnpm -F @app/web run cwv:smoke",
    "ORCH_BYPASS_CACHE=1 pnpm -F @app/web run search:smoke",
    "PRISMA_SLOW_LOG=1 pnpm -w dev",
  ];

  console.log("\nVerification cheatsheet:");
  for (const command of commands) {
    console.log(`  ${command}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
