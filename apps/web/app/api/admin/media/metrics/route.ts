import { NextRequest, NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/admin";
import { NO_STORE_HEADERS } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getAdminMediaMetrics } from "@/lib/media/admin/metrics";

const METRICS_SECRET_HEADER = "x-admin-metrics-secret";

const hasMetricsBypass = (request: NextRequest): boolean => {
  const expectedSecret = process.env.ADMIN_MEDIA_METRICS_SECRET;
  if (!expectedSecret || expectedSecret.length === 0) {
    return false;
  }
  const providedSecret =
    request.headers.get(METRICS_SECRET_HEADER) ?? request.nextUrl.searchParams.get("secret");
  return providedSecret === expectedSecret;
};

export async function GET(request: NextRequest) {
  if (!hasMetricsBypass(request)) {
    await requireAdminSession();
  }
  const metrics = await getAdminMediaMetrics(prisma);
  return NextResponse.json(metrics, { headers: NO_STORE_HEADERS });
}
