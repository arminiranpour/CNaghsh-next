import "server-only";

import { buildAbsoluteUrl } from "@/lib/url";

import type {
  CheckoutSessionError,
  CheckoutSessionResponse,
  CheckoutSessionResult,
} from "./types";

const buildUrl = (sessionId: string) => {
  try {
    return buildAbsoluteUrl(`/api/checkout/${sessionId}`);
  } catch (error) {
    return null;
  }
};

export async function fetchCheckoutSession(
  sessionId: string,
): Promise<CheckoutSessionResult> {
  const url = buildUrl(sessionId);
  if (!url) {
    return { error: "تنظیم PUBLIC_BASE_URL الزامی است." } satisfies CheckoutSessionError;
  }

  try {
    const response = await fetch(url, {
      cache: "no-store",
    });

    if (response.status === 404) {
      return null;
    }

    const data = (await response.json()) as
      | CheckoutSessionResponse
      | CheckoutSessionError;

    if (!response.ok) {
      if ("error" in data && data.error) {
        return { error: data.error } satisfies CheckoutSessionError;
      }

      return {
        error: "امکان دریافت وضعیت پرداخت وجود ندارد.",
      } satisfies CheckoutSessionError;
    }

    if (!("id" in data) || !("status" in data)) {
      return {
        error: "پاسخ نامعتبر از سرور دریافت شد.",
      } satisfies CheckoutSessionError;
    }

    return data;
  } catch (error) {
    return {
      error: "خطا در برقراری ارتباط با سرور.",
    } satisfies CheckoutSessionError;
  }
}