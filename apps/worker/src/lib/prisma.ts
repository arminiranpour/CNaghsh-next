import { PrismaClient } from "@prisma/client";

const resolveDatabaseUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const schema = parsed.searchParams.get("schema");
    if (!schema || schema.trim().length === 0) {
      parsed.searchParams.set("schema", "public");
      return parsed.toString();
    }
    return url;
  } catch (error) {
    return url;
  }
};

const databaseUrl = (() => {
  const value = process.env.DATABASE_URL;
  if (!value || value.trim().length === 0) {
    throw new Error("DATABASE_URL is required");
  }
  return resolveDatabaseUrl(value);
})();

const createClient = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
};

const globalForPrisma = globalThis as unknown as { mediaWorkerPrisma?: PrismaClient };

const prisma = globalForPrisma.mediaWorkerPrisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.mediaWorkerPrisma = prisma;
}

export { prisma };
