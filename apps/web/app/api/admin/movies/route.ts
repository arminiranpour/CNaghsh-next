import { z } from "zod";
import { MediaType, MovieMediaType, type Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/admin";
import { NO_STORE_HEADERS, safeJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type MovieCreatePayload = {
  titleEn: string;
  titleFa: string;
  director: string;
  yearReleased: number;
  durationMinutes: number;
  stars?: string | null;
  awards?: string | null;
  mediaType: MovieMediaType;
  ageRange: string;
  country?: string | null;
  posterBigMediaAssetId: string;
  posterCardMediaAssetId: string;
  genreIds: string[];
};

type FieldErrors = Partial<Record<keyof MovieCreatePayload, string>>;

type CreateMovieResponse =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

type MovieGenreItem = {
  id: string;
  slug: string;
  nameEn: string;
  nameFa: string;
};

type MovieListItem = {
  id: string;
  titleEn: string;
  titleFa: string;
  mediaType: MovieMediaType;
  yearReleased: number;
  director: string;
  posterBigMediaAssetId: string;
  posterCardMediaAssetId: string;
  genres: MovieGenreItem[];
  createdAt: string;
};

type MovieListResponse = {
  items: MovieListItem[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

const currentYear = new Date().getFullYear();

const movieSchema = z.object({
  titleEn: z.string().trim().min(1, "عنوان انگلیسی الزامی است."),
  titleFa: z.string().trim().min(1, "عنوان فارسی الزامی است."),
  director: z.string().trim().min(1, "نام کارگردان الزامی است."),
  yearReleased: z
    .number({ invalid_type_error: "سال انتشار معتبر نیست." })
    .int("سال انتشار معتبر نیست.")
    .min(1880, "سال انتشار معتبر نیست.")
    .max(currentYear + 1, "سال انتشار معتبر نیست."),
  durationMinutes: z
    .number({ invalid_type_error: "مدت زمان معتبر نیست." })
    .int("مدت زمان معتبر نیست.")
    .min(1, "مدت زمان معتبر نیست."),
  stars: z.string().trim().optional().nullable(),
  awards: z.string().trim().optional().nullable(),
  mediaType: z.nativeEnum(MovieMediaType, { errorMap: () => ({ message: "نوع رسانه معتبر نیست." }) }),
  ageRange: z.string().trim().min(1, "رده سنی الزامی است."),
  country: z.string().trim().optional().nullable(),
  posterBigMediaAssetId: z.string().trim().min(1, "پوستر بزرگ الزامی است."),
  posterCardMediaAssetId: z.string().trim().min(1, "پوستر کارت الزامی است."),
  genreIds: z.array(z.string().trim().min(1)).min(1, "حداقل یک ژانر انتخاب کنید."),
});

const mapZodError = (error: z.ZodError, fallback: string) => {
  const fieldErrors: FieldErrors = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key as keyof MovieCreatePayload]) {
      fieldErrors[key as keyof MovieCreatePayload] = issue.message;
    }
  }

  return { error: fallback, fieldErrors } as const;
};

const normalizeText = (value: string | undefined | null): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizePayload = (payload: MovieCreatePayload) => ({
  ...payload,
  titleEn: payload.titleEn.trim(),
  titleFa: payload.titleFa.trim(),
  director: payload.director.trim(),
  ageRange: payload.ageRange.trim(),
  country: normalizeText(payload.country ?? null),
  posterBigMediaAssetId: payload.posterBigMediaAssetId.trim(),
  posterCardMediaAssetId: payload.posterCardMediaAssetId.trim(),
  stars: normalizeText(payload.stars),
  awards: normalizeText(payload.awards),
  genreIds: payload.genreIds.map((id) => id.trim()).filter((id) => id.length > 0),
});

const parseIntParam = (value: string | null): number | null => {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
};

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export async function GET(request: NextRequest): Promise<NextResponse<MovieListResponse>> {
  await requireAdminSession();

  const { searchParams } = new URL(request.url);
  const pageParam = parseIntParam(searchParams.get("page"));
  const sizeParam = parseIntParam(searchParams.get("pageSize"));
  const page = Math.max(1, pageParam ?? 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, sizeParam ?? DEFAULT_PAGE_SIZE),
  );

  const where: Prisma.MovieWhereInput = {};
  const query = searchParams.get("q")?.trim();
  const mediaTypeParam = searchParams.get("mediaType");
  const yearParam = parseIntParam(searchParams.get("yearReleased"));

  if (mediaTypeParam && Object.values(MovieMediaType).includes(mediaTypeParam as MovieMediaType)) {
    where.mediaType = mediaTypeParam as MovieMediaType;
  }

  if (yearParam && yearParam >= 1880) {
    where.yearReleased = yearParam;
  }

  if (query) {
    where.OR = [
      { titleEn: { contains: query, mode: "insensitive" } },
      { titleFa: { contains: query, mode: "insensitive" } },
      { director: { contains: query, mode: "insensitive" } },
    ];
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
        mediaType: true,
        yearReleased: true,
        director: true,
        posterBigMediaAssetId: true,
        posterCardMediaAssetId: true,
        createdAt: true,
        genres: {
          select: {
            id: true,
            slug: true,
            nameEn: true,
            nameFa: true,
          },
        },
      },
    }),
  ]);

  return NextResponse.json(
    {
      items: items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
      page,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
    { headers: NO_STORE_HEADERS },
  );
}

export async function POST(request: NextRequest): Promise<NextResponse<CreateMovieResponse>> {
  const { user } = await requireAdminSession();

  if (!user?.id) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  const parsedJson = await safeJson<MovieCreatePayload>(request);
  if (!parsedJson.ok) {
    return NextResponse.json(
      { ok: false, error: "INVALID_JSON" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const parsed = movieSchema.safeParse(parsedJson.data);
  if (!parsed.success) {
    const mapped = mapZodError(parsed.error, "لطفاً خطاهای فرم را برطرف کنید.");
    return NextResponse.json(
      { ok: false, error: mapped.error, fieldErrors: mapped.fieldErrors },
      { status: 422, headers: NO_STORE_HEADERS },
    );
  }

  const normalized = normalizePayload(parsed.data);
  const fieldErrors: FieldErrors = {};
  const uniqueGenreIds = Array.from(new Set(normalized.genreIds));

  const [genreRecords, mediaAssets] = await Promise.all([
    prisma.genre.findMany({
      where: { id: { in: uniqueGenreIds } },
      select: { id: true },
    }),
    prisma.mediaAsset.findMany({
      where: {
        id: {
          in: [normalized.posterBigMediaAssetId, normalized.posterCardMediaAssetId],
        },
      },
      select: { id: true, type: true },
    }),
  ]);

  if (genreRecords.length !== uniqueGenreIds.length) {
    fieldErrors.genreIds = "ژانر انتخاب‌شده معتبر نیست.";
  }

  const mediaById = new Map(mediaAssets.map((asset) => [asset.id, asset]));
  const posterBig = mediaById.get(normalized.posterBigMediaAssetId);
  const posterCard = mediaById.get(normalized.posterCardMediaAssetId);

  if (!posterBig) {
    fieldErrors.posterBigMediaAssetId = "پوستر بزرگ یافت نشد.";
  } else if (posterBig.type !== MediaType.image) {
    fieldErrors.posterBigMediaAssetId = "پوستر بزرگ باید تصویر باشد.";
  }

  if (!posterCard) {
    fieldErrors.posterCardMediaAssetId = "پوستر کارت یافت نشد.";
  } else if (posterCard.type !== MediaType.image) {
    fieldErrors.posterCardMediaAssetId = "پوستر کارت باید تصویر باشد.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      { ok: false, error: "لطفاً خطاهای فرم را برطرف کنید.", fieldErrors },
      { status: 422, headers: NO_STORE_HEADERS },
    );
  }

  const movie = await prisma.movie.create({
    data: {
      titleEn: normalized.titleEn,
      titleFa: normalized.titleFa,
      director: normalized.director,
      yearReleased: normalized.yearReleased,
      durationMinutes: normalized.durationMinutes,
      stars: normalized.stars,
      awards: normalized.awards,
      mediaType: normalized.mediaType,
      ageRange: normalized.ageRange,
      country: normalized.country,
      posterBigMediaAssetId: normalized.posterBigMediaAssetId,
      posterCardMediaAssetId: normalized.posterCardMediaAssetId,
      createdByUserId: user.id,
      genres: {
        connect: uniqueGenreIds.map((id) => ({ id })),
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: movie.id }, { headers: NO_STORE_HEADERS });
}
