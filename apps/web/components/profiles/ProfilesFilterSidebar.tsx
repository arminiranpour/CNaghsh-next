"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ACCENT_FILTERS,
  EDUCATION_FILTERS,
  GENDER_FILTERS,
  LANGUAGE_FILTERS,
  type EducationFilterValue,
  type GenderFilterValue,
} from "@/lib/profile/filter-options";
import type { NormalizedSearchParams } from "@/lib/url/normalizeSearchParams";
import { cn } from "@/lib/utils";

type ProfilesFilterSidebarProps = {
  cities?: CityOption[];
  initialFilters?: NormalizedSearchParams;
  clearHref?: string;
  className?: string;
};

type CityOption = { id: string; name: string; type?: string };

const AGE_MIN_DEFAULT = 0;
const AGE_MAX_DEFAULT = 99;
const DEFAULT_MIN_SELECTED = 12;
const DEFAULT_MAX_SELECTED = 40;

export function ProfilesFilterSidebar({ className, cities: citiesProp }: ProfilesFilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [gender, setGender] = useState<GenderFilterValue | null>(null);
  const [ageRange, setAgeRange] = useState<[number, number]>([
    DEFAULT_MIN_SELECTED,
    DEFAULT_MAX_SELECTED,
  ]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [citySearch, setCitySearch] = useState("");
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [city, setCity] = useState("");

  const [education, setEducation] = useState<EducationFilterValue | "">("");
  const [educationOpen, setEducationOpen] = useState(false);

  const [language, setLanguage] = useState<string>("");
  const [languageOpen, setLanguageOpen] = useState(false);

  const [accent, setAccent] = useState<string>("");
  const [accentOpen, setAccentOpen] = useState(false);

  useEffect(() => {
    if (citiesProp?.length) {
      setCities(citiesProp);
      return;
    }

    const controller = new AbortController();

    const loadCities = async () => {
      try {
        const response = await fetch("/cities/all.json", { signal: controller.signal });
        if (!response.ok) throw new Error("failed to load cities");
        const data = (await response.json()) as CityOption[];
        const cityItems = data
          .filter((item) => item.type === "city")
          .map((item) => ({ id: String(item.id), name: item.name }));
        setCities(cityItems);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Failed to fetch cities", error);
        }
      }
    };

    loadCities();
    return () => controller.abort();
  }, [citiesProp]);

  useEffect(() => {
    const genderParam = searchParams?.get("gender") as GenderFilterValue | null;
    setGender(genderParam ?? null);

    const minParam = Number(searchParams?.get("ageMin") ?? NaN);
    const maxParam = Number(searchParams?.get("ageMax") ?? NaN);
    const nextMin = Number.isFinite(minParam) ? minParam : DEFAULT_MIN_SELECTED;
    const nextMax = Number.isFinite(maxParam) ? maxParam : DEFAULT_MAX_SELECTED;
    setAgeRange([nextMin, nextMax]);

    setCity(searchParams?.get("city") ?? "");

    const eduParam = searchParams?.get("edu");
    setEducation((eduParam as EducationFilterValue) ?? "");

    const langParam = searchParams?.get("lang");
    setLanguage(langParam ?? "");

    const accentParam = searchParams?.get("accent");
    setAccent(accentParam ?? "");
  }, [searchParams]);

  const sortedAgeRange = useMemo<[number, number]>(() => {
    const [min, max] = ageRange;
    return [Math.min(min, max), Math.max(min, max)];
  }, [ageRange]);

  const minPercent =
    ((sortedAgeRange[0] - AGE_MIN_DEFAULT) / (AGE_MAX_DEFAULT - AGE_MIN_DEFAULT)) * 100;
  const maxPercent =
    ((sortedAgeRange[1] - AGE_MIN_DEFAULT) / (AGE_MAX_DEFAULT - AGE_MIN_DEFAULT)) * 100;

  const filteredCities = useMemo(() => {
    const term = citySearch.trim();
    if (!term) return cities.slice(0, 200);
    return cities.filter((item) => item.name.includes(term)).slice(0, 200);
  }, [cities, citySearch]);

  const handleApply = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("page");

    if (gender) params.set("gender", gender);
    else params.delete("gender");

    if (city) params.set("city", city);
    else params.delete("city");

    if (education) params.set("edu", education);
    else params.delete("edu");

    if (language) params.set("lang", language);
    else params.delete("lang");

    if (accent) params.set("accent", accent);
    else params.delete("accent");

    if (sortedAgeRange[0] > AGE_MIN_DEFAULT) {
      params.set("ageMin", String(sortedAgeRange[0]));
    } else {
      params.delete("ageMin");
    }

    if (sortedAgeRange[1] < AGE_MAX_DEFAULT) {
      params.set("ageMax", String(sortedAgeRange[1]));
    } else {
      params.delete("ageMax");
    }

    const next = params.toString();
    router.push(next ? `/profiles?${next}` : "/profiles", { scroll: false });
  };

  const handleClear = () => {
    setGender(null);
    setAgeRange([DEFAULT_MIN_SELECTED, DEFAULT_MAX_SELECTED]);
    setCity("");
    setEducation("");
    setLanguage("");
    setAccent("");
    setCitySearch("");

    const params = new URLSearchParams(searchParams?.toString() ?? "");
    for (const key of ["gender", "city", "edu", "lang", "accent", "ageMin", "ageMax", "page"]) {
      params.delete(key);
    }
    const next = params.toString();
    router.push(next ? `/profiles?${next}` : "/profiles", { scroll: false });
  };

  const dropdownItemClass =
    "w-full cursor-pointer rounded-xl px-3 py-2 text-right text-sm text-[#1F1F1F] hover:bg-[#F2F2F2]";

  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState<"min" | "max" | null>(null);

  const clampAge = (value: number) =>
    Math.min(Math.max(value, AGE_MIN_DEFAULT), AGE_MAX_DEFAULT);

  const valueFromClientX = (clientX: number) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    const clampedRatio = Math.min(Math.max(ratio, 0), 1);
    return Math.round(AGE_MIN_DEFAULT + clampedRatio * (AGE_MAX_DEFAULT - AGE_MIN_DEFAULT));
  };

  const updateThumb = (target: "min" | "max", rawValue: number) => {
    const nextValue = clampAge(rawValue);
    if (target === "min") {
      setAgeRange([Math.min(nextValue, sortedAgeRange[1]), sortedAgeRange[1]]);
    } else {
      setAgeRange([sortedAgeRange[0], Math.max(nextValue, sortedAgeRange[0])]);
    }
  };

  const handleTrackPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const clickValue = valueFromClientX(event.clientX);
    const distanceToMin = Math.abs(clickValue - sortedAgeRange[0]);
    const distanceToMax = Math.abs(clickValue - sortedAgeRange[1]);
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
  }, [dragging, sortedAgeRange]);

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
        {/* جنسیت */}
        <section className="flex flex-col gap-3">
          <span className="text-sm font-normal text-[#7A7A7A]">جنسیت</span>
          <div className="flex items-center gap-3">
            {GENDER_FILTERS.map((option) => {
              const active = gender === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGender(active ? null : option.value)}
                  className={cn(
                    "relative flex h-[28px] min-w-[52px] items-center justify-center rounded-full border text-sm",
                    active
                      ? "border-black bg-black text-white"
                      : "border-[#7A7A7A] text-[#7A7A7A]",
                  )}
                >
                  {option.label === "سایر" ? "دیگر" : option.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* سن */}
        <section className="flex flex-col gap-3">
          <span className="text-sm font-normal text-[#7A7A7A]">سن</span>

          <div className="flex items-center justify-between text-[10px] text-[#C7C7C7]">
          <span className="rounded-full border border-[#C7C7C7] px-3 py-1">
              حداکثر: {sortedAgeRange[1]}
            </span>
            <span className="rounded-full border border-[#C7C7C7] px-3 py-1">
              حداقل: {sortedAgeRange[0]}
            </span>

          </div>

          <div
            ref={trackRef}
            className="relative h-8 cursor-pointer touch-none select-none"
            onPointerDown={handleTrackPointerDown}
          >
            <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-[#808080]" />
            <div
              className="absolute top-1/2 h-px -translate-y-1/2 bg-black"
              style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
              aria-hidden
            />

            <button
              type="button"
              className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-black"
              style={{ left: `${minPercent}%`, top: "50%" }}
              onPointerDown={(event) => {
                event.stopPropagation();
                setDragging("min");
                (event.target as HTMLElement)?.setPointerCapture?.(event.pointerId);
              }}
            />

            <button
              type="button"
              className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-black"
              style={{ left: `${maxPercent}%`, top: "50%" }}
              onPointerDown={(event) => {
                event.stopPropagation();
                setDragging("max");
                (event.target as HTMLElement)?.setPointerCapture?.(event.pointerId);
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[12px] text-[#808080]">
            <span>99</span>
            <span>0</span>

          </div>
        </section>

        <Divider />

        {/* شهر */}
        <section className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setCityDropdownOpen((prev) => !prev)}
            className="flex items-center justify-between text-sm text-[#7A7A7A]"
          >
            <span>شهرستان / شهر</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-[#808080] transition-transform",
                cityDropdownOpen ? "rotate-180" : "",
              )}
            />
          </button>
          {cityDropdownOpen ? (
            <div className="rounded-2xl border border-[#C7C7C7] bg-white p-3 shadow-sm">
              <Input
                placeholder="جستجو شهر"
                value={citySearch}
                onChange={(event) => setCitySearch(event.target.value)}
                className="mb-2 h-9 rounded-xl border-[#C7C7C7] bg-[#F7F7F7] px-3 text-sm"
              />
              <div className="max-h-52 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => setCity("")}
                  className={dropdownItemClass}
                >
                  همه شهرها
                </button>
                {filteredCities.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      setCity(item.id);
                      setCityDropdownOpen(false);
                    }}
                    className={cn(
                      dropdownItemClass,
                      city === item.id ? "bg-black text-white hover:bg-black" : "",
                    )}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <Divider />

        {/* مدرک تحصیلی */}
        <section className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setEducationOpen((prev) => !prev)}
            className="flex items-center justify-between text-sm text-[#7A7A7A]"
          >
            <span>مدرک تحصیلی</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-[#808080] transition-transform",
                educationOpen ? "rotate-180" : "",
              )}
            />
          </button>
          {educationOpen ? (
            <div className="rounded-2xl border border-[#C7C7C7] bg-white p-3 shadow-sm">
              <button type="button" onClick={() => setEducation("")} className={dropdownItemClass}>
                همه موارد
              </button>
              {EDUCATION_FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setEducation(item.value);
                    setEducationOpen(false);
                  }}
                  className={cn(
                    dropdownItemClass,
                    education === item.value ? "bg-black text-white hover:bg-black" : "",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <Divider />

        {/* زبان */}
        <section className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setLanguageOpen((prev) => !prev)}
            className="flex items-center justify-between text-sm text-[#7A7A7A]"
          >
            <span>زبان</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-[#808080] transition-transform",
                languageOpen ? "rotate-180" : "",
              )}
            />
          </button>
          {languageOpen ? (
            <div className="rounded-2xl border border-[#C7C7C7] bg-white p-3 shadow-sm">
              <button type="button" onClick={() => setLanguage("")} className={dropdownItemClass}>
                همه موارد
              </button>
              {LANGUAGE_FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setLanguage(item.value);
                    setLanguageOpen(false);
                  }}
                  className={cn(
                    dropdownItemClass,
                    language === item.value ? "bg-black text-white hover:bg-black" : "",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <Divider />

        {/* لهجه */}
        <section className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setAccentOpen((prev) => !prev)}
            className="flex items-center justify-between text-sm text-[#7A7A7A]"
          >
            <span>لهجه</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-[#808080] transition-transform",
                accentOpen ? "rotate-180" : "",
              )}
            />
          </button>
          {accentOpen ? (
            <div className="rounded-2xl border border-[#C7C7C7] bg-white p-3 shadow-sm">
              <button type="button" onClick={() => setAccent("")} className={dropdownItemClass}>
                همه موارد
              </button>
              {ACCENT_FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setAccent(item.value);
                    setAccentOpen(false);
                  }}
                  className={cn(
                    dropdownItemClass,
                    accent === item.value ? "bg-black text-white hover:bg-black" : "",
                  )}
                >
                  {item.label}
                </button>
              ))}
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
            className="h-11 bg-white rounded-full border border-black text-sm font-bold text-black hover:bg-white"
          >
            حذف فیلترها
          </Button>

        </div>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px w-full bg-[#C7C7C7]" aria-hidden />;
}
