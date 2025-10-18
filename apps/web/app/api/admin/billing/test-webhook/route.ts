import { NextRequest } from "next/server";

import { runWebhookSimulation, type ProviderName } from "@/app/api/webhooks/shared";
import { prisma } from "@/lib/prisma";
import { badRequest, ok, safeJson, unauthorized } from "@/lib/http";

const SECRET_HEADER = "webhook-test-secret";
const ADMIN_HEADER = "x-admin-user-id";

const isProvider = (value: string): value is ProviderName => {
  return value === "zarinpal" || value === "idpay" || value === "nextpay";
};

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.WEBHOOK_TEST_SECRET;
  const providedSecret = request.headers.get(SECRET_HEADER);

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return unauthorized("Invalid secret");
  }

  const adminId = request.headers.get(ADMIN_HEADER);
  if (!adminId) {
    return unauthorized("Missing admin");
  }

  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin || admin.role !== "ADMIN") {
    return unauthorized("Admin required");
  }

  const parsed = await safeJson<unknown>(request);
  if (!parsed.ok) {
    return badRequest("Invalid JSON");
  }

  const body = parsed.data;
  if (!body || typeof body !== "object") {
    return badRequest("Invalid JSON");
  }

  const { provider, payload } = body as {
    provider?: unknown;
    payload?: unknown;
  };

  if (typeof provider !== "string" || !isProvider(provider)) {
    return badRequest("Invalid provider");
  }

  if (!payload || typeof payload !== "object") {
    return badRequest("Invalid payload");
  }

  const result = await runWebhookSimulation(provider, payload as Record<string, unknown>);
  return ok({ ok: true, result });
}
