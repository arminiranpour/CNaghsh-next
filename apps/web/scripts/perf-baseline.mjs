#!/usr/bin/env node
import lighthouse from "lighthouse";
import chromeLauncher from "chrome-launcher";

const baseUrl = process.env.PERF_BASELINE_URL ?? "http://localhost:3000";
const paths = ["/profiles", "/jobs"];

async function runLighthouse(url) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu"],
  });

  try {
    const result = await lighthouse(
      url,
      {
        port: chrome.port,
        output: "json",
        onlyCategories: ["performance"],
        logLevel: "error",
      },
      {
        extends: "lighthouse:default",
        settings: {
          formFactor: "desktop",
          screenEmulation: {
            disabled: true,
          },
        },
      }
    );

    return result.lhr;
  } finally {
    await chrome.kill();
  }
}

async function main() {
  for (const path of paths) {
    const target = new URL(path, baseUrl).toString();
    process.stdout.write(`Running Lighthouse for ${target}...\n`);
    try {
      const lhr = await runLighthouse(target);
      const performanceScore = Math.round((lhr.categories.performance.score ?? 0) * 100);
      const lcp = lhr.audits["largest-contentful-paint"]?.displayValue ?? "n/a";
      const cls = lhr.audits["cumulative-layout-shift"]?.displayValue ?? "n/a";

      console.log(`→ ${path} | Performance: ${performanceScore} | LCP: ${lcp} | CLS: ${cls}`);
    } catch (error) {
      console.error(`Failed to run Lighthouse for ${target}:`, error);
    }
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
  console.error("perf-baseline script failed:", error);
  process.exitCode = 1;
});
