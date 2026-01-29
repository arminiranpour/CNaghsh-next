"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

import { MoviePosterUploader } from "./movie-poster-uploader";

type MovieMediaType = "movie" | "series";

type GenreOption = {
  id: string;
  slug: string;
  nameEn: string;
  nameFa: string;
};

export type MovieFormValues = {
  titleEn: string;
  titleFa: string;
  director: string;
  yearReleased: number;
  durationMinutes: number;
  stars: string;
  awards: string;
  mediaType: MovieMediaType;
  ageRange: string;
  country: string;
  posterBigMediaAssetId: string;
  posterCardMediaAssetId: string;
  genreIds: string[];
};

type FormErrors = Partial<Record<keyof MovieFormValues, string>>;

type CreateMovieResponse =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: FormErrors };

type GenresResponse = { items: GenreOption[] };

const mediaTypeOptions: Array<{ value: MovieMediaType; label: string }> = [
  { value: "movie", label: "فیلم" },
  { value: "series", label: "سریال" },
];

const DEFAULT_VALUES: MovieFormValues = {
  titleEn: "",
  titleFa: "",
  director: "",
  yearReleased: new Date().getFullYear(),
  durationMinutes: 90,
  stars: "",
  awards: "",
  mediaType: "movie",
  ageRange: "",
  country: "",
  posterBigMediaAssetId: "",
  posterCardMediaAssetId: "",
  genreIds: [],
};

type MovieFormProps = {
  mode?: "create" | "edit";
  movieId?: string;
  initialValues?: Partial<MovieFormValues>;
  posterBigPreviewUrl?: string | null;
  posterCardPreviewUrl?: string | null;
};

export function MovieForm({
  mode = "create",
  movieId,
  initialValues,
  posterBigPreviewUrl,
  posterCardPreviewUrl,
}: MovieFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState<MovieFormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
    genreIds: initialValues?.genreIds ?? DEFAULT_VALUES.genreIds,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [genres, setGenres] = useState<GenreOption[]>([]);
  const [genresStatus, setGenresStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    setGenresStatus("loading");

    fetch("/api/admin/genres")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("FAILED");
        }
        const payload = (await response.json().catch(() => null)) as GenresResponse | null;
        if (!active) {
          return;
        }
        setGenres(payload?.items ?? []);
        setGenresStatus("ready");
      })
      .catch(() => {
        if (active) {
          setGenresStatus("error");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const genreOptions = useMemo(() => {
    return genres.slice().sort((a, b) => a.nameFa.localeCompare(b.nameFa, "fa"));
  }, [genres]);

  const handleToggleGenre = (genreId: string) => {
    setValues((prev) => {
      const next = new Set(prev.genreIds);
      if (next.has(genreId)) {
        next.delete(genreId);
      } else {
        next.add(genreId);
      }
      return { ...prev, genreIds: Array.from(next) };
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const payload = {
        titleEn: values.titleEn,
        titleFa: values.titleFa,
        director: values.director,
        yearReleased: values.yearReleased,
        durationMinutes: values.durationMinutes,
        stars: values.stars,
        awards: values.awards,
        mediaType: values.mediaType,
        ageRange: values.ageRange,
        country: values.country,
        posterBigMediaAssetId: values.posterBigMediaAssetId,
        posterCardMediaAssetId: values.posterCardMediaAssetId,
        genreIds: values.genreIds,
      } satisfies MovieFormValues;

      const endpoint = mode === "edit" && movieId ? `/api/admin/movies/${movieId}` : "/api/admin/movies";
      const response = await fetch(endpoint, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => null)) as CreateMovieResponse | null;

      if (!response.ok || !result?.ok) {
        setErrors(result?.fieldErrors ?? {});
        toast({
          variant: "destructive",
          description: result?.error ?? "ذخیره فیلم ناموفق بود.",
        });
        return;
      }

      setErrors({});
      toast({ description: mode === "edit" ? "فیلم بروزرسانی شد." : "فیلم با موفقیت ثبت شد." });
      router.push("/admin/movies");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
      <div className="grid gap-6 rounded-md border border-border bg-background p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="titleFa">عنوان فارسی</Label>
            <Input
              id="titleFa"
              value={values.titleFa}
              onChange={(event) => setValues((prev) => ({ ...prev, titleFa: event.target.value }))}
            />
            {errors.titleFa ? <p className="text-xs text-destructive">{errors.titleFa}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="titleEn">عنوان انگلیسی</Label>
            <Input
              id="titleEn"
              value={values.titleEn}
              onChange={(event) => setValues((prev) => ({ ...prev, titleEn: event.target.value }))}
            />
            {errors.titleEn ? <p className="text-xs text-destructive">{errors.titleEn}</p> : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="director">کارگردان</Label>
            <Input
              id="director"
              value={values.director}
              onChange={(event) => setValues((prev) => ({ ...prev, director: event.target.value }))}
            />
            {errors.director ? <p className="text-xs text-destructive">{errors.director}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="mediaType">نوع رسانه</Label>
            <Select
              value={values.mediaType}
              onValueChange={(value: MovieMediaType) =>
                setValues((prev) => ({ ...prev, mediaType: value }))
              }
            >
              <SelectTrigger id="mediaType">
                <SelectValue placeholder="نوع رسانه" />
              </SelectTrigger>
              <SelectContent>
                {mediaTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.mediaType ? <p className="text-xs text-destructive">{errors.mediaType}</p> : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="yearReleased">سال انتشار</Label>
            <Input
              id="yearReleased"
              type="number"
              min={1880}
              value={values.yearReleased}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  yearReleased: Number(event.target.value),
                }))
              }
            />
            {errors.yearReleased ? (
              <p className="text-xs text-destructive">{errors.yearReleased}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="durationMinutes">مدت زمان (دقیقه)</Label>
            <Input
              id="durationMinutes"
              type="number"
              min={1}
              value={values.durationMinutes}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  durationMinutes: Number(event.target.value),
                }))
              }
            />
            {errors.durationMinutes ? (
              <p className="text-xs text-destructive">{errors.durationMinutes}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ageRange">رده سنی</Label>
          <Input
            id="ageRange"
            value={values.ageRange}
            onChange={(event) => setValues((prev) => ({ ...prev, ageRange: event.target.value }))}
            placeholder="مثلاً ۱۲+ یا PG"
          />
          {errors.ageRange ? <p className="text-xs text-destructive">{errors.ageRange}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">کشور (اختیاری)</Label>
          <Input
            id="country"
            value={values.country}
            onChange={(event) => setValues((prev) => ({ ...prev, country: event.target.value }))}
            placeholder="مثلاً ایران"
          />
          {errors.country ? <p className="text-xs text-destructive">{errors.country}</p> : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>ژانرها</Label>
            {genresStatus === "loading" ? (
              <span className="text-xs text-muted-foreground">در حال بارگذاری...</span>
            ) : null}
          </div>
          {genresStatus === "error" ? (
            <p className="text-xs text-destructive">بارگذاری ژانرها ناموفق بود.</p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            {genreOptions.map((genre) => (
              <label key={genre.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={values.genreIds.includes(genre.id)}
                  onChange={() => handleToggleGenre(genre.id)}
                />
                <span>{genre.nameFa}</span>
              </label>
            ))}
          </div>
          {errors.genreIds ? <p className="text-xs text-destructive">{errors.genreIds}</p> : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <MoviePosterUploader
            label="پوستر بزرگ"
            description="فایل تصویر برای پوستر اصلی فیلم."
            value={values.posterBigMediaAssetId}
            initialPreviewUrl={posterBigPreviewUrl}
            error={errors.posterBigMediaAssetId}
            onChange={(mediaId) =>
              setValues((prev) => ({ ...prev, posterBigMediaAssetId: mediaId }))
            }
          />
          <MoviePosterUploader
            label="پوستر کارت"
            description="تصویر کوچک برای کارت یا لیست فیلم‌ها."
            value={values.posterCardMediaAssetId}
            initialPreviewUrl={posterCardPreviewUrl}
            error={errors.posterCardMediaAssetId}
            onChange={(mediaId) =>
              setValues((prev) => ({ ...prev, posterCardMediaAssetId: mediaId }))
            }
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="stars">ستارگان (اختیاری)</Label>
            <Textarea
              id="stars"
              value={values.stars}
              onChange={(event) => setValues((prev) => ({ ...prev, stars: event.target.value }))}
              placeholder="مثلاً: بازیگر ۱، بازیگر ۲"
            />
            {errors.stars ? <p className="text-xs text-destructive">{errors.stars}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="awards">جوایز (اختیاری)</Label>
            <Textarea
              id="awards"
              value={values.awards}
              onChange={(event) => setValues((prev) => ({ ...prev, awards: event.target.value }))}
            />
            {errors.awards ? <p className="text-xs text-destructive">{errors.awards}</p> : null}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "در حال ذخیره..." : "ثبت فیلم"}
        </Button>
      </div>
    </form>
  );
}
