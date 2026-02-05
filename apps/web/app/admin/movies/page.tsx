/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

import type { Prisma } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { getPublicMediaUrlFromKey } from "@/lib/media/urls";

import { MovieDeleteButton } from "./_components/movie-delete-button";

type SearchParams = Record<string, string | string[] | undefined>;

type MediaTypeOption = "movie" | "series" | "all";

const mediaTypeLabels: Record<string, string> = {
  movie: "فیلم",
  series: "سریال",
};

const parseParam = (params: SearchParams, key: string) => {
  const value = params[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

const parseYear = (value?: string) => {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1880) {
    return undefined;
  }
  return parsed;
};

export default async function AdminMoviesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const query = parseParam(searchParams, "q")?.trim() ?? "";
  const mediaTypeRaw = (parseParam(searchParams, "mediaType") ?? "all").toLowerCase();
  const mediaTypeParam: MediaTypeOption =
    mediaTypeRaw === "movie" || mediaTypeRaw === "series" ? mediaTypeRaw : "all";
  const yearParam = parseYear(parseParam(searchParams, "yearReleased"));

  const where: Prisma.MovieWhereInput = {};

  if (mediaTypeParam !== "all") {
    where.mediaType = mediaTypeParam;
  }

  if (yearParam) {
    where.yearReleased = yearParam;
  }

  if (query) {
    where.OR = [
      { titleFa: { contains: query, mode: "insensitive" } },
      { titleEn: { contains: query, mode: "insensitive" } },
      { director: { contains: query, mode: "insensitive" } },
    ];
  }

  const movies = await prisma.movie.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      titleFa: true,
      titleEn: true,
      mediaType: true,
      yearReleased: true,
      director: true,
      createdAt: true,
      genres: {
        select: { nameFa: true },
      },
      posterCardMediaAsset: {
        select: { outputKey: true, visibility: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">فیلم‌ها</h1>
          <p className="text-sm text-muted-foreground">مدیریت و ثبت فیلم‌های جدید.</p>
        </div>
        <Link className="text-primary underline-offset-4 hover:underline" href="/admin/movies/new">
          افزودن فیلم
        </Link>
      </div>

      <form className="grid gap-4 rounded-md border border-border bg-background p-4 md:grid-cols-4" method="GET">
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs text-muted-foreground" htmlFor="q">
            جستجو
          </label>
          <Input id="q" name="q" defaultValue={query} placeholder="عنوان یا کارگردان" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="mediaType">
            نوع رسانه
          </label>
          <select
            id="mediaType"
            name="mediaType"
            defaultValue={mediaTypeParam}
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          >
            <option value="all">همه</option>
            <option value="movie">فیلم</option>
            <option value="series">سریال</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="yearReleased">
            سال انتشار
          </label>
          <Input id="yearReleased" name="yearReleased" type="number" min={1880} defaultValue={yearParam} />
        </div>
        <div className="flex items-center gap-2 md:col-span-4">
          <Button type="submit" size="sm">اعمال فیلتر</Button>
          <Link className="text-sm text-muted-foreground hover:text-foreground" href="/admin/movies">
            پاکسازی
          </Link>
        </div>
      </form>

      <div className="overflow-x-auto rounded-md border border-border bg-background">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-right">
            <tr>
              <th className="px-4 py-3 font-medium">پوستر</th>
              <th className="px-4 py-3 font-medium">عنوان</th>
              <th className="px-4 py-3 font-medium">نوع</th>
              <th className="px-4 py-3 font-medium">سال</th>
              <th className="px-4 py-3 font-medium">کارگردان</th>
              <th className="px-4 py-3 font-medium">ژانرها</th>
              <th className="px-4 py-3 font-medium">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {movies.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={7}>
                  هنوز فیلمی ثبت نشده است.
                </td>
              </tr>
            ) : (
              movies.map((movie) => {
                const posterUrl =
                  movie.posterCardMediaAsset?.outputKey && movie.posterCardMediaAsset.visibility === "public"
                    ? getPublicMediaUrlFromKey(movie.posterCardMediaAsset.outputKey)
                    : null;

                return (
                  <tr key={movie.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      {posterUrl ? (
                        <img
                          src={posterUrl}
                          alt={movie.titleFa}
                          className="h-12 w-10 rounded border border-border object-cover"
                        />
                      ) : (
                        <div className="h-12 w-10 rounded border border-dashed border-border text-[10px] text-muted-foreground flex items-center justify-center">
                          بدون تصویر
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">{movie.titleFa}</div>
                      <div className="text-xs text-muted-foreground">{movie.titleEn}</div>
                    </td>
                    <td className="px-4 py-3">{mediaTypeLabels[movie.mediaType] ?? movie.mediaType}</td>
                    <td className="px-4 py-3">{movie.yearReleased}</td>
                    <td className="px-4 py-3">{movie.director}</td>
                    <td className="px-4 py-3">
                      {movie.genres.map((genre) => genre.nameFa).join("، ") || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          className="text-primary underline-offset-4 hover:underline"
                          href={`/admin/movies/${movie.id}/edit`}
                        >
                          ویرایش
                        </Link>
                        <MovieDeleteButton movieId={movie.id} variant="ghost" />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
