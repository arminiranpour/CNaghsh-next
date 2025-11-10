// apps/web/vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

export default defineConfig({
  root: repoRoot,
  test: {
    environment: "node",
    globals: true,
    include: [
      "apps/web/lib/**/*.test.{ts,tsx}",
      "apps/web/**/*.test.{ts,tsx}",
    ],
    setupFiles: [path.resolve(__dirname, "vitest.setup.ts")],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      thresholds: {
        statements: 0.65,
        branches: 0.55,
        functions: 0.6,
        lines: 0.65,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "server-only": path.resolve(__dirname, "./test/mocks/server-only.ts"),
    },
  },
});
