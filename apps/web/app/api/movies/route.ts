import { MovieMediaType, type Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { NO_STORE_HEADERS } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getPublicMediaUrlFromKey } from "@/lib/media/urls";

type MovieListItem = {
  id: string;
  titleEn: string;
  titleFa: string;
  director: string;
  yearReleased: number;
  mediaType: MovieMediaType;
  country: string | null;
  ageRange: string;
  posterCardMediaAssetId: string;
  posterCardPreviewUrl: string | null;
  genres: Array<{ id: string; slug: string; nameEn: string; nameFa: string }>;
};

type MovieListResponse = {
  items: MovieListItem[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

const DEFAULT_PAGE_SIZE = 9;
const MAX_PAGE_SIZE = 50;

const parseIntParam = (value: string | null) => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseCsv = (value: string | null) => {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

export async function GET(request: NextRequest): Promise<NextResponse<MovieListResponse>> {
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseIntParam(searchParams.get("page")) ?? 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseIntParam(searchParams.get("pageSize")) ?? DEFAULT_PAGE_SIZE),
  );

  const q = searchParams.get("q")?.trim();
  const mediaType = searchParams.get("mediaType");
  const yearFrom = parseIntParam(searchParams.get("yearFrom"));
  const yearTo = parseIntParam(searchParams.get("yearTo"));
  const country = searchParams.get("country")?.trim();
  const ageRange = searchParams.get("ageRange")?.trim();
  const genreIds = parseCsv(searchParams.get("genreIds"));

  const where: Prisma.MovieWhereInput = {};

  if (q) {
    where.OR = [
      { titleFa: { contains: q, mode: "insensitive" } },
      { titleEn: { contains: q, mode: "insensitive" } },
      { director: { contains: q, mode: "insensitive" } },
      { stars: { contains: q, mode: "insensitive" } },
    ];
  }

  if (mediaType && mediaType !== "all" && Object.values(MovieMediaType).includes(mediaType as MovieMediaType)) {
    where.mediaType = mediaType as MovieMediaType;
  }

  if (yearFrom || yearTo) {
    where.yearReleased = {
      gte: yearFrom ?? undefined,
      lte: yearTo ?? undefined,
    };
  }

  if (country) {
    where.country = { equals: country, mode: "insensitive" };
  }

  if (ageRange) {
    where.ageRange = ageRange;
  }

  if (genreIds.length) {
    where.genres = { some: { id: { in: genreIds } } };
  }

  const [total, items] = await prisma.$transaction([
    prisma.movie.count({ where }),
    prisma.movie.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        titleEn: true,
        titleFa: true,
        director: true,
        yearReleased: true,
        mediaType: true,
        country: true,
        ageRange: true,
        posterCardMediaAssetId: true,
        genres: {
          select: { id: true, slug: true, nameEn: true, nameFa: true },
        },
        posterCardMediaAsset: {
          select: { outputKey: true, visibility: true },
        },
      },
    }),
  ]);

  const mapped = items.map((item) => {
    const previewUrl =
      item.posterCardMediaAsset?.outputKey && item.posterCardMediaAsset.visibility === "public"
        ? getPublicMediaUrlFromKey(item.posterCardMediaAsset.outputKey)
        : null;

    return {
      id: item.id,
      titleEn: item.titleEn,
      titleFa: item.titleFa,
      director: item.director,
      yearReleased: item.yearReleased,
      mediaType: item.mediaType,
      country: item.country ?? null,
      ageRange: item.ageRange,
      posterCardMediaAssetId: item.posterCardMediaAssetId,
      posterCardPreviewUrl: previewUrl,
      genres: item.genres,
    } satisfies MovieListItem;
  });

  return NextResponse.json(
    {
      items: mapped,
      page,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
    { headers: NO_STORE_HEADERS },
  );
}
