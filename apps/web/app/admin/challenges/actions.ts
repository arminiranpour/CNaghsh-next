"use server";

import { z } from "zod";
import { ChallengeParticipationStatus, ChallengeStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getServerAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type FieldErrors<TFields extends string> = Partial<Record<TFields, string>>;

export type ActionResult<TFields extends string> =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: FieldErrors<TFields> };

export type ChallengeFormValues = {
  title: string;
  location: string;
  summary: string;
  startDate: string;
  endDate: string;
  conditions: string;
  mediaLengthLimitSec: number | null;
  instructions: string;
  priceIrr: number;
  prerequisite: string;
  howHeld: string;
  sideNote?: string;
  status?: ChallengeStatus;
};

const CHALLENGE_LIST_PATH = "/admin/challenges";

const dateSchema = z
  .string()
  .trim()
  .min(1, "تاریخ الزامی است.")
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "تاریخ معتبر نیست.");

const challengeSchema = z.object({
  title: z.string().trim().min(1, "عنوان الزامی است."),
  location: z.string().trim().min(1, "محل برگزاری الزامی است."),
  summary: z.string().trim().min(1, "خلاصه الزامی است."),
  startDate: dateSchema,
  endDate: dateSchema,
  conditions: z.string().trim().min(1, "شرایط شرکت الزامی است."),
  mediaLengthLimitSec: z.number().int().positive().nullable(),
  instructions: z.string().trim().min(1, "توضیحات الزامی است."),
  priceIrr: z.number().int().min(0, "قیمت معتبر نیست."),
  prerequisite: z.string().trim().min(1, "پیش‌نیاز الزامی است."),
  howHeld: z.string().trim().min(1, "نحوه برگزاری الزامی است."),
  sideNote: z.string().trim().optional(),
  status: z.nativeEnum(ChallengeStatus).optional(),
});

const participantStatusSchema = z.object({
  status: z.nativeEnum(ChallengeParticipationStatus),
});

async function ensureAdmin() {
  const session = await getServerAuthSession();
  const user = session?.user;
  if (!user || user.role !== "ADMIN") {
    notFound();
  }
  return user;
}

function mapZodError<TFields extends string>(error: z.ZodError, fallback: string) {
  const fieldErrors: FieldErrors<TFields> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key as TFields]) {
      fieldErrors[key as TFields] = issue.message;
    }
  }
  return { error: fallback, fieldErrors };
}

function normalizeChallengeValues(values: ChallengeFormValues) {
  return {
    ...values,
    title: values.title.trim(),
    location: values.location.trim(),
    summary: values.summary.trim(),
    startDate: new Date(values.startDate),
    endDate: new Date(values.endDate),
    conditions: values.conditions.trim(),
    instructions: values.instructions.trim(),
    priceIrr: values.priceIrr,
    prerequisite: values.prerequisite.trim(),
    howHeld: values.howHeld.trim(),
    sideNote: values.sideNote?.trim() || null,
    mediaLengthLimitSec: values.mediaLengthLimitSec,
  };
}

function buildChallengeValidationErrors(values: ChallengeFormValues) {
  const fieldErrors: FieldErrors<keyof ChallengeFormValues> = {};
  const startDate = new Date(values.startDate);
  const endDate = new Date(values.endDate);

  if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime()) && endDate < startDate) {
    fieldErrors.endDate = "تاریخ پایان باید بعد از تاریخ شروع باشد.";
  }

  return fieldErrors;
}

function revalidateChallengePaths(challengeId: string) {
  revalidatePath(CHALLENGE_LIST_PATH);
  revalidatePath(`/admin/challenges/${challengeId}`);
  revalidatePath(`/admin/challenges/${challengeId}/edit`);
  revalidatePath("/challenges");
  revalidatePath(`/challenges/${challengeId}`);
  revalidatePath("/dashboard/profile");
}

export async function createChallengeAction(
  values: ChallengeFormValues,
): Promise<ActionResult<keyof ChallengeFormValues>> {
  try {
    await ensureAdmin();
    const parsed = challengeSchema.parse(values);
    const extraErrors = buildChallengeValidationErrors(values);
    if (Object.keys(extraErrors).length > 0) {
      return {
        ok: false,
        error: "لطفاً خطاهای فرم را برطرف کنید.",
        fieldErrors: extraErrors,
      };
    }

    const normalized = normalizeChallengeValues(parsed);
    await prisma.challenge.create({
      data: {
        ...normalized,
        status: "draft",
      },
    });

    revalidatePath(CHALLENGE_LIST_PATH);
    revalidatePath("/challenges");
    return { ok: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const mapped = mapZodError<keyof ChallengeFormValues>(
        error,
        "لطفاً خطاهای فرم را برطرف کنید.",
      );
      return { ok: false, error: mapped.error, fieldErrors: mapped.fieldErrors };
    }

    return { ok: false, error: "ایجاد چالش ناموفق بود." };
  }
}

export async function updateChallengeAction(
  challengeId: string,
  values: ChallengeFormValues,
): Promise<ActionResult<keyof ChallengeFormValues>> {
  try {
    await ensureAdmin();
    const parsed = challengeSchema.parse(values);
    const extraErrors = buildChallengeValidationErrors(values);
    if (Object.keys(extraErrors).length > 0) {
      return {
        ok: false,
        error: "لطفاً خطاهای فرم را برطرف کنید.",
        fieldErrors: extraErrors,
      };
    }

    const normalized = normalizeChallengeValues(parsed);
    await prisma.challenge.update({
      where: { id: challengeId },
      data: {
        ...normalized,
        status: normalized.status ?? "draft",
      },
    });

    revalidateChallengePaths(challengeId);
    return { ok: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const mapped = mapZodError<keyof ChallengeFormValues>(
        error,
        "لطفاً خطاهای فرم را برطرف کنید.",
      );
      return { ok: false, error: mapped.error, fieldErrors: mapped.fieldErrors };
    }

    return { ok: false, error: "به‌روزرسانی چالش ناموفق بود." };
  }
}

export async function publishChallengeAction(challengeId: string) {
  try {
    await ensureAdmin();
    await prisma.challenge.update({
      where: { id: challengeId },
      data: { status: "published" },
    });
    revalidateChallengePaths(challengeId);
    return { ok: true } as const;
  } catch (error) {
    return { ok: false, error: "انتشار چالش ناموفق بود." } as const;
  }
}

export async function unpublishChallengeAction(challengeId: string) {
  try {
    await ensureAdmin();
    await prisma.challenge.update({
      where: { id: challengeId },
      data: { status: "draft" },
    });
    revalidateChallengePaths(challengeId);
    return { ok: true } as const;
  } catch (error) {
    return { ok: false, error: "لغو انتشار چالش ناموفق بود." } as const;
  }
}

export async function archiveChallengeAction(challengeId: string) {
  try {
    await ensureAdmin();
    await prisma.challenge.update({
      where: { id: challengeId },
      data: { status: "archived" },
    });
    revalidateChallengePaths(challengeId);
    return { ok: true } as const;
  } catch (error) {
    return { ok: false, error: "آرشیو چالش ناموفق بود." } as const;
  }
}

export async function updateChallengeParticipantStatusAction(
  participationId: string,
  formData: FormData,
) {
  await ensureAdmin();

  const parsed = participantStatusSchema.safeParse({
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return;
  }

  const participation = await prisma.challengeParticipation.update({
    where: { id: participationId },
    data: {
      status: parsed.data.status,
    },
    select: {
      challengeId: true,
    },
  });

  revalidateChallengePaths(participation.challengeId);
}
