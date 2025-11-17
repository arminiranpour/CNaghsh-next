import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/admin";
import { NO_STORE_HEADERS } from "@/lib/http";
import { getMediaHealth } from "@/lib/media/health";
import { logError, logInfo } from "@/lib/logging";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession();
    const payload = await getMediaHealth();
    return NextResponse.json(payload, { headers: NO_STORE_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    if (message === "ADMIN_SESSION_REQUIRED" || message === "ADMIN_ACCESS_DENIED") {
      logInfo("admin.media.health.unauthorized", { message });
      return NextResponse.json(
        { error: "UNAUTHORIZED" },
        { status: 401, headers: NO_STORE_HEADERS },
      );
    }
    const stack = error instanceof Error ? error.stack : undefined;
    logError("admin.media.health.failure", {
      message,
      stack,
    });
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error);
    }
    return NextResponse.json(
      { error: "ERROR" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
