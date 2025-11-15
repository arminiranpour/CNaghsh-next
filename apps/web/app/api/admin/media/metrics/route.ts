import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/admin";
import { NO_STORE_HEADERS } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getAdminMediaMetrics } from "@/lib/media/admin/metrics";

export async function GET() {
  await requireAdminSession();
  const metrics = await getAdminMediaMetrics(prisma);
  return NextResponse.json(metrics, { headers: NO_STORE_HEADERS });
}
