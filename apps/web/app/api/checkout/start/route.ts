import { CheckoutStatus, Provider } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { providers } from "@/lib/billing/providers";
import { ProviderName } from "@/lib/billing/providers/types";
import { prisma } from "@/lib/db";

const isProviderName = (value: string): value is ProviderName => {
  return value === "zarinpal" || value === "idpay" || value === "nextpay";
};

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { userId, provider, priceId, returnUrl } = body as Record<string, unknown>;
  if (typeof userId !== "string" || !userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }
  if (typeof provider !== "string" || !isProviderName(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }
  if (typeof priceId !== "string" || !priceId) {
    return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
  }
  const adapter = providers[provider];
  const price = await prisma.price.findFirst({
    where: { id: priceId, active: true },
  });
  if (!price) {
    return NextResponse.json({ error: "Price not found" }, { status: 404 });
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
  const baseUrl = process.env.PUBLIC_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: "Missing PUBLIC_BASE_URL" }, { status: 500 });
  }
  const resolvedReturnUrl = typeof returnUrl === "string" && returnUrl ? returnUrl : `${baseUrl}/checkout/${session.id}/success`;
  let startResult;
  try {
    startResult = adapter.start({
      sessionId: session.id,
      amount: price.amount,
      currency: "IRR",
      returnUrl: resolvedReturnUrl,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to start checkout" }, { status: 500 });
  }
  await prisma.checkoutSession.update({
    where: { id: session.id },
    data: {
      redirectUrl: startResult.redirectUrl,
      returnUrl: resolvedReturnUrl,
    },
  });
  return NextResponse.json({ sessionId: session.id, redirectUrl: startResult.redirectUrl });
}