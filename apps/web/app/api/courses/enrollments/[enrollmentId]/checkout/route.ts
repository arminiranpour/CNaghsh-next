import { NextRequest, NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth/session";
import type { ProviderName } from "@/lib/billing/provider.types";
import { createCourseCheckoutSession } from "@/lib/courses/payments";
import { badRequest, ok, safeJson, serverError, unauthorized } from "@/lib/http";

const parseInstallmentIndex = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = Math.trunc(value);
    if (parsed >= 1) {
      return parsed;
    }
    return null;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
};

const isProviderName = (value: unknown): value is ProviderName => {
  return value === "zarinpal" || value === "idpay" || value === "nextpay";
};

const parseBody = async (request: NextRequest) => {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const parsed = await safeJson<Record<string, unknown>>(request);
    if (!parsed.ok) {
      return { ok: false as const };
    }

    return { ok: true as const, data: parsed.data };
  }

  try {
    const formData = await request.formData();
    const data: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    return { ok: true as const, data };
  } catch (error) {
    return { ok: false as const };
  }
};

const isJsonRequest = (request: NextRequest) => {
  const accept = request.headers.get("accept") ?? "";
  const contentType = request.headers.get("content-type") ?? "";
  return accept.includes("application/json") || contentType.includes("application/json");
};

const mapErrorMessage = (code: string) => {
  switch (code) {
    case "ENROLLMENT_NOT_FOUND":
      return "ثبت‌نام پیدا نشد.";
    case "FORBIDDEN":
      return "اجازه دسترسی ندارید.";
    case "INVALID_ENROLLMENT_STATUS":
      return "وضعیت ثبت‌نام معتبر نیست.";
    case "PAYMENT_MODE_MISMATCH":
      return "روش پرداخت با انتخاب شما همخوانی ندارد.";
    case "ALREADY_PAID":
      return "پرداخت قبلاً ثبت شده است.";
    case "COURSE_NOT_PUBLISHED":
      return "دوره منتشر نشده است.";
    case "SEMESTER_NOT_OPEN":
      return "ترم برای پرداخت باز نیست.";
    case "UNSUPPORTED_CURRENCY":
      return "ارز پشتیبانی نمی‌شود.";
    case "INSTALLMENTS_DISABLED":
      return "پرداخت اقساطی فعال نیست.";
    case "INVALID_INSTALLMENT":
      return "قسط انتخابی معتبر نیست.";
    case "INVALID_AMOUNT":
      return "مبلغ معتبر نیست.";
    case "UNKNOWN_PROVIDER":
      return "درگاه پرداخت معتبر نیست.";
    case "INVALID_PAYMENT_MODE":
      return "روش پرداخت معتبر نیست.";
    default:
      return "عملیات ناموفق بود.";
  }
};

type Params = {
  params: { enrollmentId: string };
};

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    if (isJsonRequest(request)) {
      return unauthorized("ابتدا وارد شوید.");
    }
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  const parsed = await parseBody(request);
  if (!parsed.ok) {
    return badRequest("درخواست نامعتبر است.");
  }

  const { paymentMode, installmentIndex, provider, returnUrl } = parsed.data;

  if (paymentMode !== "lumpsum" && paymentMode !== "installments") {
    return badRequest(mapErrorMessage("INVALID_PAYMENT_MODE"));
  }

  const parsedInstallmentIndex = parseInstallmentIndex(installmentIndex);
  const parsedProvider = isProviderName(provider) ? provider : undefined;

  try {
    const result = await createCourseCheckoutSession({
      enrollmentId: params.enrollmentId,
      userId: session.user.id,
      paymentMode,
      installmentIndex: parsedInstallmentIndex,
      provider: parsedProvider,
      returnUrl: typeof returnUrl === "string" ? returnUrl : undefined,
    });

    if (isJsonRequest(request)) {
      return ok({
        sessionId: result.sessionId,
        redirectUrl: result.redirectUrl,
        returnUrl: result.returnUrl,
      });
    }

    return NextResponse.redirect(result.redirectUrl);
  } catch (error) {
    if (error instanceof Error) {
      const message = mapErrorMessage(error.message);
      if (isJsonRequest(request)) {
        return badRequest(message);
      }
      return NextResponse.redirect(new URL("/courses/payment/failure", request.url));
    }

    return serverError("خطا در ایجاد پرداخت.");
  }
}
