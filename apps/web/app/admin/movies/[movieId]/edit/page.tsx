import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getPublicMediaUrlFromKey } from "@/lib/media/urls";

import { MovieForm } from "../../_components/movie-form";
import { MovieDeleteButton } from "../../_components/movie-delete-button";

export default async function EditMoviePage({
  params,
}: {
  params: { movieId: string };
}) {
  const movie = await prisma.movie.findUnique({
    where: { id: params.movieId },
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
      genres: { select: { id: true } },
      posterBigMediaAsset: { select: { outputKey: true, visibility: true } },
      posterCardMediaAsset: { select: { outputKey: true, visibility: true } },
    },
  });

  if (!movie) {
    notFound();
  }

  const posterBigUrl =
    movie.posterBigMediaAsset?.outputKey && movie.posterBigMediaAsset.visibility === "public"
      ? getPublicMediaUrlFromKey(movie.posterBigMediaAsset.outputKey)
      : null;
  const posterCardUrl =
    movie.posterCardMediaAsset?.outputKey && movie.posterCardMediaAsset.visibility === "public"
      ? getPublicMediaUrlFromKey(movie.posterCardMediaAsset.outputKey)
      : null;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">ویرایش فیلم</h1>
          <p className="text-sm text-muted-foreground">اطلاعات فیلم را بروزرسانی کنید.</p>
        </div>
        <MovieDeleteButton
          movieId={movie.id}
          variant="destructive"
          label="حذف فیلم"
          redirectTo="/admin/movies"
        />
      </div>

      <MovieForm
        mode="edit"
        movieId={movie.id}
        initialValues={{
          titleEn: movie.titleEn,
          titleFa: movie.titleFa,
          director: movie.director,
          yearReleased: movie.yearReleased,
          durationMinutes: movie.durationMinutes,
          stars: movie.stars ?? "",
          awards: movie.awards ?? "",
          mediaType: movie.mediaType,
          ageRange: movie.ageRange,
          country: movie.country ?? "",
          posterBigMediaAssetId: movie.posterBigMediaAssetId,
          posterCardMediaAssetId: movie.posterCardMediaAssetId,
          genreIds: movie.genres.map((genre: { id: string }) => genre.id),
        }}
        posterBigPreviewUrl={posterBigUrl}
        posterCardPreviewUrl={posterCardUrl}
      />
    </div>
  );
}
