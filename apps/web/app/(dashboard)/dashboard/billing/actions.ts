import { revalidatePath } from "next/cache";

import { getBillingDashboardData, startRenewalCheckout } from "@/lib/billing/dashboard";
import { emitBillingTelemetry } from "@/lib/billing/telemetry";
import {
  SubscriptionNotFoundError,
  setCancelAtPeriodEnd,
} from "@/lib/billing/subscriptionService";
import { getServerAuthSession } from "@/lib/auth/session";
import type { StartCheckoutSessionResult } from "@/lib/billing/checkout";
import { env } from "@/lib/env";

const DASHBOARD_PATH = "/dashboard/billing";

const GENERIC_ERROR = "خطایی رخ داد. لطفاً دوباره تلاش کنید.";
const AUTH_ERROR = "برای مشاهده صورتحساب باید وارد شوید.";
const SUBSCRIPTION_ERROR = "اشتراک فعال برای شما یافت نشد.";
const PRICE_ERROR = "قیمت فعال برای این اشتراک در دسترس نیست.";

async function ensureUserId(): Promise<string> {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    throw new Error(AUTH_ERROR);
  }

  return session.user.id;
}

type BillingActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

type DashboardData = Awaited<ReturnType<typeof getBillingDashboardData>>;

export async function refreshBillingDataAction(): Promise<BillingActionResult<DashboardData>> {
  "use server";
  try {
    const userId = await ensureUserId();
    const data = await getBillingDashboardData(userId);
    return { ok: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : GENERIC_ERROR;
    return { ok: false, error: message };
  }
}

export async function setCancelAtPeriodEndAction(
  flag: boolean,
): Promise<BillingActionResult<DashboardData>> {
  "use server";
  let userId: string;

  try {
    userId = await ensureUserId();
  } catch (error) {
    const message = error instanceof Error ? error.message : GENERIC_ERROR;
    return { ok: false, error: message };
  }

  try {
    const updated = await setCancelAtPeriodEnd({ userId, flag });
    emitBillingTelemetry("billing_sub_cancel_period_end_confirmed", {
      userId,
      cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
      status: updated.status,
    });
    await revalidatePath(DASHBOARD_PATH);
    const data = await getBillingDashboardData(userId);
    return { ok: true, data };
  } catch (error) {
    if (error instanceof SubscriptionNotFoundError) {
      return { ok: false, error: SUBSCRIPTION_ERROR };
    }

    const message = error instanceof Error ? error.message : GENERIC_ERROR;
    return { ok: false, error: message };
  }
}

export async function renewSubscriptionAction(): Promise<
  BillingActionResult<StartCheckoutSessionResult>
> {
  "use server";
  let userId: string;

  try {
    userId = await ensureUserId();
  } catch (error) {
    const message = error instanceof Error ? error.message : GENERIC_ERROR;
    return { ok: false, error: message };
  }

  try {
    const result = await startRenewalCheckout({
      userId,
      provider: "zarinpal",
      returnUrl: `${env.PUBLIC_BASE_URL}${DASHBOARD_PATH}?renewal=success`,
    });
    emitBillingTelemetry("billing_renew_now_clicked", {
      userId,
      sessionId: result.sessionId,
    });
    return { ok: true, data: result };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "SUBSCRIPTION_NOT_FOUND") {
        return { ok: false, error: SUBSCRIPTION_ERROR };
      }
      if (error.message === "ACTIVE_PRICE_NOT_FOUND") {
        return { ok: false, error: PRICE_ERROR };
      }
    }
    return { ok: false, error: GENERIC_ERROR };
  }
}
