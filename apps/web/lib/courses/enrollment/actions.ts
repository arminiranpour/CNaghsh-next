"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getServerAuthSession } from "@/lib/auth/session";

const paymentModeSchema = z.enum(["lumpsum", "installments"]);

function buildSemesterUrl(courseId: string, semesterId: string) {
  return `/courses/${courseId}/semesters/${semesterId}`;
}

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
  if (!parsed.success) {
    redirect(`${semesterUrl}?enrollment=error`);
  }

  const course = await prisma.course.findFirst({
    where: { id: courseId, status: "published" },
    select: { id: true },
  });

  if (!course) {
    redirect(`${semesterUrl}?enrollment=error`);
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
    redirect(`${semesterUrl}?enrollment=error`);
  }

  if (semester.status !== "open") {
    const code = semester.status === "closed" ? "closed" : "error";
    redirect(`${semesterUrl}?enrollment=${code}`);
  }

  if (
    parsed.data === "installments" &&
    (!semester.installmentPlanEnabled ||
      !semester.installmentCount ||
      semester.installmentCount < 2)
  ) {
    redirect(`${semesterUrl}?enrollment=error`);
  }

  await prisma.enrollment.upsert({
    where: {
      semesterId_userId: {
        semesterId,
        userId,
      },
    },
    create: {
      semesterId,
      userId,
      status: "pending_payment",
      chosenPaymentMode: parsed.data,
    },
    update: {
      status: "pending_payment",
      chosenPaymentMode: parsed.data,
    },
  });

  revalidatePath("/dashboard/courses");
  redirect(`${semesterUrl}?enrollment=success`);
}
