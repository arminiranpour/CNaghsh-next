import { prisma } from "@/lib/db";
import { initPrismaSlowLogger } from "@/lib/perf/slow-prisma-logger";

if (process.env.NODE_ENV !== "production" && process.env.PRISMA_SLOW_LOG === "1") {
  initPrismaSlowLogger(prisma);
}

export { prisma };
