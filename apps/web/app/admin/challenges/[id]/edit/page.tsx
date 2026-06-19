import Link from "next/link";
import { notFound } from "next/navigation";

import { challengeParticipationStatusLabels } from "@/lib/challenges/constants";
import { formatJalaliDate, formatJalaliDateTime } from "@/lib/datetime/jalali";
import { getPublicMediaUrlFromKey } from "@/lib/media/urls";
import { prisma } from "@/lib/prisma";
import { getSignedGetUrl } from "@/lib/storage/signing";
import { resolveBucketForVisibility } from "@/lib/storage/visibility";

import { ChallengeCoverUploader } from "../../_components/challenge-cover-uploader";
import { ChallengeForm } from "../../_components/challenge-form";
import { ChallengeInstructionVideoUploader } from "../../_components/challenge-instruction-video-uploader";
import {
  updateChallengeAction,
  updateChallengeParticipantStatusAction,
} from "../../actions";

const participantStatusOptions = [
  "payment_pending",
  "registered",
  "submitted",
  "reviewed",
  "accepted",
  "rejected",
] as const;

export default async function EditChallengePage({
  params,
}: {
  params: { id: string };
}) {
  const challenge = await prisma.challenge.findUnique({
    where: { id: params.id },
    include: {
      coverMediaAsset: {
        select: {
          outputKey: true,
          visibility: true,
        },
      },
      instructionVideoMediaAsset: {
        select: {
          outputKey: true,
          visibility: true,
        },
      },
      participations: {
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          submissionMediaAsset: {
            select: {
              id: true,
              outputKey: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!challenge) {
    notFound();
  }

  const coverUrl =
    challenge.coverMediaAsset?.outputKey && challenge.coverMediaAsset.visibility === "public"
      ? getPublicMediaUrlFromKey(challenge.coverMediaAsset.outputKey)
      : null;

  const instructionVideoUrl =
    challenge.instructionVideoMediaAsset?.outputKey &&
    challenge.instructionVideoMediaAsset.visibility === "public"
      ? getPublicMediaUrlFromKey(challenge.instructionVideoMediaAsset.outputKey)
      : null;

  const playbackBucket = resolveBucketForVisibility("public");
  const participantRows = await Promise.all(
    challenge.participations.map(async (participation) => {
      const submissionUrl =
        participation.submissionMediaAsset?.outputKey
          ? await getSignedGetUrl(playbackBucket, participation.submissionMediaAsset.outputKey).catch(
              () => null,
            )
          : null;

      return {
        ...participation,
        submissionUrl,
      };
    }),
  );

  return (
    <div className="space-y-10" dir="rtl">
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">ویرایش چالش</h1>
          <p className="text-sm text-muted-foreground">جزئیات، رسانه‌ها و وضعیت این چالش را مدیریت کنید.</p>
        </div>

        <ChallengeCoverUploader
          challengeId={challenge.id}
          coverUrl={coverUrl}
          coverMediaAssetId={challenge.coverMediaAssetId ?? null}
        />

        <ChallengeInstructionVideoUploader
          challengeId={challenge.id}
          instructionVideoMediaAssetId={challenge.instructionVideoMediaAssetId ?? null}
          videoUrl={instructionVideoUrl}
        />

        <ChallengeForm
          initialValues={{
            title: challenge.title,
            location: challenge.location,
            summary: challenge.summary,
            startDate: challenge.startDate.toISOString().slice(0, 10),
            endDate: challenge.endDate.toISOString().slice(0, 10),
            conditions: challenge.conditions,
            mediaLengthLimitSec: challenge.mediaLengthLimitSec,
            instructions: challenge.instructions,
            priceIrr: challenge.priceIrr,
            prerequisite: challenge.prerequisite,
            howHeld: challenge.howHeld,
            sideNote: challenge.sideNote ?? "",
            status: challenge.status,
          }}
          action={updateChallengeAction.bind(null, challenge.id)}
          submitLabel="ذخیره تغییرات"
          showStatus
        />
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">شرکت‌کنندگان و آثار ارسالی</h2>
            <p className="text-sm text-muted-foreground">
              وضعیت ثبت‌نام و سابمیشن‌های این چالش را از این بخش بررسی کنید.
            </p>
          </div>
          <Link href={`/challenges/${challenge.id}`} className="text-primary underline-offset-4 hover:underline">
            مشاهده صفحه عمومی
          </Link>
        </div>

        <div className="overflow-x-auto rounded-md border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-right">
              <tr>
                <th className="px-4 py-3 font-medium">کاربر</th>
                <th className="px-4 py-3 font-medium">وضعیت</th>
                <th className="px-4 py-3 font-medium">توضیح</th>
                <th className="px-4 py-3 font-medium">اثر</th>
                <th className="px-4 py-3 font-medium">تاریخ</th>
                <th className="px-4 py-3 font-medium">به‌روزرسانی وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {participantRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={6}>
                    هنوز شرکت‌کننده‌ای برای این چالش ثبت نشده است.
                  </td>
                </tr>
              ) : (
                participantRows.map((participant) => (
                  <tr key={participant.id} className="border-b border-border last:border-0 align-top">
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p>{participant.user.name?.trim() || "بدون نام"}</p>
                        <p className="text-xs text-muted-foreground">{participant.user.email}</p>
                        <p className="text-xs text-muted-foreground">شناسه: {participant.user.id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {challengeParticipationStatusLabels[participant.status]}
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-xs whitespace-pre-line text-sm text-muted-foreground">
                        {participant.description?.trim() || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {participant.submissionUrl ? (
                        <a
                          href={participant.submissionUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          مشاهده اثر
                        </a>
                      ) : participant.submissionMediaAssetId ? (
                        <span className="text-xs text-muted-foreground">
                          فایل در حال آماده‌سازی است.
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">اثری ثبت نشده است.</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div>{formatJalaliDateTime(participant.createdAt)}</div>
                      <div>{formatJalaliDate(participant.updatedAt)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <form
                        action={updateChallengeParticipantStatusAction.bind(null, participant.id)}
                        className="flex min-w-[180px] flex-col gap-2"
                      >
                        <select
                          name="status"
                          defaultValue={participant.status}
                          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                        >
                          {participantStatusOptions.map((status) => (
                            <option key={status} value={status}>
                              {challengeParticipationStatusLabels[status]}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                        >
                          ذخیره وضعیت
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
