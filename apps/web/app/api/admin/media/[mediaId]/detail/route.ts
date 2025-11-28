import { NextRequest, NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/admin";
import { NO_STORE_HEADERS } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type AdminMediaDetailResponse = {
  id: string;
  type: "image" | "video" | "audio";
  status: string;
  visibility: "public" | "private";
  moderationStatus: string;
  moderationReason: string | null;
  moderationReviewedAt: string | null;
  moderationReviewedBy: { id: string; email: string | null } | null;
  owner: { id: string; email: string | null };
  sourceKey: string;
  outputKey: string | null;
  posterKey: string | null;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  codec: string | null;
  bitrate: number | null;
  sizeBytes: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  lastJob: {
    id: string;
    status: string;
    attempt: number;
    startedAt: string | null;
    finishedAt: string | null;
    logs: unknown;
  } | null;
};

export async function GET(
  request: NextRequest,
  context: { params: { mediaId: string } },
): Promise<NextResponse<AdminMediaDetailResponse>> {
  await requireAdminSession();

  const mediaId = context.params.mediaId;
  if (!mediaId || mediaId.length === 0) {
    return NextResponse.json({} as AdminMediaDetailResponse, {
      status: 400,
      headers: NO_STORE_HEADERS,
    });
  }

  const media = await prisma.mediaAsset.findUnique({
    where: { id: mediaId },
    include: {
      owner: { select: { id: true, email: true } },
      moderationReviewedBy: { select: { id: true, email: true } },
      transcodeJobs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          attempt: true,
          startedAt: true,
          finishedAt: true,
          logs: true,
        },
      },
    },
  });

  if (!media) {
    return NextResponse.json({} as AdminMediaDetailResponse, {
      status: 404,
      headers: NO_STORE_HEADERS,
    });
  }

  const lastJob = media.transcodeJobs[0] ?? null;

  const payload: AdminMediaDetailResponse = {
    id: media.id,
    type: media.type,
    status: media.status,
    visibility: media.visibility,
    moderationStatus: media.moderationStatus,
    moderationReason: media.moderationReason ?? null,
    moderationReviewedAt: media.moderationReviewedAt
      ? media.moderationReviewedAt.toISOString()
      : null,
    moderationReviewedBy: media.moderationReviewedBy
      ? {
          id: media.moderationReviewedBy.id,
          email: media.moderationReviewedBy.email ?? null,
        }
      : null,
    owner: {
      id: media.owner.id,
      email: media.owner.email ?? null,
    },
    sourceKey: media.sourceKey,
    outputKey: media.outputKey ?? null,
    posterKey: media.posterKey ?? null,
    durationSec: media.durationSec ?? null,
    width: media.width ?? null,
    height: media.height ?? null,
    codec: media.codec ?? null,
    bitrate: media.bitrate ?? null,
    sizeBytes: media.sizeBytes ? Number(media.sizeBytes) : null,
    errorMessage: media.errorMessage ?? null,
    createdAt: media.createdAt.toISOString(),
    updatedAt: media.updatedAt.toISOString(),
    lastJob: lastJob
      ? {
          id: lastJob.id,
          status: lastJob.status,
          attempt: lastJob.attempt,
          startedAt: lastJob.startedAt ? lastJob.startedAt.toISOString() : null,
          finishedAt: lastJob.finishedAt ? lastJob.finishedAt.toISOString() : null,
          logs: lastJob.logs ?? null,
        }
      : null,
  };

  return NextResponse.json(payload, { headers: NO_STORE_HEADERS });
}
