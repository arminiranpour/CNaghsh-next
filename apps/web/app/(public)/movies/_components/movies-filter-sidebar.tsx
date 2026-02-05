"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type GenreOption = {
  id: string;
  nameFa: string;
  nameEn: string;
  slug: string;
};

type MoviesFilterSidebarProps = {
  genres: GenreOption[];
  countries: string[];
  ageRanges: string[];
  yearMin: number;
  yearMax: number;
  className?: string;
};

type MediaTypeFilter = "all" | "movie" | "series";

const parseIntParam = (value?: string | null) => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseCsv = (value?: string | null) => {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

export function MoviesFilterSidebar({
  genres,
  countries,
  ageRanges,
  yearMin,
  yearMax,
  className,
}: MoviesFilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mediaType, setMediaType] = useState<MediaTypeFilter>("all");
  const [yearRange, setYearRange] = useState<[number, number]>([yearMin, yearMax]);
  const [country, setCountry] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [genreIds, setGenreIds] = useState<string[]>([]);

  const [countryOpen, setCountryOpen] = useState(false);
  const [ageRangeOpen, setAgeRangeOpen] = useState(false);
  const [genreOpen, setGenreOpen] = useState(false);

  useEffect(() => {
    const mediaParam = searchParams?.get("mediaType")?.toLowerCase();
    if (mediaParam === "movie" || mediaParam === "series") {
      setMediaType(mediaParam);
    } else {
      setMediaType("all");
    }

    const nextFrom = parseIntParam(searchParams?.get("yearFrom")) ?? yearMin;
    const nextTo = parseIntParam(searchParams?.get("yearTo")) ?? yearMax;
    setYearRange([nextFrom, nextTo]);

    setCountry(searchParams?.get("country") ?? "");
    setAgeRange(searchParams?.get("ageRange") ?? "");
    setGenreIds(parseCsv(searchParams?.get("genreIds")));
  }, [searchParams, yearMin, yearMax]);

  const sortedYearRange = useMemo<[number, number]>(() => {
    const [min, max] = yearRange;
    return [Math.min(min, max), Math.max(min, max)];
  }, [yearRange]);

  const yearSpan = Math.max(1, yearMax - yearMin);
  const minPercent = ((sortedYearRange[0] - yearMin) / yearSpan) * 100;
  const maxPercent = ((sortedYearRange[1] - yearMin) / yearSpan) * 100;

  const dropdownItemClass =
    "w-full cursor-pointer rounded-xl px-3 py-2 text-right text-sm text-[#1F1F1F] hover:bg-[#F2F2F2]";

  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState<"min" | "max" | null>(null);

  const clampYear = useCallback(
    (value: number) => Math.min(Math.max(value, yearMin), yearMax),
    [yearMin, yearMax],
  );

  const valueFromClientX = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return yearMin;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = (clientX - rect.left) / rect.width;
      const clampedRatio = Math.min(Math.max(ratio, 0), 1);
      return Math.round(yearMin + clampedRatio * (yearMax - yearMin));
    },
    [yearMin, yearMax],
  );

  const updateThumb = useCallback(
    (target: "min" | "max", rawValue: number) => {
      const nextValue = clampYear(rawValue);
      if (target === "min") {
        setYearRange([Math.min(nextValue, sortedYearRange[1]), sortedYearRange[1]]);
      } else {
        setYearRange([sortedYearRange[0], Math.max(nextValue, sortedYearRange[0])]);
      }
    },
    [clampYear, sortedYearRange],
  );

  const handleTrackPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const clickValue = valueFromClientX(event.clientX);
    const distanceToMin = Math.abs(clickValue - sortedYearRange[0]);
    const distanceToMax = Math.abs(clickValue - sortedYearRange[1]);
    const target: "min" | "max" = distanceToMin <= distanceToMax ? "min" : "max";
    updateThumb(target, clickValue);
    setDragging(target);
    (event.target as HTMLElement)?.setPointerCapture?.(event.pointerId);
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const value = valueFromClientX(event.clientX);
      updateThumb(dragging, value);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!dragging) return;
      (event.target as HTMLElement)?.releasePointerCapture?.(event.pointerId);
      setDragging(null);
    };

    if (dragging) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    }

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragging, updateThumb, valueFromClientX]);

  const handleApply = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("page");

    if (mediaType !== "all") params.set("mediaType", mediaType);
    else params.delete("mediaType");

    if (sortedYearRange[0] > yearMin) params.set("yearFrom", String(sortedYearRange[0]));
    else params.delete("yearFrom");

    if (sortedYearRange[1] < yearMax) params.set("yearTo", String(sortedYearRange[1]));
    else params.delete("yearTo");

    if (country) params.set("country", country);
    else params.delete("country");

    if (ageRange) params.set("ageRange", ageRange);
    else params.delete("ageRange");

    if (genreIds.length) params.set("genreIds", genreIds.join(","));
    else params.delete("genreIds");

    const next = params.toString();
    router.push(next ? `/movies?${next}` : "/movies", { scroll: false });
  };

  const handleClear = () => {
    setMediaType("all");
    setYearRange([yearMin, yearMax]);
    setCountry("");
    setAgeRange("");
    setGenreIds([]);

    const params = new URLSearchParams(searchParams?.toString() ?? "");
    for (const key of ["mediaType", "yearFrom", "yearTo", "country", "ageRange", "genreIds", "page"]) {
      params.delete(key);
    }
    const next = params.toString();
    router.push(next ? `/movies?${next}` : "/movies", { scroll: false });
  };

  return (
    <div
      className={cn(
        "relative w-[371px] min-h-[800px] rounded-tl-[49px] rounded-bl-[49px] rounded-tr-none rounded-br-none bg-white px-7 py-8 shadow-[0_12px_60px_-30px_rgba(0,0,0,0.4)]",
        className,
      )}
      dir="rtl"
      role="search"
    >
      <h2 className="mb-6 text-2xl font-bold text-black">فیلترها</h2>

      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <span className="text-sm font-normal text-[#7A7A7A]">نوع</span>
          <div className="flex items-center gap-3">
            {(["movie", "series"] as const).map((option) => {
              const active = mediaType === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMediaType(active ? "all" : option)}
                  className={cn(
                    "relative flex h-[28px] min-w-[52px] items-center justify-center rounded-full border text-sm",
                    active
                      ? "border-black bg-black text-white"
                      : "border-[#C7C7C7] bg-white text-[#1F1F1F]",
                  )}
                >
                  {option === "movie" ? "فیلم" : "سریال"}
                </button>
              );
            })}
          </div>
        </section>

        <Divider />

        <section className="flex flex-col gap-3">
          <span className="text-sm font-normal text-[#7A7A7A]">سال ساخت</span>
          <div className="flex items-center justify-between text-sm text-[#1F1F1F]">
            <span>{sortedYearRange[1]}</span>
            <span>{sortedYearRange[0]}</span>
          </div>
          <div
            ref={trackRef}
            onPointerDown={handleTrackPointerDown}
            className="relative h-[1px] rounded-full bg-[#808080]"
          >
            <div
              className="absolute h-[1px] rounded-full bg-[#808080]"
              style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
            />
            <button
              type="button"
              onPointerDown={(event) => {
                event.stopPropagation();
                setDragging("min");
              }}
              className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border border-black bg-black"
              style={{ left: `calc(${minPercent}% - 8px)` }}
            />
            <button
              type="button"
              onPointerDown={(event) => {
                event.stopPropagation();
                setDragging("max");
              }}
              className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border border-black bg-black"
              style={{ left: `calc(${maxPercent}% - 8px)` }}
            />
          </div>
        </section>

        <Divider />

        <section className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setCountryOpen((prev) => !prev)}
            className="flex items-center justify-between text-sm text-[#7A7A7A]"
          >
            <span>کشور</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-[#808080] transition-transform",
                countryOpen ? "rotate-180" : "",
              )}
            />
          </button>
          {countryOpen ? (
            <div className="rounded-2xl border border-[#C7C7C7] bg-white p-3 shadow-sm">
              <button type="button" onClick={() => setCountry("")} className={dropdownItemClass}>
                همه موارد
              </button>
              <div className="mt-2 max-h-[200px] overflow-y-auto pr-1">
                {countries.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setCountry(item);
                      setCountryOpen(false);
                    }}
                    className={cn(
                      dropdownItemClass,
                      "block w-full text-right",
                      country === item ? "bg-black text-white hover:bg-black" : "",
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <Divider />

        <section className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setAgeRangeOpen((prev) => !prev)}
            className="flex items-center justify-between text-sm text-[#7A7A7A]"
          >
            <span>رده سنی</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-[#808080] transition-transform",
                ageRangeOpen ? "rotate-180" : "",
              )}
            />
          </button>
          {ageRangeOpen ? (
            <div className="rounded-2xl border border-[#C7C7C7] bg-white p-3 shadow-sm">
              <button type="button" onClick={() => setAgeRange("")} className={dropdownItemClass}>
                همه موارد
              </button>
              {ageRanges.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setAgeRange(item);
                    setAgeRangeOpen(false);
                  }}
                  className={cn(
                    dropdownItemClass,
                    ageRange === item ? "bg-black text-white hover:bg-black" : "",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <Divider />

        <section className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setGenreOpen((prev) => !prev)}
            className="flex items-center justify-between text-sm text-[#7A7A7A]"
          >
            <span>ژانر</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-[#808080] transition-transform",
                genreOpen ? "rotate-180" : "",
              )}
            />
          </button>
          {genreOpen ? (
            <div className="rounded-2xl border border-[#C7C7C7] bg-white p-3 shadow-sm">
              <button
                type="button"
                onClick={() => setGenreIds([])}
                className={dropdownItemClass}
              >
                همه موارد
              </button>
              <div className="mt-2 flex flex-col gap-2">
                {genres.map((item) => {
                  const checked = genreIds.includes(item.id);
                  return (
                    <label key={item.id} className="flex items-center gap-2 text-sm text-black">
                      <Checkbox
                        checked={checked}
                        onChange={() =>
                          setGenreIds((prev) =>
                            prev.includes(item.id)
                              ? prev.filter((id) => id !== item.id)
                              : [...prev, item.id],
                          )
                        }
                      />
                      <span>{item.nameFa}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>

        <Divider />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            onClick={handleApply}
            className="h-11 rounded-full bg-black text-sm font-bold text-white hover:bg-black/90"
          >
            جستجو بر اساس فیلترها
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            className="h-11 rounded-full border-[#C7C7C7] text-sm text-black bg-color-white"
          >
            حذف فیلترها
          </Button>
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px w-full bg-[#E5E5E5]" />;
}
