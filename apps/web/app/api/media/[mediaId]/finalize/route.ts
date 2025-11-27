import * as Sentry from "@sentry/nextjs";
import { MediaStatus, MediaType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth/session";
import { NO_STORE_HEADERS } from "@/lib/http";
import { logError, logInfo } from "@/lib/logging";
import { queueMediaTranscode } from "@/lib/media/transcode";
import { prisma } from "@/lib/prisma";
import { exists } from "@/lib/storage/s3";
import { storageConfig } from "@/lib/storage/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type RouteContext = {
  params: { mediaId: string };
};

const privateBucket = storageConfig.privateBucket;

export async function POST(_request: NextRequest, context: RouteContext) {
  const mediaId = context.params.mediaId;
  if (!mediaId) {
    return NextResponse.json(
      { ok: false, errorCode: "INVALID_ID" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  let userId: string | null = null;
  let sourceKey: string | null = null;

  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, errorCode: "UNAUTHORIZED" },
        { status: 401, headers: NO_STORE_HEADERS },
      );
    }

    userId = session.user.id;

    const media = await prisma.mediaAsset.findUnique({
      where: { id: mediaId },
      select: {
        id: true,
        ownerUserId: true,
        type: true,
        status: true,
        sourceKey: true,
      },
    });

    if (!media || media.ownerUserId !== userId) {
      return NextResponse.json(
        { ok: false, errorCode: "NOT_FOUND" },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }

    // اگر قبلاً آماده یا در حال پردازش است، چیزی برای انجام‌دادن نیست
    if (media.status === MediaStatus.ready || media.status === MediaStatus.processing) {
      logInfo("media.upload.finalize.skip", {
        mediaId,
        userId,
        status: media.status,
      });
      return NextResponse.json(
        { ok: true, status: media.status },
        { headers: NO_STORE_HEADERS },
      );
    }

    // اگر fail شده، نذار دوباره finalize بشه
    if (media.status === MediaStatus.failed) {
      logInfo("media.upload.finalize.invalid_state", {
        mediaId,
        userId,
        status: media.status,
      });
      return NextResponse.json(
        { ok: false, errorCode: "INVALID_STATE" },
        { status: 409, headers: NO_STORE_HEADERS },
      );
    }

    sourceKey = media.sourceKey;

    logInfo("media.upload.finalize.start", {
      mediaId,
      userId,
      bucket: privateBucket,
      key: media.sourceKey,
      status: media.status,
      type: media.type,
    });

    const objectExists = await exists(privateBucket, media.sourceKey);
    if (!objectExists) {
      logError("media.upload.finalize.missing_source", {
        mediaId,
        userId,
        bucket: privateBucket,
        key: media.sourceKey,
      });
      return NextResponse.json(
        { ok: false, errorCode: "SOURCE_NOT_FOUND" },
        { status: 409, headers: NO_STORE_HEADERS },
      );
    }

    // ✅ مسیر ویژه برای فایل‌های صوتی (voice)
    if (media.type === MediaType.audio) {
      await prisma.mediaAsset.update({
        where: { id: media.id },
        data: {
          status: MediaStatus.ready,
        },
      });

      logInfo("media.upload.finalize.audio_ready", {
        mediaId,
        userId,
        bucket: privateBucket,
        sourceKey,
      });

      return NextResponse.json(
        { ok: true, status: MediaStatus.ready },
        { headers: NO_STORE_HEADERS },
      );
    }

    // برای هر چیزی غیر از ویدیو (مثلاً image)، فعلاً این route پشتیبانی نمی‌کند
    if (media.type !== MediaType.video) {
      return NextResponse.json(
        { ok: false, errorCode: "INVALID_MEDIA_TYPE" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    // ✅ مسیر قبلی برای ویدیوها
    await queueMediaTranscode(media.id);

    logInfo("media.upload.finalize.success", {
      mediaId,
      userId,
      bucket: privateBucket,
      sourceKey,
    });

    return NextResponse.json(
      { ok: true, status: MediaStatus.processing },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    Sentry.captureException(error);
    logError("media.upload.finalize.error", {
      mediaId,
      userId: typeof userId === "string" ? userId : null,
      message: error instanceof Error ? error.message : "unknown",
      stack: error instanceof Error ? error.stack : undefined,
      bucket: privateBucket,
      key: sourceKey,
    });
    return NextResponse.json(
      { ok: false, errorCode: "UNKNOWN" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
