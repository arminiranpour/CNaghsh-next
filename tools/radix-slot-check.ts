import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

import {
  collectSourceFiles,
  analyzeSourceFile,
  FixCollector,
  type FixEdit,
  type Violation,
} from "./radix-slot-core";

interface RunOptions {
  include?: string[];
  fix?: boolean;
  jsonPath?: string;
}

interface CliOptions extends RunOptions {
  quiet?: boolean;
}

interface ReportData {
  generatedAt: string;
  filesScanned: number;
  errors: SerializableViolation[];
  suggestions: SerializableViolation[];
  fixesApplied: { filePath: string; description: string }[];
}

interface SerializableViolation {
  filePath: string;
  line: number;
  column: number;
  trigger: string;
  component: string;
  childKind: string;
  message: string;
  severity: "error" | "suggestion";
  fixable: boolean;
  preview: string;
}

interface RunResult {
  filesScanned: number;
  errors: Violation[];
  suggestions: Violation[];
  fixesApplied: { filePath: string; description: string }[];
  reportPath: string;
}
function partitionViolations(violations: Violation[]) {
  const errors: Violation[] = [];
  const suggestions: Violation[] = [];
  for (const violation of violations) {
    if (violation.severity === "error") {
      errors.push(violation);
    } else {
      suggestions.push(violation);
    }
  }
  return { errors, suggestions };
}

function toSerializable(violation: Violation): SerializableViolation {
  return {
    filePath: violation.filePath,
    line: violation.line,
    column: violation.column,
    trigger: violation.triggerLabel,
    component: violation.componentName,
    childKind: violation.childKind,
    message: violation.message,
    severity: violation.severity,
    fixable: violation.fixable,
    preview: violation.preview,
  };
}

function formatTable(violations: Violation[]): string {
  if (violations.length === 0) {
    return "";
  }

  const rows = violations.map((violation) => ({
    location: `${violation.filePath}:${violation.line}`,
    trigger: violation.triggerLabel,
    childKind: violation.childKind,
    preview: violation.preview,
  }));

  const headers = {
    location: "location",
    trigger: "trigger",
    childKind: "child",
    preview: "preview",
  };

  const widths = {
    location: Math.max(headers.location.length, ...rows.map((row) => row.location.length)),
    trigger: Math.max(headers.trigger.length, ...rows.map((row) => row.trigger.length)),
    childKind: Math.max(headers.childKind.length, ...rows.map((row) => row.childKind.length)),
    preview: Math.max(headers.preview.length, ...rows.map((row) => row.preview.length)),
  };

  const lines: string[] = [];
  const divider = `| ${"-".repeat(widths.location)} | ${"-".repeat(widths.trigger)} | ${"-".repeat(widths.childKind)} | ${"-".repeat(widths.preview)} |`;

  lines.push(`| ${pad(headers.location, widths.location)} | ${pad(headers.trigger, widths.trigger)} | ${pad(headers.childKind, widths.childKind)} | ${pad(headers.preview, widths.preview)} |`);
  lines.push(divider);

  for (const row of rows) {
    lines.push(`| ${pad(row.location, widths.location)} | ${pad(row.trigger, widths.trigger)} | ${pad(row.childKind, widths.childKind)} | ${pad(row.preview, widths.preview)} |`);
  }

  return lines.join("\n");
}

function pad(value: string, width: number) {
  if (value.length >= width) {
    return value;
  }
  return value + " ".repeat(width - value.length);
}
export function runRadixCheck(options: RunOptions = {}): RunResult {
  const include = options.include && options.include.length > 0 ? options.include : ["apps"];
  const files = collectSourceFiles({ include });

  const initialViolations = gatherViolations(files);
  let violations = initialViolations.violations;
  const collector = new FixCollector();

  if (options.fix) {
    for (const violation of violations) {
      if (!violation.fixable || !violation.applyFix) {
        continue;
      }
      violation.applyFix(collector);
    }

    if (collector.hasEdits()) {
      applyCollectedEdits(collector.getEdits());
      const refreshed = gatherViolations(files);
      violations = refreshed.violations;
    }
  }

  const partitions = partitionViolations(violations);
  const jsonPath = options.jsonPath ?? path.join(process.cwd(), "reports", "radix-slot-report.json");
  writeReport(jsonPath, files.length, partitions.errors, partitions.suggestions, collector.getSummaries());

  return {
    filesScanned: files.length,
    errors: partitions.errors,
    suggestions: partitions.suggestions,
    fixesApplied: collector.getSummaries(),
    reportPath: jsonPath,
  };
}

function gatherViolations(files: string[]) {
  const violations: Violation[] = [];
  for (const file of files) {
    const fileViolations = analyzeSourceFile(file);
    violations.push(...fileViolations);
  }
  return { violations };
}

function applyCollectedEdits(edits: Map<string, FixEdit[]>) {
  for (const [filePath, fileEdits] of edits.entries()) {
    let content = fs.readFileSync(filePath, "utf8");
    const sorted = [...fileEdits].sort((a, b) => b.start - a.start);
    for (const edit of sorted) {
      content = content.slice(0, edit.start) + edit.newText + content.slice(edit.end);
    }
    fs.writeFileSync(filePath, content, "utf8");
  }
}

function writeReport(
  reportPath: string,
  filesScanned: number,
  errors: Violation[],
  suggestions: Violation[],
  fixesApplied: { filePath: string; description: string }[],
) {
  const reportDir = path.dirname(reportPath);
  fs.mkdirSync(reportDir, { recursive: true });

  const data: ReportData = {
    generatedAt: new Date().toISOString(),
    filesScanned,
    errors: errors.map(toSerializable),
    suggestions: suggestions.map(toSerializable),
    fixesApplied,
  };

  fs.writeFileSync(reportPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
function runCli() {
  const options = parseArgs(process.argv.slice(2));
  const result = runRadixCheck(options);

  if (!options.quiet) {
    console.log("Radix Slot Check Report");
    console.log("========================\n");

    if (result.errors.length === 0) {
      console.log("No blocking violations found.\n");
    } else {
      console.log(`Blocking issues: ${result.errors.length}`);
      console.log(formatTable(result.errors));
      console.log("");
    }

    if (result.suggestions.length > 0) {
      console.log(`Suggestions: ${result.suggestions.length}`);
      console.log(formatTable(result.suggestions));
      console.log("");
    }

    if (options.fix) {
      if (result.fixesApplied.length > 0) {
        console.log("Applied fixes:");
        for (const fix of result.fixesApplied) {
          console.log(`- ${fix.filePath}: ${fix.description}`);
        }
        console.log("");
      } else {
        console.log("No automatic fixes were applied.\n");
      }

      const diff = spawnSync("git", ["diff", "--stat"], { encoding: "utf8" });
      if (diff.stdout.trim()) {
        console.log(diff.stdout.trim());
        console.log("");
      }
    }

    console.log(`JSON report written to ${path.relative(process.cwd(), result.reportPath)}`);
  }

  process.exitCode = result.errors.length > 0 ? 1 : 0;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};
  const include: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--fix") {
      options.fix = true;
      continue;
    }
    if (arg === "--quiet") {
      options.quiet = true;
      continue;
    }
    if (arg === "--json") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("--json option requires a path argument");
      }
      options.jsonPath = path.resolve(value);
      i += 1;
      continue;
    }
    if (arg === "--include") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("--include option requires a path argument");
      }
      include.push(value);
      i += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    include.push(arg);
  }

  if (include.length > 0) {
    options.include = include;
  }

  return options;
}

function printHelp() {
  console.log(`Usage: tsx tools/radix-slot-check.ts [options]

Options:
  --fix             Apply automatic fixes where safe
  --json <path>     Write JSON report to the specified path
  --include <dir>   Restrict analysis to one or more paths
  --quiet           Suppress console output (exit code still set)
  -h, --help        Show this help message
`);
}

if (require.main === module) {
  try {
    runCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
