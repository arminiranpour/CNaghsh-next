import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..", "");

const envFiles: Array<{ path: string; override: boolean }> = [
  { path: resolve(appRoot, ".env"), override: false },
  { path: resolve(appRoot, ".env.local"), override: true },
  { path: resolve(appRoot, "prisma/.env"), override: true },
];

function parseEnvFile(contents: string): Record<string, string> {
  const env: Record<string, string> = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^([\w.-]+)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    let value = rawValue ?? "";

    if (!value.startsWith("\"") && !value.startsWith("'")) {
      value = value.replace(/\s+#.*$/, "").trim();
    }

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r");

    env[key] = value;
  }

  return env;
}

function loadEnvFile(path: string, override: boolean) {
  const contents = readFileSync(path, "utf8");
  const values = parseEnvFile(contents);

  for (const [key, value] of Object.entries(values)) {
    if (override || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

for (const { path, override } of envFiles) {
  if (existsSync(path)) {
    loadEnvFile(path, override);
  }
}

const require = createRequire(import.meta.url);
const prismaCli = require.resolve("prisma/build/index.js");
const args = process.argv.slice(2);

const result = spawnSync(process.execPath, [prismaCli, ...args], {
  stdio: "inherit",
  cwd: appRoot,
  env: process.env,
});

if (result.error) {
  console.error("Failed to launch Prisma CLI:", result.error.message);
  process.exit(1);
}

process.exit(result.status === null ? 1 : result.status);
