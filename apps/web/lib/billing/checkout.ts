import "server-only";

import type { ProviderName } from "@/lib/billing/provider.types";
import { providers } from "@/lib/billing/providerAdapters";
import { prisma } from "@/lib/db";
import { CheckoutStatus, Provider } from "@/lib/prismaEnums";
import { sanitizeReturnUrl } from "@/lib/url";

export type StartCheckoutSessionResult = {
  sessionId: string;
  redirectUrl: string;
  returnUrl: string;
};

export async function startCheckoutSession({
  userId,
  priceId,
  provider,
  returnUrl,
}: {
  userId: string;
  priceId: string;
  provider: ProviderName;
  returnUrl?: string;
}): Promise<StartCheckoutSessionResult> {
  const adapter = providers[provider];
  if (!adapter) {
    throw new Error("UNKNOWN_PROVIDER");
  }

  const price = await prisma.price.findFirst({
    where: { id: priceId, active: true },
    select: { id: true, amount: true, currency: true },
  });

  if (!price) {
    throw new Error("PRICE_NOT_FOUND");
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
  const resolvedReturnUrl = sanitizeReturnUrl(returnUrl, fallbackPath);

  if (price.currency !== "IRR") {
    throw new Error("UNSUPPORTED_CURRENCY");
  }

  const startResult = await adapter.start({
    sessionId: session.id,
    amount: price.amount,
    currency: price.currency,
    returnUrl: resolvedReturnUrl,
  });

  await prisma.checkoutSession.update({
    where: { id: session.id },
    data: {
      redirectUrl: startResult.redirectUrl,
      returnUrl: resolvedReturnUrl,
    },
  });

  return {
    sessionId: session.id,
    redirectUrl: startResult.redirectUrl,
    returnUrl: resolvedReturnUrl,
  };
}
