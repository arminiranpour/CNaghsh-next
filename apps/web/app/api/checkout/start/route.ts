import { NextRequest } from "next/server";

import { startCheckoutSession } from "@/lib/billing/checkout";
import { ProviderName } from "@/lib/billing/providerAdapters/types";
import { badRequest, ok, safeJson, serverError } from "@/lib/http";

const isProviderName = (value: string): value is ProviderName => {
  return value === "zarinpal" || value === "idpay" || value === "nextpay";
};

export async function POST(request: NextRequest) {
  const parsed = await safeJson<unknown>(request);
  if (!parsed.ok) {
    return badRequest("Invalid JSON");
  }

  const body = parsed.data;
  if (!body || typeof body !== "object") {
    return badRequest("Invalid JSON");
  }

  const { userId, provider, priceId, returnUrl } = body as Record<string, unknown>;

  if (typeof userId !== "string" || userId.trim().length === 0) {
    return badRequest("Invalid JSON");
  }
  if (typeof provider !== "string" || !isProviderName(provider)) {
    return badRequest("Invalid JSON");
  }

  if (typeof priceId !== "string" || priceId.trim().length === 0) {
    return badRequest("Invalid JSON");
  }

  try {
    const result = await startCheckoutSession({
      userId,
      priceId,
      provider,
      returnUrl: typeof returnUrl === "string" ? returnUrl : undefined,
    });

    return ok({
      sessionId: result.sessionId,
      redirectUrl: result.redirectUrl,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "PRICE_NOT_FOUND") {
        return badRequest("Price not found");
      }

      if (error.message === "UNKNOWN_PROVIDER") {
        return badRequest("Invalid JSON");
      }
    }

    return serverError("Failed to start checkout");
  }
}
