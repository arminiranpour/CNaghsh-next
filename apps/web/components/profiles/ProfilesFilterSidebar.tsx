"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACCENT_FILTERS,
  EDUCATION_FILTERS,
  GENDER_FILTERS,
  LANGUAGE_FILTERS,
  type EducationFilterValue,
  type GenderFilterValue,
} from "@/lib/profile/filter-options";
import { SKILLS } from "@/lib/profile/skills";
import type { NormalizedSearchParams } from "@/lib/url/normalizeSearchParams";
import { setSkillsSearchParam } from "@/lib/url/skillsParam";
import { cn } from "@/lib/utils";

type CityOption = { id: string; name: string };

type ProfilesFilterSidebarProps = {
  cities: CityOption[];
  initialFilters: NormalizedSearchParams;
  clearHref?: string;
  className?: string;
};

const AGE_MIN_DEFAULT = 0;
const AGE_MAX_DEFAULT = 99;

// sentinel values so we don't use empty string in <SelectItem />
const CITY_ALL_VALUE = "__all_cities__";
const EDU_ALL_VALUE = "__all_edu__";

export function ProfilesFilterSidebar({
  cities,
  initialFilters,
  clearHref,
  className,
}: ProfilesFilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [gender, setGender] = useState<GenderFilterValue | null>(
    (initialFilters.gender?.[0] as GenderFilterValue | undefined) ?? null,
  );
  const [city, setCity] = useState(initialFilters.city ?? "");
  const [education, setEducation] = useState<EducationFilterValue | null>(
    (initialFilters.edu?.[0] as EducationFilterValue | undefined) ?? null,
  );
  const [skills, setSkills] = useState<string[]>(initialFilters.skills ?? []);
  const [languages, setLanguages] = useState<string[]>(initialFilters.lang ?? []);
  const [accents, setAccents] = useState<string[]>(initialFilters.accent ?? []);
  const [ageRange, setAgeRange] = useState<[number, number]>([
    initialFilters.ageMin ?? AGE_MIN_DEFAULT,
    initialFilters.ageMax ?? AGE_MAX_DEFAULT,
  ]);

  useEffect(() => {
    setGender((initialFilters.gender?.[0] as GenderFilterValue | undefined) ?? null);
    setCity(initialFilters.city ?? "");
    setEducation((initialFilters.edu?.[0] as EducationFilterValue | undefined) ?? null);
    setSkills(initialFilters.skills ?? []);
    setLanguages(initialFilters.lang ?? []);
    setAccents(initialFilters.accent ?? []);
    setAgeRange([
      initialFilters.ageMin ?? AGE_MIN_DEFAULT,
      initialFilters.ageMax ?? AGE_MAX_DEFAULT,
    ]);
  }, [
    initialFilters.accent,
    initialFilters.ageMax,
    initialFilters.ageMin,
    initialFilters.city,
    initialFilters.edu,
    initialFilters.gender,
    initialFilters.lang,
    initialFilters.skills,
  ]);

  const sortedAgeRange = useMemo<[number, number]>(() => {
    const [min, max] = ageRange;
    return [Math.min(min, max), Math.max(min, max)];
  }, [ageRange]);

  // no dynamic pushing of arbitrary strings – just use the predefined options
  const languageOptions = LANGUAGE_FILTERS;
  const accentOptions = ACCENT_FILTERS;

  const updateUrl = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("page");

    if (gender) params.set("gender", gender);
    else params.delete("gender");

    if (city) params.set("city", city);
    else params.delete("city");

    if (education) params.set("edu", education);
    else params.delete("edu");

    if (skills.length) {
      setSkillsSearchParam(params, skills);
    } else {
      params.delete("skills");
    }

    if (languages.length) params.set("lang", languages.join(","));
    else params.delete("lang");

    if (accents.length) params.set("accent", accents.join(","));
    else params.delete("accent");

    const [minAge, maxAge] = sortedAgeRange;
    if (minAge > AGE_MIN_DEFAULT) params.set("ageMin", String(minAge));
    else params.delete("ageMin");

    if (maxAge < AGE_MAX_DEFAULT) params.set("ageMax", String(maxAge));
    else params.delete("ageMax");

    const next = params.toString();
    router.push(next ? `/profiles?${next}` : "/profiles", { scroll: false });
  };

  const clearFilters = () => {
    setGender(null);
    setCity("");
    setEducation(null);
    setSkills([]);
    setLanguages([]);
    setAccents([]);
    setAgeRange([AGE_MIN_DEFAULT, AGE_MAX_DEFAULT]);

    if (clearHref) {
      router.push(clearHref, { scroll: false });
      return;
    }

    const params = new URLSearchParams(searchParams?.toString() ?? "");
    for (const key of ["gender", "city", "edu", "accent", "skills", "lang", "ageMin", "ageMax", "page"]) {
      params.delete(key);
    }
    const next = params.toString();
    router.push(next ? `/profiles?${next}` : "/profiles", { scroll: false });
  };

  const sliderClassName =
    "absolute inset-0 w-full appearance-none bg-transparent pointer-events-auto " +
    "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow " +
    "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-foreground";

  const minPercent =
    ((sortedAgeRange[0] - AGE_MIN_DEFAULT) / (AGE_MAX_DEFAULT - AGE_MIN_DEFAULT)) * 100;
  const maxPercent =
    ((sortedAgeRange[1] - AGE_MIN_DEFAULT) / (AGE_MAX_DEFAULT - AGE_MIN_DEFAULT)) * 100;

  return (
    <aside
      className={cn(
        "rounded-[32px] border border-border bg-white p-6 shadow-lg shadow-black/5",
        className,
      )}
      aria-label="فیلترهای بازیگران"
      dir="rtl"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">فیلترها</h2>
      </div>

      <div className="mt-6 flex flex-col gap-6">
        {/* gender */}
        <div className="flex flex-col gap-3">
          <Label className="text-sm font-medium text-foreground">جنسیت</Label>
          <div className="flex flex-wrap gap-2">
            {GENDER_FILTERS.map((option) => {
              const active = gender === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGender(active ? null : option.value)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition",
                    active
                      ? "border-foreground bg-foreground text-white shadow-sm"
                      : "border-border bg-muted/50 text-foreground hover:border-foreground/40",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* age slider */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>حداقل سن</span>
            <span>حداکثر سن</span>
          </div>
          <div className="relative h-9">
            <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
            <div
              className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-foreground/70"
              style={{ right: `${100 - maxPercent}%`, left: `${minPercent}%` }}
              aria-hidden
            />
            <input
              type="range"
              min={AGE_MIN_DEFAULT}
              max={AGE_MAX_DEFAULT}
              value={sortedAgeRange[0]}
              onChange={(event) =>
                setAgeRange([Number(event.target.value), sortedAgeRange[1]])
              }
              className={sliderClassName}
            />
            <input
              type="range"
              min={AGE_MIN_DEFAULT}
              max={AGE_MAX_DEFAULT}
              value={sortedAgeRange[1]}
              onChange={(event) =>
                setAgeRange([sortedAgeRange[0], Number(event.target.value)])
              }
              className={sliderClassName}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{AGE_MIN_DEFAULT}</span>
            <div className="flex items-center gap-2 text-foreground">
              <span className="text-sm font-semibold">{sortedAgeRange[0]}</span>
              <span className="text-xs text-muted-foreground">تا</span>
              <span className="text-sm font-semibold">{sortedAgeRange[1]}</span>
            </div>
            <span>{AGE_MAX_DEFAULT}</span>
          </div>
        </div>

        {/* city */}
        <div className="flex flex-col gap-3">
          <Label htmlFor="profiles-city">شهرستان / شهر</Label>
          <Select
            value={city || CITY_ALL_VALUE}
            onValueChange={(value) => {
              if (value === CITY_ALL_VALUE) setCity("");
              else setCity(value);
            }}
          >
            <SelectTrigger id="profiles-city" className="rounded-2xl border-muted bg-muted/40">
              <SelectValue placeholder="انتخاب شهر" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CITY_ALL_VALUE}>همه شهرها</SelectItem>
              {cities.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* education */}
        <div className="flex flex-col gap-3">
          <Label htmlFor="profiles-edu">مدرک تحصیلی</Label>
          <Select
            value={education ?? EDU_ALL_VALUE}
            onValueChange={(value) => {
              if (value === EDU_ALL_VALUE) {
                setEducation(null);
              } else {
                setEducation(value as EducationFilterValue);
              }
            }}
          >
            <SelectTrigger id="profiles-edu" className="rounded-2xl border-muted bg-muted/40">
              <SelectValue placeholder="همه موارد" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EDU_ALL_VALUE}>همه موارد</SelectItem>
              {EDUCATION_FILTERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Divider />

        {/* skills / language / accent */}
        <MultiSelectSection
          label="مهارت‌ها"
          items={SKILLS.map((skill) => ({ value: skill.key, label: skill.label }))}
          values={skills}
          onChange={(next) => setSkills(next)}
        />

        <MultiSelectSection
          label="زبان"
          items={languageOptions}
          values={languages}
          onChange={(next) => setLanguages(next)}
        />

        <MultiSelectSection
          label="لهجه"
          items={accentOptions}
          values={accents}
          onChange={(next) => setAccents(next)}
        />

        <Divider />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            className="flex-1 rounded-full border-border"
            type="button"
            onClick={clearFilters}
          >
            حذف فیلترها
          </Button>
          <Button
            className="flex-1 rounded-full bg-foreground text-background hover:bg-foreground/90"
            type="button"
            onClick={updateUrl}
          >
            جستجو بر اساس فیلترها
          </Button>
        </div>
      </div>
    </aside>
  );
}

type MultiSelectSectionProps = {
  label: string;
  items: { value: string; label: string }[];
  values: string[];
  onChange: (values: string[]) => void;
};

function MultiSelectSection({ label, items, values, onChange }: MultiSelectSectionProps) {
  const toggle = (value: string) => {
    onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  const selectedLabels = items
    .filter((item) => values.includes(item.value))
    .map((item) => item.label);

  return (
    <div className="flex flex-col gap-3">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="flex w-full items-center justify-between rounded-2xl border-muted bg-muted/40 text-right"
          >
            <span className="truncate text-sm">
              {selectedLabels.length ? selectedLabels.join("، ") : `انتخاب ${label}`}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-72 max-h-72 overflow-y-auto"
          align="end"
        >
          {items.map((item) => (
            <DropdownMenuCheckboxItem
              key={item.value}
              checked={values.includes(item.value)}
              onCheckedChange={() => toggle(item.value)}
            >
              {item.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {selectedLabels.length ? (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {selectedLabels.map((entry) => (
            <span key={entry} className="rounded-full bg-muted px-3 py-1">
              {entry}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Divider() {
  return <div className="h-px w-full bg-muted" aria-hidden />;
}
