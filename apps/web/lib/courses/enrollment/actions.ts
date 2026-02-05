"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getServerAuthSession } from "@/lib/auth/session";
import { createCourseCheckoutSession } from "@/lib/courses/payments";

const paymentModeSchema = z.enum(["lumpsum", "installments"]);

function buildSemesterUrl(courseId: string, semesterId: string) {
  return `/courses/${courseId}/semesters/${semesterId}`;
}

const appendSearchParams = (path: string, params: URLSearchParams) => {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${params.toString()}`;
};

const redirectWithError = (path: string, reason: string): never => {
  const params = new URLSearchParams({
    enrollment: "error",
    reason,
  });
  redirect(appendSearchParams(path, params));
};

export async function startEnrollmentAction(
  courseId: string,
  semesterId: string,
  formData: FormData
) {
  const semesterUrl = buildSemesterUrl(courseId, semesterId);
  const session = await getServerAuthSession();
  const userId = session?.user?.id;

  if (!userId) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(semesterUrl)}`);
  }

  const parsed = paymentModeSchema.safeParse(formData.get("paymentMode"));
  const paymentMode = parsed.success ? parsed.data : null;
  if (!paymentMode) {
    redirectWithError(semesterUrl, "INVALID_PAYMENT_MODE");
  }
  const resolvedPaymentMode = paymentMode as z.infer<typeof paymentModeSchema>;

  const course = await prisma.course.findFirst({
    where: { id: courseId, status: "published" },
    select: { id: true },
  });

  if (!course) {
    redirectWithError(semesterUrl, "COURSE_NOT_PUBLISHED");
  }

  const semester = await prisma.semester.findFirst({
    where: { id: semesterId, courseId },
    select: {
      status: true,
      installmentPlanEnabled: true,
      installmentCount: true,
    },
  });

  if (!semester) {
    redirectWithError(semesterUrl, "SEMESTER_NOT_FOUND");
  }

  const resolvedSemester = semester as NonNullable<typeof semester>;

  if (resolvedSemester.status !== "open") {
    const code = resolvedSemester.status === "closed" ? "SEMESTER_CLOSED" : "SEMESTER_NOT_OPEN";
    redirectWithError(semesterUrl, code);
  }

  if (
    resolvedPaymentMode === "installments" &&
    (!resolvedSemester.installmentPlanEnabled ||
      !resolvedSemester.installmentCount ||
      resolvedSemester.installmentCount < 2)
  ) {
    redirectWithError(semesterUrl, "INSTALLMENTS_DISABLED");
  }

  const existingEnrollment = await prisma.enrollment.findUnique({
    where: {
      semesterId_userId: {
        semesterId,
        userId,
      },
    },
    select: { id: true, status: true },
  });

  if (existingEnrollment?.status === "active") {
    redirectWithError(semesterUrl, "ALREADY_PAID");
  }

  const enrollment = existingEnrollment
    ? await prisma.enrollment.update({
        where: { id: existingEnrollment.id },
        data: {
          status: "pending_payment",
          chosenPaymentMode: resolvedPaymentMode,
        },
        select: { id: true },
      })
    : await prisma.enrollment.create({
        data: {
          semesterId,
          userId,
          status: "pending_payment",
          chosenPaymentMode: resolvedPaymentMode,
        },
        select: { id: true },
      });

  revalidatePath("/dashboard/courses");

  try {
    const checkout = await createCourseCheckoutSession({
      enrollmentId: enrollment.id,
      userId,
      paymentMode: resolvedPaymentMode,
    });
    redirect(`/checkout/${checkout.sessionId}`);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    const reason = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    console.error("startEnrollmentAction", { reason, courseId, semesterId, userId });
    redirectWithError(semesterUrl, reason);
  }
}
