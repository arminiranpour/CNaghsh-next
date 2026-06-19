/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ChallengeParticipationStatus } from "@prisma/client";
import { Mail, Send, ArrowLeft } from "lucide-react";

import { ChallengeSubmissionCtaButton } from "@/components/challenges/ChallengeSubmissionCtaButton";
import { ChallengeSubmissionForm } from "@/components/challenges/ChallengeSubmissionForm";
import { CourseIntroVideoPreview } from "@/components/courses/CourseIntroVideoPreview";
import { fetchPublicChallengeById } from "@/lib/challenges/public/queries";
import {
  challengeParticipationStatusLabels,
  challengeUploadEligibleStatuses,
  formatChallengePrice,
} from "@/lib/challenges/constants";
import { startChallengeParticipationAction } from "@/lib/challenges/actions";
import { getServerAuthSession } from "@/lib/auth/session";
import { formatJalaliDate } from "@/lib/datetime/jalali";
import { getPublicMediaUrlFromKey } from "@/lib/media/urls";
import { getBaseUrl } from "@/lib/seo/baseUrl";

type SearchParams = Record<string, string | string[] | undefined>;

const challengeErrorMessages: Record<string, string> = {
  CHALLENGE_NOT_FOUND: "این چالش در دسترس نیست.",
  PARTICIPATION_NOT_FOUND: "ثبت‌نام شما برای این چالش پیدا نشد.",
  FORBIDDEN: "اجازه دسترسی به این عملیات را ندارید.",
  INVALID_PARTICIPATION_STATUS: "در وضعیت فعلی امکان پرداخت وجود ندارد.",
  CHALLENGE_NOT_PUBLISHED: "این چالش در حال حاضر منتشر نشده است.",
  FREE_CHALLENGE: "این چالش رایگان است و نیازی به پرداخت ندارد.",
  UNKNOWN_PROVIDER: "درگاه پرداخت معتبر نیست.",
  UNKNOWN_ERROR: "عملیات موردنظر ناموفق بود.",
};

const getFirstParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

export async function generateMetadata({
  params,
}: {
  params: { challengeId: string };
}): Promise<Metadata> {
  const challenge = await fetchPublicChallengeById(params.challengeId);

  if (!challenge) {
    return {
      title: "چالش پیدا نشد",
    };
  }

  return {
    title: challenge.title,
    description: challenge.summary,
  };
}

export default async function ChallengeDetailPage({
  params,
  searchParams,
}: {
  params: { challengeId: string };
  searchParams?: SearchParams;
}) {
  const session = await getServerAuthSession();
  const userId = session?.user?.id ?? null;
  const challenge = await fetchPublicChallengeById(params.challengeId, userId);

  if (!challenge) {
    notFound();
  }

  const challengeUrl = `${getBaseUrl()}/challenges/${challenge.id}`;
  const coverUrl =
    challenge.coverMediaAsset?.outputKey && challenge.coverMediaAsset.visibility === "public"
      ? getPublicMediaUrlFromKey(challenge.coverMediaAsset.outputKey)
      : null;
  const instructionVideoUrl =
    challenge.instructionVideoMediaAsset?.outputKey &&
    challenge.instructionVideoMediaAsset.visibility === "public"
      ? getPublicMediaUrlFromKey(challenge.instructionVideoMediaAsset.outputKey)
      : null;
  const instructionPosterUrl =
    challenge.instructionVideoMediaAsset?.posterKey &&
    challenge.instructionVideoMediaAsset.visibility === "public"
      ? getPublicMediaUrlFromKey(challenge.instructionVideoMediaAsset.posterKey)
      : coverUrl;

  const viewerParticipation = challenge.viewerParticipation;
  const viewerParticipationStatus = viewerParticipation?.status as
    | ChallengeParticipationStatus
    | undefined;
  const viewerStatusLabel = viewerParticipation
    ? challengeParticipationStatusLabels[viewerParticipationStatus ?? "registered"]
    : null;
  const canUploadSubmission = viewerParticipation
    ? challengeUploadEligibleStatuses.has(viewerParticipationStatus ?? "registered")
    : false;
  const registerAction = startChallengeParticipationAction.bind(null, challenge.id);
  const errorReason =
    getFirstParam(searchParams?.challenge) === "error" ? getFirstParam(searchParams?.reason) : null;
  const errorMessage = errorReason ? challengeErrorMessages[errorReason] ?? challengeErrorMessages.UNKNOWN_ERROR : null;

  const paymentFailed = challenge.viewerCheckoutSession?.status === "FAILED";
  const paymentPending =
    viewerParticipationStatus === "payment_pending" &&
    (challenge.viewerCheckoutSession?.status === "PENDING" ||
      challenge.viewerCheckoutSession?.status === "STARTED");

  const ctaLabel = canUploadSubmission
    ? "ارسال ویدیو"
    : viewerParticipation?.status === "payment_pending"
      ? "تکمیل پرداخت"
      : challenge.priceIrr > 0
        ? "ثبت‌نام و پرداخت"
        : "ثبت‌نام در چالش";
  const submissionFormId = `challenge-submission-form-${challenge.id}`;

  return (
    <div className="relative min-h-screen" dir="rtl">
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10">
        <div className="mt-[90px] flex justify-start">
          <Link
            href="/challenges"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/80 text-black shadow-sm transition hover:bg-white"
            aria-label="بازگشت"
          >
            <ArrowLeft className="h-5 w-5 rotate-180" />
          </Link>
        </div>

        {errorMessage ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        {paymentFailed ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            پرداخت این چالش ناموفق بود. برای تکمیل ثبت‌نام دوباره تلاش کنید.
          </div>
        ) : null}

        {paymentPending ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            پرداخت شما هنوز در حال بررسی است. در صورت نیاز، چند دقیقه دیگر این صفحه را دوباره باز کنید.
          </div>
        ) : null}

        <div className="grid gap-[200px] lg:grid-cols-[minmax(0,1fr)_380px]">
          <aside className="order-2 lg:sticky lg:top-28 lg:self-start">
            <div className="overflow-hidden rounded-[26px] bg-white p-5 shadow-[0_22px_50px_rgba(0,0,0,0.08)]">
              <div className="overflow-hidden rounded-[20px]">
                {instructionVideoUrl || instructionPosterUrl ? (
                  <CourseIntroVideoPreview
                    mediaId={challenge.instructionVideoMediaAsset?.id}
                    title={challenge.title}
                    videoUrl={instructionVideoUrl}
                    posterUrl={instructionPosterUrl}
                    compact
                  />
                ) : (
                  <div className="flex h-[250px] items-center justify-center bg-[#E9E9E9] text-sm text-black/45">
                    ویدیوی راهنما هنوز اضافه نشده است.
                  </div>
                )}
              </div>

              <div className="mt-5 space-y-3 text-sm leading-7 text-black">
                <ul className="list-disc space-y-1 pr-5 marker:text-[#FF7F19]">
                  <li>
                    هزینه شرکت در چالش:{" "}
                    <span className="font-bold">
                      {Number(challenge.priceIrr) === 0
                        ? "رایگان"
                        : formatChallengePrice(challenge.priceIrr)}
                    </span>
                  </li>

                  <li>
                    نحوه برگزاری: <span className="font-bold">{challenge.howHeld}</span>
                  </li>

                  <li>
                    تاریخ شروع چالش:{" "}
                    <span className="font-bold">
                      {formatJalaliDate(challenge.startDate)}
                    </span>
                  </li>

                  <li>
                    تاریخ پایان چالش:{" "}
                    <span className="font-bold">
                      {formatJalaliDate(challenge.endDate)}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="mt-5 items-center justify-center flex">
                {canUploadSubmission ? (
                  <ChallengeSubmissionCtaButton
                    formId={submissionFormId}
                    label={ctaLabel}
                    className="inline-flex w-[160px] items-center justify-center rounded-full bg-[#FF7F19] px-5 py-[7px] text-base font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                ) : (
                  <form action={registerAction}>
                    <button
                      type="submit"
                      className="inline-flex w-[180px] items-center justify-center rounded-full bg-[#FF7F19] px-5 py-[6px] text-base font-bold text-white transition hover:opacity-90"
                    >
                      {ctaLabel}
                    </button>
                  </form>
                )}
              </div>


              <div className="mt-6 space-y-3 items-center justify-center flex flex-col">
                <p className="text-sm font-semibold text-black">این چالش را برای دوستانت هم بفرست:</p>
                <div className="flex items-center gap-3">
                  <a
                    href={`mailto:?subject=${encodeURIComponent(challenge.title)}&body=${encodeURIComponent(challengeUrl)}`}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black text-white transition hover:bg-[#ececec]"
                    aria-label="Email"
                  >
                    <Mail className="h-5 w-5" />
                  </a>
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(challengeUrl)}&text=${encodeURIComponent(challenge.title)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black text-white transition hover:bg-[#ececec]"
                    aria-label="Telegram"
                  >
                    <Send className="h-5 w-5" />
                  </a>
                  
                </div>
              </div>
            </div>
          </aside>

          <section className="order-1">
            <div className="space-y-6">
              <header className="space-y-4">
                <h1 className="text-3xl font-bold text-[#F58A1F] md:text-4xl">{challenge.title}</h1>
              </header>

              {canUploadSubmission ? (
                <div id="challenge-submission" className="space-y-[150px]">
                  <ChallengeSubmissionForm
                    challengeId={challenge.id}
                    formId={submissionFormId}
                    initialMediaId={viewerParticipation?.submissionMediaAssetId ?? null}
                    initialDescription={viewerParticipation?.description ?? null}
                    mediaLengthLimitSec={challenge.mediaLengthLimitSec}
                    statusLabel={viewerStatusLabel ?? "ثبت‌نام شده"}
                  />
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}


