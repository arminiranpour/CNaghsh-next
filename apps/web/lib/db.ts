import { PrismaClient } from "@prisma/client";

import { env } from "@/lib/env";

type GlobalWithPrisma = typeof globalThis & {
  prisma?: PrismaClient;
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
  });
};

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
