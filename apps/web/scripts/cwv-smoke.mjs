import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const { default: lighthouse } = await import("lighthouse");
const { launch } = await import("chrome-launcher");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const REPORT_DIR = path.resolve(__dirname, "../reports/core-web-vitals");
const ROUTE_REPORT_DIR = path.join(REPORT_DIR, "routes");
const SUMMARY_PATH = path.join(REPORT_DIR, "latest.json");

const baseUrl =
  process.env.PUBLIC_BASE_URL ??
  process.env.NEXT_PUBLIC_BASE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.BASE_URL ??
  process.env.NEXTAUTH_URL;

if (!baseUrl) {
  throw new Error(
    "PUBLIC_BASE_URL (or equivalent) must be configured before running the CWV smoke script.",
  );
}

const normalizedBaseUrl = `${baseUrl.replace(/\/+$/, "")}/`;

const budgetsModule = await import(
  pathToFileURL(
    path.resolve(__dirname, "../config/core-web-vitals.budgets.ts"),
  ).href,
);
const CORE_WEB_VITALS_BUDGETS =
  budgetsModule.CORE_WEB_VITALS_BUDGETS ?? [];

// Match first /profiles/... link
const PROFILE_DETAIL_LINK_RE = new RegExp(
  String.raw`href=["'](\/profiles\/[\w-]+)["']`,
  "i",
);

// Match any /jobs/... link (UUID, slug, etc.)
const JOB_DETAIL_LINK_RE = new RegExp(
  String.raw`href=["'](\/jobs\/[^"']+)["']`,
  "i",
);

const ROUTE_SAMPLES = new Map([
  [
    "/profiles/[id]",
    () => resolveFromListing("/profiles", PROFILE_DETAIL_LINK_RE),
  ],
  [
    "/jobs/[id]",
    () => resolveFromListing("/jobs", JOB_DETAIL_LINK_RE),
  ],
]);

await fs.mkdir(REPORT_DIR, { recursive: true });
await fs.mkdir(ROUTE_REPORT_DIR, { recursive: true });

async function resolveFromListing(listPath, matcher) {
  const url = new URL(listPath, normalizedBaseUrl).toString();
  const response = await fetch(url, {
    headers: {
      "user-agent": "cwv-smoke/1.0",
    },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to load ${url} for sample resolution (status ${response.status}).`,
    );
  }
  const html = await response.text();
  const match = html.match(matcher);
  if (!match?.[1]) {
    console.warn(
      `[cwv:smoke] No detail link found on ${url}; falling back to listing for this route.`,
    );
    return null;
  }
  return match[1];
}

async function resolveRouteToUrl(route) {
  // Static route (no dynamic segment)
  if (!route.includes("[")) {
    return new URL(route, normalizedBaseUrl).toString();
  }

  const resolver = ROUTE_SAMPLES.get(route);
  if (!resolver) {
    throw new Error(`No resolver defined for dynamic route "${route}".`);
  }

  const resolvedPath = await resolver();

  // If no detail link found (e.g. there are 0 jobs), fall back to the listing page
  if (!resolvedPath) {
    let fallbackPath = "/";
    if (route.startsWith("/jobs")) {
      fallbackPath = "/jobs";
    } else if (route.startsWith("/profiles")) {
      fallbackPath = "/profiles";
    }

    console.warn(
      `[cwv:smoke] Falling back to "${fallbackPath}" as sample URL for route "${route}".`,
    );
    return new URL(fallbackPath, normalizedBaseUrl).toString();
  }

  return new URL(resolvedPath, normalizedBaseUrl).toString();
}

function slugifyRoute(route) {
  const slug = route
    .replace(/^\//, "")
    .replace(/\//g, "-")
    .replace(/[\\[\\]]/g, "");
  return slug.length ? slug : "root";
}

function formatNumber(value, unit) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "n/a";
  }
  return unit === "ms" ? `${Math.round(value)}` : value.toFixed(3);
}

function buildTable(rows) {
  const headers = ["Route", "LCP (ms)", "CLS", "INP (ms)", "Status"];
  const columnWidths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => String(row[index]).length)),
  );
  const renderRow = (row) =>
    row
      .map((cell, index) => {
        const value = String(cell);
        return value.padEnd(columnWidths[index], " ");
      })
      .join(" | ");
  const line = columnWidths.map((width) => "-".repeat(width)).join("-+-");
  return [renderRow(headers), line, ...rows.map(renderRow)].join("\n");
}

async function writePerRouteReport(route, payload) {
  const slug = slugifyRoute(route);
  const filename = path.join(ROUTE_REPORT_DIR, `${slug}.json`);
  await fs.writeFile(filename, JSON.stringify(payload, null, 2));
}

async function writeSummary(results) {
  const payload = {
    generatedAt: new Date().toISOString(),
    baseUrl: normalizedBaseUrl,
    results,
  };
  await fs.writeFile(SUMMARY_PATH, JSON.stringify(payload, null, 2));
}

async function auditRoute(port, url) {
  const runnerResult = await lighthouse(
    url,
    {
      port,
      logLevel: "error",
      output: "json",
      onlyCategories: ["performance"],
    },
    {
      extends: "lighthouse:default",
      settings: {
        formFactor: "mobile",
        screenEmulation: {
          mobile: true,
          width: 360,
          height: 640,
          deviceScaleFactor: 3,
          disabled: false,
        },
        throttling: {
          rttMs: 70,
          throughputKbps: 14336,
          cpuSlowdownMultiplier: 4,
          downloadThroughputKbps: 14336,
          uploadThroughputKbps: 4096,
        },
        throttlingMethod: "simulate",
      },
    },
  );

  const report =
    typeof runnerResult.report === "string"
      ? runnerResult.report
      : Array.isArray(runnerResult.report)
        ? runnerResult.report[0]
        : JSON.stringify(runnerResult.lhr);

  const lhr = runnerResult.lhr;
  const lcp =
    lhr.audits["largest-contentful-paint"]?.numericValue ?? null;
  const cls =
    lhr.audits["cumulative-layout-shift"]?.numericValue ?? null;
  const inp =
    lhr.audits["experimental-interaction-to-next-paint"]
      ?.numericValue ?? null;

  return { report, metrics: { lcp, cls, inp } };
}

async function main() {
  const chrome = await launch({
    chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu"],
  });

  const rows = [];
  const summaryResults = [];
  let hasFailure = false;

  try {
    for (const budget of CORE_WEB_VITALS_BUDGETS) {
      const targetUrl = await resolveRouteToUrl(budget.route);
      console.log(`Running Lighthouse for ${budget.route} (${targetUrl})`);
      const { report, metrics } = await auditRoute(chrome.port, targetUrl);

      await writePerRouteReport(budget.route, {
        route: budget.route,
        testedUrl: targetUrl,
        metrics,
        budget,
      });

      const failures = [];
      if (typeof metrics.lcp === "number" && metrics.lcp > budget.lcpMs) {
        failures.push(`LCP ${Math.round(metrics.lcp)}ms > ${budget.lcpMs}ms`);
      }
      if (typeof metrics.cls === "number" && metrics.cls > budget.cls) {
        failures.push(`CLS ${metrics.cls.toFixed(3)} > ${budget.cls}`);
      }
      if (typeof metrics.inp === "number" && metrics.inp > budget.inpMs) {
        failures.push(`INP ${Math.round(metrics.inp)}ms > ${budget.inpMs}ms`);
      }

      if (failures.length) {
        hasFailure = true;
        console.error(
          `[cwv:smoke] ${budget.route} failed: ${failures.join(", ")}`,
        );
      }

      rows.push([
        budget.route,
        formatNumber(metrics.lcp, "ms"),
        formatNumber(metrics.cls, ""),
        formatNumber(metrics.inp, "ms"),
        failures.length ? "FAIL" : "PASS",
      ]);

      summaryResults.push({
        route: budget.route,
        testedUrl: targetUrl,
        metrics,
        budget,
        passed: failures.length === 0,
      });

      const slug = slugifyRoute(budget.route);
      const lhrPath = path.join(ROUTE_REPORT_DIR, `${slug}.lhr.json`);
      await fs.writeFile(lhrPath, report);
    }
  } finally {
    await chrome.kill();
  }

  await writeSummary(summaryResults);

  console.log("\nCore Web Vitals budget summary:");
  console.log(buildTable(rows));

  if (hasFailure) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
