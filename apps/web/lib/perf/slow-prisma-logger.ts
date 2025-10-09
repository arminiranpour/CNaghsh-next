import type { PrismaClient } from "@prisma/client";

type SlowLoggerOptions = {
  thresholdMs?: number;
};

const instrumentedClients = new WeakSet<PrismaClient>();

export function initPrismaSlowLogger(
  prisma: PrismaClient,
  options: SlowLoggerOptions = {},
): void {
  if (instrumentedClients.has(prisma)) {
    return;
  }
  instrumentedClients.add(prisma);

  const thresholdMs = options.thresholdMs ?? 200;
  const pending = new Map<string, number[]>();

  const recordStart = (event: { query?: string; params?: string; target?: string | null }) => {
    const key = buildKey(event);
    const bucket = pending.get(key);
    const timestamp = Date.now();

    if (bucket) {
      bucket.push(timestamp);
    } else {
      pending.set(key, [timestamp]);
    }
  };

  const recordEnd = (event: { query?: string; params?: string; target?: string | null; duration?: number }) => {
    const key = buildKey(event);
    const bucket = pending.get(key);
    let durationMs: number | undefined =
      typeof event.duration === "number" ? event.duration : undefined;

    if (!durationMs && bucket && bucket.length > 0) {
      const startedAt = bucket.shift();
      if (typeof startedAt === "number") {
        durationMs = Date.now() - startedAt;
      }
      if (bucket.length === 0) {
        pending.delete(key);
      }
    }

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
    prisma.$on(
      "query-end" as Parameters<PrismaClient["$on"]>[0],
      recordEnd as Parameters<PrismaClient["$on"]>[1],
    );
    prisma.$on("query", recordStart as Parameters<PrismaClient["$on"]>[1]);
  } catch (error) {
    // Fallback for environments without granular query events.
    prisma.$use(async (params, next) => {
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
        reason: "query-end event unavailable",
        thresholdMs,
      });
    }
    return;
  }
}

function buildKey(event: { query?: string; params?: string; target?: string | null }): string {
  const query = event.query ?? "";
  const params = event.params ?? "";
  const target = event.target ?? "";
  return `${target}|${query}|${params}`;
}
