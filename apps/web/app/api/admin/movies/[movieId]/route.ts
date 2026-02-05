import { z } from "zod";
import { MediaType, MovieMediaType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/admin";
import { NO_STORE_HEADERS, safeJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type MovieMutationPayload = {
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

type FieldErrors = Partial<Record<keyof MovieMutationPayload, string>>;

type MovieMutationResponse =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

type MovieDetailResponse =
  | {
      ok: true;
      movie: {
        id: string;
        titleEn: string;
        titleFa: string;
        director: string;
        yearReleased: number;
        durationMinutes: number;
        stars: string | null;
        awards: string | null;
        mediaType: MovieMediaType;
        ageRange: string;
        country: string | null;
        posterBigMediaAssetId: string;
        posterCardMediaAssetId: string;
        genres: Array<{ id: string; slug: string; nameEn: string; nameFa: string }>;
        posterBigMediaAsset?: { id: string; outputKey: string | null; visibility: string } | null;
        posterCardMediaAsset?: { id: string; outputKey: string | null; visibility: string } | null;
      };
    }
  | { ok: false; error: string };

const idSchema = z.string().cuid();

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
    if (typeof key === "string" && !fieldErrors[key as keyof MovieMutationPayload]) {
      fieldErrors[key as keyof MovieMutationPayload] = issue.message;
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

const normalizePayload = (payload: MovieMutationPayload) => ({
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

export async function GET(
  _request: NextRequest,
  { params }: { params: { movieId: string } },
): Promise<NextResponse<MovieDetailResponse>> {
  await requireAdminSession();

  const id = idSchema.safeParse(params.movieId);
  if (!id.success) {
    return NextResponse.json(
      { ok: false, error: "شناسه نامعتبر است." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const movie = await prisma.movie.findUnique({
    where: { id: id.data },
    select: {
      id: true,
      titleEn: true,
      titleFa: true,
      director: true,
      yearReleased: true,
      durationMinutes: true,
      stars: true,
      awards: true,
      mediaType: true,
      ageRange: true,
      country: true,
      posterBigMediaAssetId: true,
      posterCardMediaAssetId: true,
      genres: {
        select: { id: true, slug: true, nameEn: true, nameFa: true },
      },
      posterBigMediaAsset: {
        select: { id: true, outputKey: true, visibility: true },
      },
      posterCardMediaAsset: {
        select: { id: true, outputKey: true, visibility: true },
      },
    },
  });

  if (!movie) {
    return NextResponse.json(
      { ok: false, error: "فیلم یافت نشد." },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ ok: true, movie }, { headers: NO_STORE_HEADERS });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { movieId: string } },
): Promise<NextResponse<MovieMutationResponse>> {
  await requireAdminSession();

  const id = idSchema.safeParse(params.movieId);
  if (!id.success) {
    return NextResponse.json(
      { ok: false, error: "شناسه نامعتبر است." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const parsedJson = await safeJson<MovieMutationPayload>(request);
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

  const existing = await prisma.movie.findUnique({ where: { id: id.data }, select: { id: true } });
  if (!existing) {
    return NextResponse.json(
      { ok: false, error: "فیلم یافت نشد." },
      { status: 404, headers: NO_STORE_HEADERS },
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

  const updated = await prisma.movie.update({
    where: { id: id.data },
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
      genres: {
        set: uniqueGenreIds.map((genreId) => ({ id: genreId })),
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: updated.id }, { headers: NO_STORE_HEADERS });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { movieId: string } },
): Promise<NextResponse<MovieMutationResponse>> {
  await requireAdminSession();

  const id = idSchema.safeParse(params.movieId);
  if (!id.success) {
    return NextResponse.json(
      { ok: false, error: "شناسه نامعتبر است." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const movie = await prisma.movie.findUnique({
    where: { id: id.data },
    select: { id: true },
  });

  if (!movie) {
    return NextResponse.json(
      { ok: false, error: "فیلم یافت نشد." },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  await prisma.movie.delete({ where: { id: id.data } });

  return NextResponse.json({ ok: true, id: id.data }, { headers: NO_STORE_HEADERS });
}
