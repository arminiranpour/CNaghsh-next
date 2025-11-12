import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

type EnvFile = {
  path: string;
  override: boolean;
};

let initialized = false;

const parseEnvFile = (contents: string) => {
  const values = new Map<string, string>();
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
    values.set(key, value);
  }
  return values;
};

const applyEnvFile = (file: EnvFile, env: Map<string, string>) => {
  for (const [key, value] of env) {
    if (file.override || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

const loadStorageEnv = () => {
  if (initialized) {
    return;
  }
  const scriptDir = fileURLToPath(new URL(".", import.meta.url));
  const appRoot = resolve(scriptDir, "..", "..");
  const envFiles: EnvFile[] = [
    { path: resolve(appRoot, ".env"), override: false },
    { path: resolve(appRoot, ".env.local"), override: true },
  ];
  for (const file of envFiles) {
    if (!existsSync(file.path)) {
      continue;
    }
    const contents = readFileSync(file.path, "utf8");
    const values = parseEnvFile(contents);
    applyEnvFile(file, values);
  }
  initialized = true;
};

export { loadStorageEnv };
