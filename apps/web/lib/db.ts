import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

import { env } from "@/lib/env";

type PrismaModule = typeof import("@prisma/client");

const require = createRequire(import.meta.url);

let prismaModule: PrismaModule | null = null;
let attemptedGenerate = false;

function isMissingPrismaClientError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message ?? "";
  const nodeError = error as NodeJS.ErrnoException | undefined;

  return (
    message.includes(".prisma/client") ||
    message.includes("Prisma Client has not been generated") ||
    (nodeError?.code === "MODULE_NOT_FOUND" && message.includes("@prisma/client"))
  );
}

function tryAutoGeneratePrismaClient(): void {
  if (attemptedGenerate) {
    return;
  }

  attemptedGenerate = true;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Prisma Client is not generated. Run `pnpm --filter @app/web prisma generate` during your build step.",
    );
  }

  try {
    console.info("[prisma] Prisma Client not found. Running `prisma generate` once...");
    const prismaCli = require.resolve("prisma/build/index.js");
    const result = spawnSync(process.execPath, [prismaCli, "generate"], {
      stdio: "inherit",
      cwd: process.cwd(),
      env: process.env,
    });

    if (result.status !== 0) {
      throw new Error(
        "Automatic Prisma Client generation failed. Run `pnpm --filter @app/web prisma generate` and retry.",
      );
    }
  } catch (error) {
    const details =
      error instanceof Error ? error.message : JSON.stringify(error);
    const baseMessage =
      "Unable to generate Prisma Client automatically. Run `pnpm --filter @app/web prisma generate` " +
      "(or reinstall dependencies with scripts enabled).";

    throw new Error(details ? `${baseMessage}\nOriginal error: ${details}` : baseMessage);
  }
}

function loadPrismaModule(): PrismaModule {
  if (prismaModule) {
    return prismaModule;
  }

  try {
    const prismaModuleExport = require("@prisma/client") as PrismaModule;
    prismaModule = prismaModuleExport;
    return prismaModuleExport;
  } catch (error) {
    if (!isMissingPrismaClientError(error)) {
      throw error;
    }

    tryAutoGeneratePrismaClient();
    try {
      const prismaModuleExport = require("@prisma/client") as PrismaModule;
      prismaModule = prismaModuleExport;
      return prismaModuleExport;
    } catch (retryError) {
      const details =
        retryError instanceof Error
          ? retryError.message
          : JSON.stringify(retryError);
      throw new Error(
        "Prisma Client could not be loaded even after generating it. " +
          "Run `pnpm --filter @app/web prisma generate`." +
          (details ? `\nOriginal error: ${details}` : ""),
      );
    }
  }
}

const { PrismaClient } = loadPrismaModule();

type PrismaClientInstance = InstanceType<typeof PrismaClient>;

type GlobalWithPrisma = typeof globalThis & {
  prisma?: PrismaClientInstance;
};

const globalForPrisma = globalThis as GlobalWithPrisma;

function resolveDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const schema = parsed.searchParams.get("schema");

    if (!schema || schema.trim().length === 0) {
      parsed.searchParams.set("schema", "public");

      if (process.env.NODE_ENV !== "test") {
        console.warn(
          "[prisma] DATABASE_URL missing schema parameter. Defaulting to \"public\".",
        );
      }

      return parsed.toString();
    }

    return url;
  } catch (error) {
    console.warn(
      "[prisma] Failed to parse DATABASE_URL. Falling back to the raw value.",
      error instanceof Error ? error.message : error,
    );
    return url;
  }
}

const databaseUrl = resolveDatabaseUrl(env.DATABASE_URL);

const createClient = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  }) as PrismaClientInstance;
};

export const prisma: PrismaClientInstance = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
