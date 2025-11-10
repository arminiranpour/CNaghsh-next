import { NextRequest, NextResponse } from "next/server";

import { processDueJobs } from "@/lib/notifications/jobs";
import { queueSubscriptionExpiryReminders } from "@/lib/notifications/reminders";

export const dynamic = "force-dynamic";

const RATE_LIMIT_MS = 30_000;
let lastRunAt: number | null = null;

export async function POST(request: NextRequest) {
  const providedSecret = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  if (lastRunAt && now - lastRunAt < RATE_LIMIT_MS) {
    return NextResponse.json({
      ok: true,
      rateLimited: true,
      remindersQueued: 0,
      jobsProcessed: 0,
    });
  }

  lastRunAt = now;

  try {
    const remindersEnabled = process.env.NOTIFICATIONS_REMINDERS_ENABLED !== "0";
    const queued = remindersEnabled ? await queueSubscriptionExpiryReminders() : 0;

    let processed = 0;
    const batchSize = 25;
    const maxBatches = 10;

    for (let iteration = 0; iteration < maxBatches; iteration += 1) {
      const handled = await processDueJobs(batchSize);
      processed += handled;

      if (handled < batchSize) {
        break;
      }
    }

    return NextResponse.json({
      ok: true,
      remindersQueued: queued,
      remindersEnabled,
      jobsProcessed: processed,
    });
  } catch (error) {
    console.error("cron:notifications", error);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
