"use server";

import { z } from "zod";
import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/lib/auth/session";
import { createCourseCheckoutSession } from "@/lib/courses/payments";

const paymentModeSchema = z.enum(["lumpsum", "installments"]);

const parseInstallmentIndex = (value: FormDataEntryValue | null) => {
  if (!value) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = Math.trunc(value);
    return parsed >= 1 ? parsed : null;
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

const resolveErrorCode = (error: unknown) => {
  if (error instanceof z.ZodError) {
    return "INVALID_PAYMENT_MODE";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "UNKNOWN_ERROR";
};

const appendSearchParams = (path: string, params: URLSearchParams) => {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${params.toString()}`;
};

export async function startEnrollmentCheckoutAction(
  enrollmentId: string,
  returnPath: string,
  formData: FormData,
) {
  const session = await getServerAuthSession();
  const userId = session?.user?.id;

  if (!userId) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(returnPath)}`);
  }

  const parsedMode = paymentModeSchema.safeParse(formData.get("paymentMode"));
  if (!parsedMode.success) {
    const params = new URLSearchParams({
      payment: "error",
      reason: "INVALID_PAYMENT_MODE",
    });
    redirect(appendSearchParams(returnPath, params));
  }
  const installmentIndex = parseInstallmentIndex(formData.get("installmentIndex"));

  try {
    const result = await createCourseCheckoutSession({
      enrollmentId,
      userId,
      paymentMode: parsedMode.data,
      installmentIndex,
    });
    redirect(result.redirectUrl);
  } catch (error) {
    const code = resolveErrorCode(error);
    const params = new URLSearchParams({
      payment: "error",
      reason: code,
    });
    redirect(appendSearchParams(returnPath, params));
  }
}
