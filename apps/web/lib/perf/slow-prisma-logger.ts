import type { PrismaClient } from "@prisma/client";

type SlowLoggerOptions = {
  thresholdMs?: number;
};

const instrumentedClients = new WeakSet<PrismaClient>();

type PrismaQueryEvent = {
  query?: string;
  params?: string;
  target?: string | null;
  duration?: number;
};

type PrismaMiddlewareParams = {
  model?: string | null;
  action?: string | null;
  [key: string]: unknown;
};

type PrismaMiddlewareNext = (params: PrismaMiddlewareParams) => Promise<unknown>;

type PrismaClientWithInstrumentation = PrismaClient & {
  $on(eventType: "query", callback: (event: PrismaQueryEvent) => void): void;
  $use?: (middleware: (params: PrismaMiddlewareParams, next: PrismaMiddlewareNext) => Promise<unknown>) => void;
};

export function initPrismaSlowLogger(
  prisma: PrismaClient,
  options: SlowLoggerOptions = {},
): void {
  if (instrumentedClients.has(prisma)) {
    return;
  }
  instrumentedClients.add(prisma);

  const thresholdMs = options.thresholdMs ?? 200;
  const instrumentedPrisma = prisma as PrismaClientWithInstrumentation;

  const handleQueryEvent = (event: PrismaQueryEvent) => {
    const durationMs = typeof event.duration === "number" ? event.duration : undefined;

    if (durationMs !== undefined && durationMs >= thresholdMs) {
      console.warn("[perf:db] slow_query", {
        durationMs,
        query: event.query,
        params: event.params,
        target: event.target,
      });
    }
  };

  try {
    instrumentedPrisma.$on("query", handleQueryEvent);
  } catch (error) {
    // Fallback for environments without granular query events.
    instrumentedPrisma.$use?.(async (params, next) => {
      const startedAt = Date.now();
      const result = await next(params);
      const durationMs = Date.now() - startedAt;
      if (durationMs >= thresholdMs) {
        console.warn("[perf:db] slow_query", {
          durationMs,
          model: params.model,
          action: params.action,
        });
      }
      return result;
    });
    if (process.env.NODE_ENV !== "test") {
      console.info("[perf:db] slow_logger_fallback", {
        reason: "query event unavailable",
        thresholdMs,
      });
    }
    return;
  }
}
