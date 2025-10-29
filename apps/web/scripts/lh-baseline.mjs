import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { default: lighthouse } = await import("lighthouse");
const { launch } = await import("chrome-launcher");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = path.resolve(__dirname, "../docs/seo/reports/baseline");
const baseUrl =
  process.env.PUBLIC_BASE_URL ??
  process.env.NEXT_PUBLIC_BASE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.BASE_URL ??
  process.env.NEXTAUTH_URL;

if (!baseUrl) {
  throw new Error("PUBLIC_BASE_URL (or equivalent) must be configured before running the Lighthouse baseline.");
}

const normalizedBaseUrl = `${baseUrl.replace(/\/+$/, "")}/`;

const TARGETS = [
  { name: "profiles", url: new URL("/profiles", normalizedBaseUrl).toString() },
  { name: "jobs", url: new URL("/jobs", normalizedBaseUrl).toString() },
];

async function main() {
  await fs.mkdir(REPORT_DIR, { recursive: true });

  const chrome = await launch({ chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu"] });

  try {
    for (const target of TARGETS) {
      await auditUrl(chrome.port, target);
    }
  } finally {
    await chrome.kill();
  }
}

async function auditUrl(port, target) {
  const runnerResult = await lighthouse(
    target.url,
    {
      port,
      output: ["html", "json"],
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    },
  );

  const reports = Array.isArray(runnerResult.report) ? runnerResult.report : [runnerResult.report];
  const [htmlReport, jsonReport] = reports;

  const htmlPath = path.join(REPORT_DIR, `${target.name}.html`);
  const jsonPath = path.join(REPORT_DIR, `${target.name}.json`);

  await fs.writeFile(htmlPath, htmlReport);
  await fs.writeFile(jsonPath, jsonReport);

  const lhr = runnerResult.lhr;
  const performanceScore = Math.round((lhr.categories.performance?.score ?? 0) * 100);
  const lcp = lhr.audits["largest-contentful-paint"]?.displayValue ?? "n/a";
  const cls = lhr.audits["cumulative-layout-shift"]?.displayValue ?? "n/a";

  console.log(
    `→ ${target.url} | Performance: ${performanceScore} | LCP: ${lcp} | CLS: ${cls}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
