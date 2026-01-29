import { randomUUID } from "node:crypto";

import { MediaStatus, MediaType, MediaVisibility } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/admin";
import { NO_STORE_HEADERS } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { putBuffer } from "@/lib/storage/s3";
import { resolveBucketForVisibility } from "@/lib/storage/visibility";

type UploadResponse =
  | { ok: true; mediaId: string }
  | { ok: false; error: string };

const MAX_BYTES = 10 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const normalizeMime = (value: string) => value.split(";")[0]?.trim().toLowerCase() ?? "";
const buildMovieKey = (ownerId: string, mediaId: string, extension: string) =>
  ["uploads", "movies", ownerId, `${mediaId}.${extension}`].join("/");

const failure = (status: number, error: string) =>
  NextResponse.json({ ok: false, error } satisfies UploadResponse, {
    status,
    headers: NO_STORE_HEADERS,
  });

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    const { user } = await requireAdminSession();

    if (!user?.id) {
      return failure(401, "UNAUTHORIZED");
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return failure(400, "فایل تصویر یافت نشد.");
    }

    if (!Number.isFinite(file.size) || file.size <= 0) {
      return failure(400, "فایل تصویر معتبر نیست.");
    }

    if (file.size > MAX_BYTES) {
      return failure(422, "حجم تصویر باید کمتر از ۱۰ مگابایت باشد.");
    }

    const normalizedType = normalizeMime(file.type);
    const extension = MIME_EXTENSIONS[normalizedType];
    if (!extension) {
      return failure(422, "فقط تصاویر JPG، PNG یا WEBP مجاز هستند.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mediaId = randomUUID();
    const key = buildMovieKey(user.id, mediaId, extension);
    const bucket = resolveBucketForVisibility("public");

    await putBuffer(bucket, key, buffer, normalizedType);

    const media = await prisma.mediaAsset.create({
      data: {
        id: mediaId,
        type: MediaType.image,
        status: MediaStatus.ready,
        visibility: MediaVisibility.public,
        ownerUserId: user.id,
        sourceKey: key,
        outputKey: key,
        sizeBytes: BigInt(file.size),
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, mediaId: media.id }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return failure(500, "بارگذاری تصویر ناموفق بود.");
  }
}
