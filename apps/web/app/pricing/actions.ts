"use server";

import { startRenewalCheckout } from "@/lib/billing/dashboard";
import { getServerAuthSession } from "@/lib/auth/session";

const PRICING_PATH = "/pricing";

export type RenewSubscriptionResult =
  | { ok: true; data: { sessionId: string; redirectUrl: string } }
  | { ok: false; error: string };

export async function renewSubscriptionFromPricing({
  cadence,
}: {
  cadence: string;
}): Promise<RenewSubscriptionResult> {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return { ok: false, error: "برای تمدید ابتدا وارد شوید." };
  }

  try {
    const result = await startRenewalCheckout({
      userId: session.user.id,
      provider: "zarinpal",
      returnUrl: `${PRICING_PATH}?cadence=${cadence}`,
    });

    return {
      ok: true,
      data: {
        sessionId: result.sessionId,
        redirectUrl: result.redirectUrl,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "SUBSCRIPTION_NOT_FOUND") {
        return { ok: false, error: "اشتراک فعالی برای تمدید یافت نشد." };
      }
      if (error.message === "ACTIVE_PRICE_NOT_FOUND") {
        return { ok: false, error: "قیمت فعال برای تمدید در دسترس نیست." };
      }
    }

    return {
      ok: false,
      error: "تمدید انجام نشد. لطفاً دوباره تلاش کنید.",
    };
  }
}
