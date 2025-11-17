import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { CoreWebVitalsBudget } from "../config/core-web-vitals.budgets";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SUMMARY_PATH = path.resolve(__dirname, "../reports/core-web-vitals/latest.json");
const budgetsModule = await import(
  pathToFileURL(path.resolve(__dirname, "../config/core-web-vitals.budgets.ts")).href,
);
const CORE_WEB_VITALS_BUDGETS: CoreWebVitalsBudget[] =
  budgetsModule.CORE_WEB_VITALS_BUDGETS ?? [];

function formatMetric(value: unknown, unit: "ms" | "ratio") {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "n/a";
  }
  return unit === "ms" ? `${Math.round(value)}` : value.toFixed(3);
}

function renderTable(rows: string[][]) {
  const headers = ["Route", "LCP (ms)", "CLS", "INP (ms)", "Status"];
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index]?.length ?? 0)),
  );
  const padRow = (cols: string[]) =>
    cols
      .map((cell, idx) => cell.padEnd(widths[idx], " "))
      .join(" | ");
  const line = widths.map((width) => "-".repeat(width)).join("-+-");
  return [padRow(headers), line, ...rows.map(padRow)].join("\n");
}

type SummaryPayload = {
  generatedAt?: string;
  results?: {
    route: string;
    testedUrl?: string;
    metrics?: { lcp: number | null; cls: number | null; inp: number | null };
    budget?: { lcpMs: number; cls: number; inpMs: number };
    passed?: boolean;
  }[];
};

async function loadSummary(): Promise<SummaryPayload | null> {
  try {
    const raw = await fs.readFile(SUMMARY_PATH, "utf8");
    const data = JSON.parse(raw) as SummaryPayload;
    return data;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err?.code === "ENOENT") {
      return null;
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Unable to read CWV summary at ${SUMMARY_PATH}: ${message}`);
  }
}

async function main() {
  const summary = await loadSummary();
  if (!summary) {
    console.error(
      `[cwv:budgets] No CWV summary found at ${SUMMARY_PATH}. Run "pnpm --filter @app/web cwv:smoke" first.`,
    );
    process.exitCode = 1;
    return;
  }

  const resultsByRoute = new Map(
    (summary.results ?? []).map((entry) => [entry.route, entry]),
  );

  const rows: string[][] = [];
  let hasFailure = false;

  for (const budget of CORE_WEB_VITALS_BUDGETS) {
    const entry = resultsByRoute.get(budget.route);
    if (!entry) {
      hasFailure = true;
      console.error(`[cwv:budgets] Missing metrics for ${budget.route}. Run cwv:smoke first.`);
      rows.push([budget.route, "—", "—", "—", "MISSING"]);
      continue;
    }

    const metrics = entry.metrics ?? { lcp: null, cls: null, inp: null };
    const failures: string[] = [];

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
      console.error(`[cwv:budgets] ${budget.route} over budget: ${failures.join(", ")}`);
    }

    rows.push([
      budget.route,
      formatMetric(metrics.lcp, "ms"),
      formatMetric(metrics.cls, "ratio"),
      formatMetric(metrics.inp, "ms"),
      failures.length ? "FAIL" : "PASS",
    ]);
  }

  console.log("\nLast CWV run:");
  console.log(renderTable(rows));
  if (summary.generatedAt) {
    console.log(`\nMetrics collected at ${summary.generatedAt}`);
  }

  if (hasFailure) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
