const { default: lighthouse } = await import("lighthouse");
const { launch } = await import("chrome-launcher");

const baseUrl =
  process.env.PUBLIC_BASE_URL ??
  process.env.NEXT_PUBLIC_BASE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.BASE_URL ??
  process.env.NEXTAUTH_URL;

if (!baseUrl) {
  throw new Error("PUBLIC_BASE_URL (or equivalent) must be configured before running the perf baseline script.");
}

const normalizedBaseUrl = `${baseUrl.replace(/\/+$/, "")}/`;

const TARGETS = [
  { label: "profiles", url: new URL("/profiles", normalizedBaseUrl).toString() },
  { label: "jobs", url: new URL("/jobs", normalizedBaseUrl).toString() },
];

async function main() {
  const chrome = await launch({
    chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu"],
  });

  try {
    for (const target of TARGETS) {
      await auditUrl(chrome.port, target);
    }
  } finally {
    await chrome.kill();
  }

  echoVerification();
}

async function auditUrl(port, target) {
  const runnerResult = await lighthouse(
    target.url,
    {
      port,
      logLevel: "error",
      onlyCategories: ["performance"],
    },
  );

  const lhr = runnerResult.lhr;
  const performanceScore = Math.round((lhr.categories.performance?.score ?? 0) * 100);
  const lcp = lhr.audits["largest-contentful-paint"]?.displayValue ?? "n/a";
  const cls = lhr.audits["cumulative-layout-shift"]?.displayValue ?? "n/a";

  console.log(`→ ${target.url} | Performance: ${performanceScore} | LCP: ${lcp} | CLS: ${cls}`);
}

function echoVerification() {
  const commands = [
    "pnpm -w dev",
    "pnpm -F @app/web run perf:baseline",
    "pnpm -F @app/web run cwv:smoke",
    `curl -sI ${new URL("/logo.svg", normalizedBaseUrl).toString()} | grep -iE 'cache-control|etag|last-modified'`,
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
