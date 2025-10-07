import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..", "");

const envFiles: Array<{ path: string; override: boolean }> = [
  { path: resolve(appRoot, ".env"), override: false },
  { path: resolve(appRoot, ".env.local"), override: true },
  { path: resolve(appRoot, "prisma/.env"), override: true },
];

for (const { path, override } of envFiles) {
  if (existsSync(path)) {
    dotenv.config({ path, override });
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
