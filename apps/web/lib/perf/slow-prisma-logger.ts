import { performance } from "node:perf_hooks";

import type { Prisma, PrismaClient } from "@prisma/client";

export type PrismaSlowLoggerOptions = {
  thresholdMs?: number;
};

const REGISTRY_KEY = Symbol.for("app.prismaSlowLogger");

type SlowLoggerRegistry = typeof globalThis & {
  [REGISTRY_KEY]?: WeakSet<PrismaClient>;
};

function createEventKey(event: Prisma.QueryEvent): string {
  return `${event.target}:${event.timestamp?.valueOf?.() ?? Date.now()}:${event.query}:${event.params}`;
}

function logSlowQuery(event: Prisma.QueryEvent, duration: number, threshold: number) {
  if (duration < threshold) {
    return;
  }

  const formatted = duration.toFixed(1);
  console.warn(
    `[perf:db] slow_query duration=${formatted}ms target=${event.target} query=${event.query} params=${event.params}`
  );
}

export function initPrismaSlowLogger(
  prisma: PrismaClient,
  options: PrismaSlowLoggerOptions = {}
): void {
  const threshold = options.thresholdMs ?? 200;
  const globalRegistry = globalThis as SlowLoggerRegistry;
  const registry = (globalRegistry[REGISTRY_KEY] ??= new WeakSet<PrismaClient>());

  if (registry.has(prisma)) {
    return;
  }

  registry.add(prisma);

  const startTimes = new Map<string, number>();
  let queryEndAvailable = false;

  prisma.$on("query", (event) => {
    const key = createEventKey(event);
    startTimes.set(key, performance.now());

    if (!queryEndAvailable) {
      const duration = event.duration ?? 0;
      logSlowQuery(event, duration, threshold);
      startTimes.delete(key);
    }
  });

  try {
    const queryEndEvent = "query-end" as unknown as Parameters<PrismaClient["$on"]>[0];
    prisma.$on(queryEndEvent, (event: Prisma.QueryEvent) => {
      queryEndAvailable = true;
      const key = createEventKey(event);
      const start = startTimes.get(key);
      startTimes.delete(key);

      const duration =
        start !== undefined ? performance.now() - start : event.duration ?? 0;

      logSlowQuery(event, duration, threshold);
    });
  } catch (error) {
    // Older Prisma versions may not support the "query-end" event.
    queryEndAvailable = false;
  }
}
