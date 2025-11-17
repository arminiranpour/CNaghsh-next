import { MediaStatus, MediaType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const INVALID_VIDEO_ERROR = "ویدیوی انتخاب شده معتبر نیست.";
const VIDEO_NOT_READY_ERROR = "ویدیو هنوز آماده پخش نیست.";

export type IntroVideoValidationResult =
  | { ok: true; mediaId: string }
  | { ok: false; error: string };

export async function validateOwnedReadyVideo(
  userId: string,
  mediaId: string,
): Promise<IntroVideoValidationResult> {
  const trimmed = mediaId.trim();

  if (!trimmed) {
    return { ok: false, error: INVALID_VIDEO_ERROR };
  }

  const media = await prisma.mediaAsset.findUnique({
    where: { id: trimmed },
    select: {
      id: true,
      ownerUserId: true,
      type: true,
      status: true,
    },
  });

  if (!media || media.ownerUserId !== userId || media.type !== MediaType.video) {
    return { ok: false, error: INVALID_VIDEO_ERROR };
  }

  if (media.status !== MediaStatus.ready) {
    return { ok: false, error: VIDEO_NOT_READY_ERROR };
  }

  return { ok: true, mediaId: media.id };
}
