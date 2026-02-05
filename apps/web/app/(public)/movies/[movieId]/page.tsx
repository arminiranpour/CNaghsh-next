import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { iransans, iransansBold } from "@/app/fonts";
import { MovieHeroSaveButton } from "@/components/movies/MovieHeroSaveButton";
import Header from "@/components/Header";
import { getServerAuthSession } from "@/lib/auth/session";
import { getPublicMediaUrlFromKey } from "@/lib/media/urls";
import { prisma } from "@/lib/prisma";

export const revalidate = 0;

const numberFormatter = new Intl.NumberFormat("fa-IR", { useGrouping: false });

const toFaNumber = (value: number) => numberFormatter.format(value);

const formatDuration = (minutes?: number | null) => {
  if (typeof minutes !== "number" || !Number.isFinite(minutes)) {
    return null;
  }

  const totalMinutes = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours > 0 && mins > 0) {
    return `${toFaNumber(hours)} ساعت و ${toFaNumber(mins)} دقیقه`;
  }

  if (hours > 0) {
    return `${toFaNumber(hours)} ساعت`;
  }

  return `${toFaNumber(mins)} دقیقه`;
};

const formatStars = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (!items.length) {
    return null;
  }
  return items.join(" , ");
};

const getTitleFontSize = (titleLength: number, maxWidth: number) => {
  const baseSize = 40;
  const minSize = 12;
  const shrinkStart = 34;
  const shrinkRate = 0.35;

  const reduced = titleLength <= shrinkStart
    ? baseSize
    : Math.round(baseSize - (titleLength - shrinkStart) * shrinkRate);

  const approximateWidth = (size: number) => titleLength * size * 0.58;
  let size = Math.max(minSize, reduced);
  while (size > minSize && approximateWidth(size) > maxWidth) {
    size -= 1;
  }
  return size;
};

export default async function MovieDetailsPage({
  params,
}: {
  params: { movieId: string };
}) {
  const session = await getServerAuthSession();
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
      genres: { select: { id: true, slug: true, nameFa: true, nameEn: true } },
      posterBigMediaAsset: { select: { outputKey: true, visibility: true } },
    },
  });

  if (!movie) {
    notFound();
  }

  const isSavedByMe = session?.user?.id
    ? await prisma.savedItem.findUnique({
        where: {
          userId_type_entityId: {
            userId: session.user.id,
            type: "MOVIE",
            entityId: movie.id,
          },
        },
        select: { id: true },
      })
    : null;

  const posterUrl =
    movie.posterBigMediaAsset?.outputKey && movie.posterBigMediaAsset.visibility === "public"
      ? getPublicMediaUrlFromKey(movie.posterBigMediaAsset.outputKey)
      : null;

  const genreText = movie.genres
    .map((genre) => genre.nameFa)
    .filter((name) => Boolean(name))
    .join(" | ");

  const durationText = formatDuration(movie.durationMinutes);
  const yearText = toFaNumber(movie.yearReleased);
  const stars = formatStars(movie.stars);
  const awards = movie.awards?.trim();
  const titleText = `${movie.titleEn} / ${movie.titleFa}`;
  const titleLength = titleText.replace(/\s+/g, "").length;
  const titleMaxWidth = 564 - 190;
  const titleFontSize = getTitleFontSize(titleLength, titleMaxWidth);
  const titleLineHeight = Math.round(titleFontSize * 1.73);

  return (
    <div className="w-full bg-black" dir="rtl">
      <div className="relative mx-auto h-[849px] w-[1440px] overflow-hidden bg-black text-white">
        <Header variant="overlay" />
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={movie.titleFa}
            className="absolute left-0 top-0 z-0 h-[810px] w-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
        ) : null}

        <div className="absolute left-0 top-0 z-10 h-[810px] w-full bg-[linear-gradient(180deg,rgba(217,217,217,0)_0%,#000000_100%)]" />
        <div className="absolute left-0 top-[810px] z-10 h-[39px] w-full bg-black" />

        <Link
          href="/movies"
          className="absolute left-[1266px] top-[120px] z-20 flex h-[46px] w-[50px] items-center justify-center rounded-[7px] bg-white/90 mix-blend-soft-light"
          aria-label="بازگشت"
        >
          <ArrowLeft className="h-[20px] w-[20px] rotate-180 text-black/80" />
        </Link>

        <div
          className={`${iransansBold.className} absolute left-[736px] top-[473px] z-20 w-[564px] text-right text-white`}
        >
          <div className="flex flex-col items-start gap-[12px]">
            {genreText ? (
              <div className="text-[20px] font-bold leading-[32px]">{genreText}</div>
            ) : null}

            <div className="flex w-full items-center justify-between gap-[12px]" dir="rtl">
              <div
                className="flex min-w-0 flex-1 items-baseline gap-[5px] whitespace-nowrap text-white"
                style={{ maxWidth: `${titleMaxWidth}px`, overflow: "hidden" }}
              >
                <span
                  className="font-bold"
                  style={{
                    fontSize: `${titleFontSize}px`,
                    lineHeight: `${titleLineHeight}px`,
                    fontFamily: "Palanquin Dark, IRANSans, sans-serif",
                  }}
                >
                  {movie.titleEn}
                </span>
                <span
                  className="font-bold"
                  style={{ fontSize: `${Math.max(16, titleFontSize - 5)}px`, lineHeight: `${titleLineHeight}px` }}
                >
                  /
                </span>
                <span
                  className="font-bold"
                  style={{ fontSize: `${titleFontSize}px`, lineHeight: `${titleLineHeight}px` }}
                >
                  {movie.titleFa}
                </span>
              </div>
              <MovieHeroSaveButton
                className="shrink-0"
                movieId={movie.id}
                initialSaved={Boolean(isSavedByMe)}
              />

            </div>

            <div className="text-[20px] leading-[32px]">
              <span className="font-bold">{yearText}</span>
              <span className={`${iransans.className} font-normal`}> | </span>
              <span className="font-bold">کارگردان: </span>
              <span className={`${iransans.className} font-normal`}>{movie.director}</span>
              {durationText ? (
                <>
                  <span className={`${iransans.className} font-normal`}> | </span>
                  <span className="font-bold">مدت زمان: </span>
                  <span className={`${iransans.className} font-normal`}>{durationText}</span>
                </>
              ) : null}
            </div>

            {stars ? (
              <div className="text-[20px] leading-[32px]">
                <span className="font-bold">ستارگان: </span>
                <span className={`${iransans.className} font-normal`}>{stars}</span>
              </div>
            ) : null}

            {awards ? (
              <div className="text-[20px] leading-[32px]">
                <span className="font-bold">افتخارات فیلم: </span>
                <span className={`${iransans.className} font-normal`}>{awards}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
