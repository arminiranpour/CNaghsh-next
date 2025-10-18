import { NextRequest } from "next/server";

import { providers } from "@/lib/billing/providerAdapters";
import { ProviderName } from "@/lib/billing/providerAdapters/types";
import { prisma } from "@/lib/db";
import { badRequest, ok, safeJson, serverError } from "@/lib/http";
import { sanitizeReturnUrl } from "@/lib/url";
import { CheckoutStatus, Provider } from "@/lib/prismaEnums";

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
  const adapter = providers[provider];
    if (!adapter) {
    return badRequest("Invalid JSON");
  }

  const price = await prisma.price.findFirst({
    where: { id: priceId, active: true },
  });

  if (!price) {
    return badRequest("Price not found");
  }

  const session = await prisma.checkoutSession.create({
    data: {
      userId,
      provider: provider as Provider,
      priceId,
      status: CheckoutStatus.STARTED,
      redirectUrl: "",
      returnUrl: "",
      providerInitPayload: {},
    },
  });
  const fallbackPath = `/checkout/${session.id}/success`;
  const resolvedReturnUrl = sanitizeReturnUrl(
    typeof returnUrl === "string" ? returnUrl : undefined,
    fallbackPath,
  );

  let startResult;
  try {
    startResult = adapter.start({
      sessionId: session.id,
      amount: price.amount,
      currency: "IRR",
      returnUrl: resolvedReturnUrl,
    });
  } catch (error) {
    return serverError("Failed to start checkout");
  }
  try {
    await prisma.checkoutSession.update({
      where: { id: session.id },
      data: {
        redirectUrl: startResult.redirectUrl,
        returnUrl: resolvedReturnUrl,
      },
    });
  } catch (error) {
    return serverError("Failed to persist checkout session");
  }

  return ok({
    sessionId: session.id,
    redirectUrl: startResult.redirectUrl,
  });
}