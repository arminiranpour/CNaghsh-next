"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { validateOwnedReadyVideo } from "@/lib/media/ownership";

import { challengeUploadEligibleStatuses } from "./constants";
import { createChallengeCheckoutSession } from "./payments";

const buildChallengeUrl = (challengeId: string) => `/challenges/${challengeId}`;

const appendSearchParams = (path: string, params: URLSearchParams) => {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${params.toString()}`;
};

const redirectWithError = (challengeId: string, reason: string): never => {
  const params = new URLSearchParams({
    challenge: "error",
    reason,
  });
  redirect(appendSearchParams(buildChallengeUrl(challengeId), params));
};

export async function startChallengeParticipationAction(challengeId: string) {
  const challengeUrl = buildChallengeUrl(challengeId);
  const session = await getServerAuthSession();
  const userId = session?.user?.id;

  if (!userId) {
    redirect(`/auth?tab=signin&callbackUrl=${encodeURIComponent(challengeUrl)}`);
  }

  const challenge = await prisma.challenge.findFirst({
    where: {
      id: challengeId,
      status: "published",
    },
    select: {
      id: true,
      priceIrr: true,
    },
  });

  if (!challenge) {
    redirectWithError(challengeId, "CHALLENGE_NOT_FOUND");
  }
  const resolvedChallenge = challenge as NonNullable<typeof challenge>;

  const existingParticipation = await prisma.challengeParticipation.findUnique({
    where: {
      challengeId_userId: {
        challengeId,
        userId,
      },
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (existingParticipation && existingParticipation.status !== "payment_pending") {
    redirect(challengeUrl);
  }

  if (resolvedChallenge.priceIrr <= 0) {
    await prisma.challengeParticipation.upsert({
      where: {
        challengeId_userId: {
          challengeId,
          userId,
        },
      },
      create: {
        challengeId,
        userId,
        status: "registered",
      },
      update: {
        status: "registered",
      },
    });

    revalidatePath(challengeUrl);
    revalidatePath("/dashboard/profile");
    redirect(challengeUrl);
  }

  const participation = existingParticipation
    ? await prisma.challengeParticipation.update({
        where: { id: existingParticipation.id },
        data: {
          status: "payment_pending",
        },
        select: { id: true },
      })
    : await prisma.challengeParticipation.create({
        data: {
          challengeId,
          userId,
          status: "payment_pending",
        },
        select: { id: true },
      });

  try {
    const checkout = await createChallengeCheckoutSession({
      challengeId,
      participationId: participation.id,
      userId,
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
    console.error("startChallengeParticipationAction", {
      challengeId,
      userId,
      reason,
    });
    redirectWithError(challengeId, reason);
  }
}

export type SaveChallengeSubmissionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveChallengeSubmissionAction(
  challengeId: string,
  payload: {
    submissionMediaAssetId?: string;
    description?: string;
  },
): Promise<SaveChallengeSubmissionResult> {
  const session = await getServerAuthSession();
  const userId = session?.user?.id;

  if (!userId) {
    return { ok: false, error: "برای ارسال اثر ابتدا وارد حساب خود شوید." };
  }

  const participation = await prisma.challengeParticipation.findUnique({
    where: {
      challengeId_userId: {
        challengeId,
        userId,
      },
    },
    include: {
      challenge: {
        select: {
          id: true,
          mediaLengthLimitSec: true,
        },
      },
    },
  });

  if (!participation) {
    return { ok: false, error: "ابتدا در چالش ثبت‌نام کنید." };
  }

  if (!challengeUploadEligibleStatuses.has(participation.status)) {
    return { ok: false, error: "در وضعیت فعلی امکان ارسال اثر ندارید." };
  }

  const mediaId = payload.submissionMediaAssetId?.trim();
  if (!mediaId) {
    return { ok: false, error: "ابتدا ویدیوی خود را بارگذاری کنید." };
  }

  const validation = await validateOwnedReadyVideo(userId, mediaId);
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  const media = await prisma.mediaAsset.findUnique({
    where: { id: mediaId },
    select: {
      id: true,
      durationSec: true,
    },
  });

  if (!media) {
    return { ok: false, error: "ویدیوی انتخاب‌شده معتبر نیست." };
  }

  if (
    participation.challenge.mediaLengthLimitSec &&
    media.durationSec &&
    media.durationSec > participation.challenge.mediaLengthLimitSec
  ) {
    return { ok: false, error: "مدت ویدیو از سقف مجاز این چالش بیشتر است." };
  }

  await prisma.challengeParticipation.update({
    where: { id: participation.id },
    data: {
      submissionMediaAssetId: media.id,
      description: payload.description?.trim() || null,
      status: "submitted",
    },
  });

  revalidatePath(buildChallengeUrl(challengeId));
  revalidatePath("/dashboard/profile");

  return { ok: true };
}
