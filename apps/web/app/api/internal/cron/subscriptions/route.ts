import { NextRequest, NextResponse } from "next/server";

import { syncAllSubscriptions } from "@/lib/billing/entitlementSync";

export const dynamic = "force-dynamic";

const RATE_LIMIT_MS = 60_000;
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
      usersChecked: 0,
      expiredMarked: 0,
      entitlementsGranted: 0,
      entitlementsRevoked: 0,
      profilesUnpublished: 0,
    });
  }

  lastRunAt = now;

  try {
    const summary = await syncAllSubscriptions();
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("cron:subscriptions", error);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
