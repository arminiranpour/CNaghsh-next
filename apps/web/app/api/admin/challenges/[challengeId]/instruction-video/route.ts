import { randomUUID } from "node:crypto";

import { MediaStatus, MediaType, MediaVisibility } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { SessionUser } from "next-auth";

import { requireAdminSession } from "@/lib/auth/admin";
import { NO_STORE_HEADERS } from "@/lib/http";
import { getPublicMediaUrlFromKey } from "@/lib/media/urls";
import { prisma } from "@/lib/prisma";
import { getOriginalKey } from "@/lib/storage/keys";
import { putBuffer } from "@/lib/storage/s3";
import { resolveBucketForVisibility } from "@/lib/storage/visibility";

type InstructionVideoResponse = {
  ok: boolean;
  error?: string;
  mediaId?: string | null;
  url?: string | null;
};

const MAX_VIDEO_BYTES = 600 * 1024 * 1024;
const VIDEO_MIME_EXTENSIONS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const normalizeMime = (value: string) => value.split(";")[0]?.trim().toLowerCase() ?? "";

const success = (payload: InstructionVideoResponse) =>
  NextResponse.json(payload, { headers: NO_STORE_HEADERS });

const failure = (status: number, error: string) =>
  NextResponse.json({ ok: false, error }, { status, headers: NO_STORE_HEADERS });

type AdminSessionUser = SessionUser & { id: string };

const ensureAdmin = async (): Promise<AdminSessionUser | null> => {
  try {
    const { user } = await requireAdminSession();
    if (typeof user.id !== "string" || user.id.length === 0) {
      return null;
    }
    return { ...user, id: user.id };
  } catch (error) {
    return null;
  }
};

export async function POST(
  request: NextRequest,
  { params }: { params: { challengeId: string } },
): Promise<NextResponse<InstructionVideoResponse>> {
  const admin = await ensureAdmin();
  if (!admin) {
    return failure(401, "UNAUTHORIZED");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    return failure(400, "INVALID_FORM_DATA");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return failure(400, "FILE_REQUIRED");
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return failure(400, "INVALID_FILE");
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return failure(400, "FILE_TOO_LARGE");
  }

  const normalizedType = normalizeMime(file.type);
  const extension = VIDEO_MIME_EXTENSIONS[normalizedType];
  if (!extension) {
    return failure(400, "UNSUPPORTED_MEDIA_TYPE");
  }

  const challenge = await prisma.challenge.findUnique({
    where: { id: params.challengeId },
    select: { id: true },
  });
  if (!challenge) {
    return failure(404, "CHALLENGE_NOT_FOUND");
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const mediaId = randomUUID();
    const key = getOriginalKey(admin.id, mediaId, extension);
    const bucket = resolveBucketForVisibility("public");
    await putBuffer(bucket, key, buffer, normalizedType);
    const media = await prisma.mediaAsset.create({
      data: {
        id: mediaId,
        type: MediaType.video,
        status: MediaStatus.ready,
        visibility: MediaVisibility.public,
        ownerUserId: admin.id,
        sourceKey: key,
        outputKey: key,
        sizeBytes: BigInt(file.size),
      },
      select: { id: true, outputKey: true },
    });

    await prisma.challenge.update({
      where: { id: challenge.id },
      data: { instructionVideoMediaAssetId: media.id },
    });

    revalidatePath(`/admin/challenges/${challenge.id}/edit`);
    revalidatePath("/admin/challenges");
    revalidatePath(`/challenges/${challenge.id}`);
    revalidatePath("/challenges");

    return success({
      ok: true,
      mediaId: media.id,
      url: media.outputKey ? getPublicMediaUrlFromKey(media.outputKey) : null,
    });
  } catch (error) {
    return failure(500, "UPLOAD_FAILED");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { challengeId: string } },
): Promise<NextResponse<InstructionVideoResponse>> {
  const admin = await ensureAdmin();
  if (!admin) {
    return failure(401, "UNAUTHORIZED");
  }

  const challenge = await prisma.challenge.findUnique({
    where: { id: params.challengeId },
    select: { id: true, instructionVideoMediaAssetId: true },
  });
  if (!challenge) {
    return failure(404, "CHALLENGE_NOT_FOUND");
  }

  if (!challenge.instructionVideoMediaAssetId) {
    return success({ ok: true, mediaId: null, url: null });
  }

  try {
    await prisma.challenge.update({
      where: { id: challenge.id },
      data: { instructionVideoMediaAssetId: null },
    });

    revalidatePath(`/admin/challenges/${challenge.id}/edit`);
    revalidatePath("/admin/challenges");
    revalidatePath(`/challenges/${challenge.id}`);
    revalidatePath("/challenges");

    return success({ ok: true, mediaId: null, url: null });
  } catch (error) {
    return failure(500, "REMOVE_FAILED");
  }
}
