import { Buffer } from "node:buffer";

import { MediaModerationStatus, MediaStatus, MediaType, type Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/admin";
import { NO_STORE_HEADERS } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type CursorValue = {
  createdAt: Date;
  id: string;
};

type AdminMediaListItem = {
  id: string;
  type: "image" | "video";
  status: string;
  visibility: "public" | "private";
  moderationStatus: "pending" | "approved" | "rejected";
  ownerUserId: string;
  ownerEmail?: string | null;
  createdAt: string;
  durationSec?: number | null;
  width?: number | null;
  height?: number | null;
  sizeBytes?: number | null;
  errorMessage?: string | null;
};

type AdminMediaListResponse = {
  items: AdminMediaListItem[];
  nextCursor?: string | null;
};

const STATUS_VALUES = new Set<MediaStatus>([
  MediaStatus.uploaded,
  MediaStatus.processing,
  MediaStatus.ready,
  MediaStatus.failed,
]);

const TYPE_VALUES = new Set<MediaType>([MediaType.image, MediaType.video]);

const MODERATION_OPTIONS = [
  MediaModerationStatus.pending,
  MediaModerationStatus.approved,
  MediaModerationStatus.rejected,
] as const;

const MODERATION_VALUES = new Set<MediaModerationStatus>(MODERATION_OPTIONS);

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const encodeCursor = (value: CursorValue): string => {
  const payload = `${value.createdAt.toISOString()}::${value.id}`;
  return Buffer.from(payload).toString("base64url");
};

const decodeCursor = (value: string): CursorValue | null => {
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const [createdAtRaw, id] = decoded.split("::");
    if (!createdAtRaw || !id) {
      return null;
    }
    const createdAt = new Date(createdAtRaw);
    if (Number.isNaN(createdAt.getTime())) {
      return null;
    }
    return { createdAt, id };
  } catch {
    return null;
  }
};

const buildCursorCondition = (cursor: CursorValue): Prisma.MediaAssetWhereInput => {
  return {
    OR: [
      { createdAt: { lt: cursor.createdAt } },
      {
        AND: [
          { createdAt: { equals: cursor.createdAt } },
          { id: { lt: cursor.id } },
        ],
      },
    ],
  };
};

const parseLimit = (value: string | null): number => {
  if (!value) {
    return DEFAULT_LIMIT;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(parsed, MAX_LIMIT);
};

const toListItem = (
  item: Prisma.MediaAssetGetPayload<{ include: { owner: { select: { email: true } } } }>,
): AdminMediaListItem => {
  return {
    id: item.id,
    type: item.type,
    status: item.status,
    visibility: item.visibility,
    moderationStatus: item.moderationStatus,
    ownerUserId: item.ownerUserId,
    ownerEmail: item.owner?.email ?? null,
    createdAt: item.createdAt.toISOString(),
    durationSec: item.durationSec ?? null,
    width: item.width ?? null,
    height: item.height ?? null,
    sizeBytes: item.sizeBytes ? Number(item.sizeBytes) : null,
    errorMessage: item.errorMessage ?? null,
  };
};

export async function GET(request: NextRequest): Promise<NextResponse<AdminMediaListResponse>> {
  await requireAdminSession();

  const { searchParams } = new URL(request.url);

  const statusParam = searchParams.get("status");
  const typeParam = searchParams.get("type");
  const moderationParam = searchParams.get("moderation");
  const userParam = searchParams.get("user");
  const cursorParam = searchParams.get("cursor");
  const limit = parseLimit(searchParams.get("limit"));

  const where: Prisma.MediaAssetWhereInput = {};
  const andConditions: Prisma.MediaAssetWhereInput[] = [];

  if (statusParam) {
    if (!STATUS_VALUES.has(statusParam as MediaStatus)) {
      return NextResponse.json(
        { items: [] },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    where.status = statusParam as MediaStatus;
  }

  if (typeParam) {
    if (!TYPE_VALUES.has(typeParam as MediaType)) {
      return NextResponse.json(
        { items: [] },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    where.type = typeParam as MediaType;
  }

  if (moderationParam) {
    if (!MODERATION_VALUES.has(moderationParam as MediaModerationStatus)) {
      return NextResponse.json(
        { items: [] },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    where.moderationStatus = moderationParam as MediaModerationStatus;
  }

  if (userParam && userParam.trim().length > 0) {
    const query = userParam.trim();
    andConditions.push({
      OR: [
        { ownerUserId: { contains: query } },
        { owner: { email: { contains: query, mode: "insensitive" } } },
      ],
    });
  }

  if (cursorParam) {
    const decoded = decodeCursor(cursorParam);
    if (!decoded) {
      return NextResponse.json(
        { items: [] },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    andConditions.push(buildCursorCondition(decoded));
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const items = await prisma.mediaAsset.findMany({
    where,
    include: { owner: { select: { email: true } } },
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take: limit + 1,
  });

  const hasMore = items.length > limit;
  const sliced = hasMore ? items.slice(0, limit) : items;
  const responseItems = sliced.map(toListItem);
  let nextCursor: string | null = null;
  if (hasMore) {
    const last = sliced[sliced.length - 1];
    nextCursor = encodeCursor({ createdAt: last.createdAt, id: last.id });
  }

  return NextResponse.json(
    {
      items: responseItems,
      nextCursor,
    },
    { headers: NO_STORE_HEADERS },
  );
}
