import type { PrismaClient } from "@prisma/client";

type Last7DayEntry = {
  date: string;
  uploads: number;
  ready: number;
  failed: number;
};

type AdminMediaMetrics = {
  totals: {
    videos: number;
    images: number;
    ready: number;
    failed: number;
    pendingModeration: number;
  };
  last7Days: Last7DayEntry[];
};

const formatDateKey = (value: Date): string => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildDateRange = (days: number): Date[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const range: Date[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    range.push(date);
  }
  return range;
};

const normalizeRowValue = (value: unknown): number => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return 0;
};

export async function getAdminMediaMetrics(prisma: PrismaClient): Promise<AdminMediaMetrics> {
  const [videos, images, ready, failed, pendingModeration] = await Promise.all([
    prisma.mediaAsset.count({ where: { type: "video" } }),
    prisma.mediaAsset.count({ where: { type: "image" } }),
    prisma.mediaAsset.count({ where: { status: "ready" } }),
    prisma.mediaAsset.count({ where: { status: "failed" } }),
    prisma.mediaAsset.count({ where: { moderationStatus: "pending" } }),
  ]);

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - 6);

  const rawRows = await prisma.$queryRaw<Array<{ date: Date; uploads: unknown; ready: unknown; failed: unknown }>>`
    SELECT
      DATE("createdAt") AS date,
      COUNT(*) AS uploads,
      COUNT(*) FILTER (WHERE "status" = 'ready') AS ready,
      COUNT(*) FILTER (WHERE "status" = 'failed') AS failed
    FROM "MediaAsset"
    WHERE "createdAt" >= ${startDate}
    GROUP BY DATE("createdAt")
    ORDER BY DATE("createdAt")
  `;

  const range = buildDateRange(7);
  const statsMap = new Map<string, Last7DayEntry>();
  for (const date of range) {
    const key = formatDateKey(date);
    statsMap.set(key, { date: key, uploads: 0, ready: 0, failed: 0 });
  }

  for (const row of rawRows) {
    const key = formatDateKey(row.date);
    const entry = statsMap.get(key);
    if (!entry) {
      continue;
    }
    entry.uploads = normalizeRowValue(row.uploads);
    entry.ready = normalizeRowValue(row.ready);
    entry.failed = normalizeRowValue(row.failed);
  }

  const last7Days = range.map((date) => statsMap.get(formatDateKey(date)) ?? {
    date: formatDateKey(date),
    uploads: 0,
    ready: 0,
    failed: 0,
  });

  return {
    totals: {
      videos,
      images,
      ready,
      failed,
      pendingModeration,
    },
    last7Days,
  };
}

export type { AdminMediaMetrics };
