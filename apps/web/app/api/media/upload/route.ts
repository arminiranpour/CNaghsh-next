import { randomUUID } from "node:crypto";

import { MediaStatus, MediaType, MediaVisibility, TranscodeJobStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth/session";
import { isDev } from "@/lib/env";
import { NO_STORE_HEADERS, safeJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { enqueueTranscode } from "@/lib/queues/mediaTranscode.enqueue";
import { uploadConfig } from "@/lib/media/config";
import {
  canUploadVideo,
  getUserMediaEntitlements,
} from "@/lib/media/entitlements";
import { sniffMimeFromFile } from "@/lib/media/mime-sniff";
import type { UploadInitResponse, UploadMode } from "@/lib/media/types";
import {
  isAllowedMime,
  isWithinSizeLimit,
  parseUploadRequest,
  validateDuration,
} from "@/lib/media/validation";
import { getDailyBytes, assertWithinRateLimit, trackDailyBytes, RateLimitExceededError } from "@/lib/rate-limit";
import { cacheOriginal } from "@/lib/storage/headers";
import { getOriginalKey } from "@/lib/storage/keys";
import { getSignedPutUrl } from "@/lib/storage/signing";
import { putBuffer } from "@/lib/storage/s3";
import { resolveBucketForVisibility } from "@/lib/storage/visibility";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type UploadMetadata = {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  estimatedDurationSec?: number;
};

type MultipartMetadata = UploadMetadata & { file: File };

type ErrorTuple = { status: number; code: "INVALID_MIME" | "TOO_LARGE" | "RATE_LIMITED" | "QUOTA_EXCEEDED" | "DURATION_EXCEEDED" | "UNKNOWN"; message: string };

const privateBucket = resolveBucketForVisibility("private");

const MIME_EXTENSIONS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

const normalizeMime = (value: string) => value.split(";")[0]?.trim().toLowerCase() ?? "";

const getClientIp = (request: NextRequest) => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const [first] = forwarded.split(",");
    if (first) {
      return first.trim();
    }
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return request.ip ?? "";
};

const errorResponse = ({ status, code, message }: ErrorTuple) => {
  return NextResponse.json(
    {
      ok: false,
      errorCode: code,
      messageFa: message,
    },
    { status, headers: NO_STORE_HEADERS },
  );
};

const ensureDailyQuota = async (userId: string, sizeBytes: number) => {
  const todayBytes = await getDailyBytes(userId);
  if (todayBytes + sizeBytes > uploadConfig.dailyUserCapBytes) {
    return errorResponse({
      status: 429,
      code: "QUOTA_EXCEEDED",
      message: "سقف روزانه حجم آپلود شما تکمیل شده است.",
    });
  }
  return null;
};

const createMediaAssetRecord = async (
  ownerUserId: string,
  extension: string,
  sizeBytes: number,
) => {
  const mediaId = randomUUID();
  const sourceKey = getOriginalKey(ownerUserId, mediaId, extension);
  const media = await prisma.$transaction(async (tx) => {
    const created = await tx.mediaAsset.create({
      data: {
        id: mediaId,
        type: MediaType.video,
        status: MediaStatus.uploaded,
        visibility: MediaVisibility.private,
        ownerUserId,
        sourceKey,
        sizeBytes: BigInt(sizeBytes),
      },
    });
    await tx.transcodeJob.create({
      data: {
        mediaAssetId: created.id,
        status: TranscodeJobStatus.queued,
        attempt: 1,
      },
    });
    return created;
  });
  await enqueueTranscode(media.id);
  return media;
};

const successResponse = (
  mediaId: string,
  sourceKey: string,
  mode: UploadMode,
  signedUrl?: string,
) => {
  const payload: UploadInitResponse = {
    ok: true,
    mediaId,
    mode,
    sourceKey,
    signedUrl,
    maxSingleUploadBytes: uploadConfig.maxSingleUploadBytes,
    next: { checkStatusUrl: `/api/media/${mediaId}/status` },
  };
  return NextResponse.json(payload, { headers: NO_STORE_HEADERS });
};

const evaluatePlanLimits = async (
  userId: string,
  metadata: UploadMetadata,
) => {
  const entitlements = await getUserMediaEntitlements(userId);
  const estimatedDuration = metadata.estimatedDurationSec ?? 0;
  if (!validateDuration(estimatedDuration, entitlements.maxDurationPerVideoSec)) {
    return errorResponse({
      status: 422,
      code: "DURATION_EXCEEDED",
      message: "مدت ویدیو از سقف طرح شما بیشتر است.",
    });
  }
  const decision = await canUploadVideo(
    userId,
    metadata.sizeBytes,
    estimatedDuration,
    entitlements,
  );
  if (!decision.ok) {
    const message =
      decision.reason === "DURATION_LIMIT"
        ? "مدت ویدیو از سقف طرح شما بیشتر است."
        : "شما به سقف مجاز بارگذاری رسیده‌اید.";
    return errorResponse({
      status: 429,
      code: decision.reason === "DURATION_LIMIT" ? "DURATION_EXCEEDED" : "QUOTA_EXCEEDED",
      message,
    });
  }
  return null;
};

const prepareUpload = async (
  userId: string,
  metadata: UploadMetadata,
  mode: UploadMode,
  fileBuffer?: Buffer,
) => {
  const normalizedMime = normalizeMime(metadata.contentType);
  if (!normalizedMime || !isAllowedMime(normalizedMime)) {
    return errorResponse({
      status: 415,
      code: "INVALID_MIME",
      message: "نوع فایل مجاز نیست.",
    });
  }

  if (!isWithinSizeLimit(metadata.sizeBytes)) {
    return errorResponse({
      status: 413,
      code: "TOO_LARGE",
      message: "حجم فایل از حد مجاز بیشتر است.",
    });
  }

  const quotaError = await ensureDailyQuota(userId, metadata.sizeBytes);
  if (quotaError) {
    return quotaError;
  }

  const planError = await evaluatePlanLimits(userId, metadata);
  if (planError) {
    return planError;
  }

  const extension = MIME_EXTENSIONS[normalizedMime];
  if (!extension) {
    return errorResponse({
      status: 415,
      code: "INVALID_MIME",
      message: "نوع فایل مجاز نیست.",
    });
  }

  const media = await createMediaAssetRecord(userId, extension, metadata.sizeBytes);

  if (mode === "multipart" && fileBuffer) {
    await putBuffer(privateBucket, media.sourceKey, fileBuffer, normalizedMime, cacheOriginal());
  }

  const signedUrl =
    mode === "signed-put"
      ? await getSignedPutUrl(privateBucket, media.sourceKey, normalizedMime)
      : undefined;

  await trackDailyBytes(userId, metadata.sizeBytes);

  return successResponse(media.id, media.sourceKey, mode, signedUrl);
};

const parseMultipartMetadata = async (
  request: NextRequest,
): Promise<{ metadata?: MultipartMetadata; error?: ReturnType<typeof errorResponse> }> => {
  if (!isDev) {
    return {
      error: errorResponse({
        status: 405,
        code: "UNKNOWN",
        message: "این حالت در محیط فعلی فعال نیست.",
      }),
    };
  }
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return {
      error: errorResponse({
        status: 400,
        code: "UNKNOWN",
        message: "فایل ارسال‌شده معتبر نیست.",
      }),
    };
  }
  const fileName = file.name && file.name.length > 0 ? file.name : `upload-${Date.now()}`;
  const manualMime = formData.get("contentType");
  const declaredMime = typeof manualMime === "string" && manualMime.trim().length > 0 ? manualMime : file.type;
  const durationField = formData.get("estimatedDurationSec");
  let estimatedDurationSec: number | undefined;
  if (typeof durationField === "string" && durationField.trim().length > 0) {
    const parsed = Number.parseInt(durationField, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      estimatedDurationSec = parsed;
    }
  }
  return {
    metadata: {
      fileName,
      contentType: declaredMime,
      sizeBytes: Math.floor(file.size),
      estimatedDurationSec,
      file,
    },
  };
};

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return errorResponse({
      status: 401,
      code: "UNKNOWN",
      message: "لطفاً ابتدا وارد حساب کاربری شوید.",
    });
  }
  const ownerUserId = session.user.id;
  try {
    await assertWithinRateLimit({ userId: ownerUserId, ip: getClientIp(request) });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return errorResponse({
        status: 429,
        code: "RATE_LIMITED",
        message: "درخواست‌های شما بیش از حد مجاز است. بعداً دوباره تلاش کنید.",
      });
    }
    throw error;
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const { metadata, error } = await parseMultipartMetadata(request);
      if (error) {
        return error;
      }
      if (!metadata) {
        return errorResponse({
          status: 400,
          code: "UNKNOWN",
          message: "داده‌های ارسالی معتبر نیست.",
        });
      }
      const normalizedMime = normalizeMime(metadata.contentType);
      if (!normalizedMime) {
        return errorResponse({
          status: 415,
          code: "INVALID_MIME",
          message: "نوع فایل مجاز نیست.",
        });
      }
      const sniffed = await sniffMimeFromFile(metadata.file);
      if (sniffed && sniffed !== normalizedMime) {
        return errorResponse({
          status: 415,
          code: "INVALID_MIME",
          message: "نوع فایل مجاز نیست.",
        });
      }
      const buffer = Buffer.from(await metadata.file.arrayBuffer());
      return prepareUpload(
        ownerUserId,
        {
          fileName: metadata.fileName,
          contentType: normalizedMime,
          sizeBytes: buffer.length,
          estimatedDurationSec: metadata.estimatedDurationSec,
        },
        "multipart",
        buffer,
      );
    }

    const parsed = await safeJson<unknown>(request);
    if (!parsed.ok) {
      return errorResponse({
        status: 400,
        code: "UNKNOWN",
        message: "داده‌های ارسالی معتبر نیست.",
      });
    }
    let metadata: UploadMetadata;
    try {
      metadata = parseUploadRequest(parsed.data);
    } catch (error) {
      return errorResponse({
        status: 400,
        code: "UNKNOWN",
        message: "داده‌های ارسالی معتبر نیست.",
      });
    }
    const normalizedMime = normalizeMime(metadata.contentType);
    return prepareUpload(
      ownerUserId,
      {
        fileName: metadata.fileName,
        contentType: normalizedMime,
        sizeBytes: Math.floor(metadata.sizeBytes),
        estimatedDurationSec: metadata.estimatedDurationSec,
      },
      "signed-put",
    );
  } catch (error) {
    console.error("[api.media.upload] unexpected_error", error);
    return errorResponse({
      status: 500,
      code: "UNKNOWN",
      message: "خطای غیرمنتظره رخ داد. لطفاً دوباره تلاش کنید.",
    });
  }
}
