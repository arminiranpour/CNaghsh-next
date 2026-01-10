"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

type SortOption = { value: string; label: string };

type CityOption = { id: string; name: string };

type ProfilesFiltersProps = {
  cities: CityOption[];
  initialFilters: NormalizedSearchParams;
  sortOptions: ReadonlyArray<SortOption>;
};

type FilterSnapshot = {
  query?: string;
  city?: string;
  sort?: string;
  gender?: GenderFilterValue;
  education?: EducationFilterValue;
  accent?: string;
  skills: string[];
  languages: string[];
  ageMin?: number;
  ageMax?: number;
};

function parseAgeInput(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 120) return undefined;
  return parsed;
}

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function setParam(params: URLSearchParams, key: string, value: string | undefined) {
  if (!value) {
    params.delete(key);
    return;
  }
  params.set(key, value);
}

function setNumberParam(params: URLSearchParams, key: string, value: number | undefined) {
  if (value === undefined) {
    params.delete(key);
    return;
  }
  params.set(key, value.toString(10));
}

function setCsvParam(params: URLSearchParams, key: string, values: string[] | undefined) {
  params.delete(key);
  if (values && values.length) {
    params.set(key, values.join(","));
  }
}

const NONE_VALUE = "__none__";
const EDUCATION_VALUES = new Set<EducationFilterValue>(EDUCATION_FILTERS.map((item) => item.value));

function normalizeEducationValue(value?: string): EducationFilterValue | typeof NONE_VALUE {
  if (!value) return NONE_VALUE;
  return EDUCATION_VALUES.has(value as EducationFilterValue) ? (value as EducationFilterValue) : NONE_VALUE;
}

export function ProfilesFilters({ cities, initialFilters, sortOptions }: ProfilesFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState(initialFilters.query ?? "");
  const [selectedCity, setSelectedCity] = useState(initialFilters.city ?? NONE_VALUE);
  const [selectedGender, setSelectedGender] = useState<GenderFilterValue | typeof NONE_VALUE>(
    initialFilters.gender?.[0] ?? NONE_VALUE,
  );
  const [selectedEducation, setSelectedEducation] = useState<EducationFilterValue | typeof NONE_VALUE>(
    normalizeEducationValue(initialFilters.edu?.[0]),
  );
  const [selectedAccent, setSelectedAccent] = useState(initialFilters.accent?.[0] ?? NONE_VALUE);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(initialFilters.skills ?? []);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(initialFilters.lang ?? []);
  const [sortValue, setSortValue] = useState(initialFilters.sort ?? NONE_VALUE);
  const [ageMin, setAgeMin] = useState(initialFilters.ageMin ? String(initialFilters.ageMin) : "");
  const [ageMax, setAgeMax] = useState(initialFilters.ageMax ? String(initialFilters.ageMax) : "");

  useEffect(() => {
    setSearchValue(initialFilters.query ?? "");
    setSelectedCity(initialFilters.city ?? NONE_VALUE);
    setSelectedGender(initialFilters.gender?.[0] ?? NONE_VALUE);
    setSelectedEducation(normalizeEducationValue(initialFilters.edu?.[0]));
    setSelectedAccent(initialFilters.accent?.[0] ?? NONE_VALUE);
    setSelectedSkills(initialFilters.skills ?? []);
    setSelectedLanguages(initialFilters.lang ?? []);
    setSortValue(initialFilters.sort ?? NONE_VALUE);
    setAgeMin(initialFilters.ageMin ? String(initialFilters.ageMin) : "");
    setAgeMax(initialFilters.ageMax ? String(initialFilters.ageMax) : "");
  }, [
    initialFilters.query,
    initialFilters.city,
    initialFilters.gender,
    initialFilters.edu,
    initialFilters.accent,
    initialFilters.skills,
    initialFilters.lang,
    initialFilters.sort,
    initialFilters.ageMin,
    initialFilters.ageMax,
  ]);

  const currentState: FilterSnapshot = useMemo(
    () => ({
      query: searchValue.trim() || undefined,
      city: selectedCity === NONE_VALUE ? undefined : selectedCity,
      sort: sortValue === NONE_VALUE ? undefined : sortValue,
      gender: selectedGender === NONE_VALUE ? undefined : (selectedGender as GenderFilterValue),
      education:
        selectedEducation === NONE_VALUE ? undefined : (selectedEducation as EducationFilterValue),
      accent: selectedAccent === NONE_VALUE ? undefined : selectedAccent,
      skills: selectedSkills,
      languages: selectedLanguages,
      ageMin: parseAgeInput(ageMin),
      ageMax: parseAgeInput(ageMax),
    }),
    [
      searchValue,
      selectedCity,
      sortValue,
      selectedGender,
      selectedEducation,
      selectedAccent,
      selectedSkills,
      selectedLanguages,
      ageMin,
      ageMax,
    ],
  );

  const languageOptions = useMemo(() => {
    const base: { value: string; label: string }[] = [...LANGUAGE_FILTERS];
    for (const value of selectedLanguages) {
      if (!base.some((item) => item.value === value)) {
        base.push({ value, label: value });
      }
    }
    return base;
  }, [selectedLanguages]);

  const accentOptions = useMemo(() => {
    const base = [...ACCENT_FILTERS];
    if (selectedAccent && !base.some((item) => item.value === selectedAccent)) {
      base.unshift({ value: selectedAccent, label: selectedAccent });
    }
    return base;
  }, [selectedAccent]);

  const applyFilters = useCallback(
    (overrides?: Partial<FilterSnapshot>) => {
      const snapshot = { ...currentState, ...overrides };
      let minAge = snapshot.ageMin;
      let maxAge = snapshot.ageMax;

      if (minAge && maxAge && minAge > maxAge) {
        [minAge, maxAge] = [maxAge, minAge];
      }

      const params = new URLSearchParams(searchParams.toString());
      setParam(params, "query", snapshot.query);
      setParam(params, "city", snapshot.city);
      setParam(params, "sort", snapshot.sort);
      setCsvParam(params, "gender", snapshot.gender ? [snapshot.gender] : []);
      setCsvParam(params, "edu", snapshot.education ? [snapshot.education] : []);
      setCsvParam(params, "accent", snapshot.accent ? [snapshot.accent] : []);
      setCsvParam(params, "skills", snapshot.skills);
      setCsvParam(params, "lang", snapshot.languages);
      setNumberParam(params, "ageMin", minAge);
      setNumberParam(params, "ageMax", maxAge);

      params.delete("page");

      const next = params.toString();
      router.replace(next ? `/profiles?${next}` : "/profiles", { scroll: false });
    },
    [currentState, router, searchParams],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyFilters();
  };

  const clearFilters = () => {
    setSelectedGender(NONE_VALUE);
    setSelectedEducation(NONE_VALUE);
    setSelectedAccent(NONE_VALUE);
    setSelectedCity(NONE_VALUE);
    setSelectedSkills([]);
    setSelectedLanguages([]);
    setAgeMin("");
    setAgeMax("");
    applyFilters({
      gender: undefined,
      education: undefined,
      accent: undefined,
      city: undefined,
      skills: [],
      languages: [],
      ageMin: undefined,
      ageMax: undefined,
    });
  };

  return (
    <div className="text-[#7A7A7A]">
    <form className="grid grid-cols-1 gap-6 lg:grid-cols-2" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2 lg:col-span-2">
        <Label htmlFor="profiles-query">جستجو</Label>
        <Input
          id="profiles-query"
          name="query"
          type="search"
          placeholder="نام هنرمند یا مهارت"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          onBlur={() => applyFilters()}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="profiles-sort">مرتب‌سازی</Label>
        <Select
          value={sortValue}
          onValueChange={(value) => {
            setSortValue(value);
            applyFilters({ sort: value === NONE_VALUE ? undefined : value });
          }}
        >
          <SelectTrigger id="profiles-sort">
            <SelectValue placeholder="پیش‌فرض (مرتبط‌ترین)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>پیش‌فرض (مرتبط‌ترین)</SelectItem>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="profiles-gender">جنسیت</Label>
        <Select
          value={selectedGender}
          onValueChange={(value: GenderFilterValue | typeof NONE_VALUE) => {
            setSelectedGender(value);
            applyFilters({ gender: value === NONE_VALUE ? undefined : value });
          }}
        >
          <SelectTrigger id="profiles-gender">
            <SelectValue placeholder="بدون فیلتر" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>بدون فیلتر</SelectItem>
            {GENDER_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="profiles-age-min">حداقل سن</Label>
          <Input
            id="profiles-age-min"
          inputMode="numeric"
          pattern="[0-9]*"
          type="number"
          value={ageMin}
          onChange={(event) => setAgeMin(event.target.value)}
            onBlur={() => applyFilters()}
            placeholder="مثلاً ۱۸"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="profiles-age-max">حداکثر سن</Label>
          <Input
            id="profiles-age-max"
          inputMode="numeric"
          pattern="[0-9]*"
          type="number"
          value={ageMax}
          onChange={(event) => setAgeMax(event.target.value)}
            onBlur={() => applyFilters()}
            placeholder="مثلاً ۳۵"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="profiles-city">شهر</Label>
        <Select
          value={selectedCity}
          onValueChange={(value) => {
            setSelectedCity(value);
            applyFilters({ city: value === NONE_VALUE ? undefined : value });
          }}
        >
          <SelectTrigger id="profiles-city">
            <SelectValue placeholder="همه شهرها" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>همه شهرها</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city.id} value={city.id}>
                {city.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="profiles-education">مدرک تحصیلی</Label>
        <Select
          value={selectedEducation}
          onValueChange={(value: EducationFilterValue | typeof NONE_VALUE) => {
            setSelectedEducation(value);
            applyFilters({ education: value === NONE_VALUE ? undefined : value });
          }}
        >
          <SelectTrigger id="profiles-education">
            <SelectValue placeholder="همه موارد" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>همه موارد</SelectItem>
            {EDUCATION_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2 lg:col-span-2">
        <Label>مهارت‌ها</Label>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {SKILLS.map((skill) => {
            const checked = selectedSkills.includes(skill.key);
            return (
              <label
                key={skill.key}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition",
                  checked ? "bg-muted" : "bg-background",
                )}
              >
                <Checkbox
                  checked={checked}
                  onChange={() => {
                    const nextSkills = toggleValue(selectedSkills, skill.key);
                    setSelectedSkills(nextSkills);
                    applyFilters({ skills: nextSkills });
                  }}
                />
                <span>{skill.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2 lg:col-span-2">
        <Label>زبان</Label>
        <div className="flex flex-wrap gap-2">
          {languageOptions.map((option) => {
            const checked = selectedLanguages.includes(option.value);
            return (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1 text-sm transition",
                  checked ? "bg-muted" : "bg-background",
                )}
              >
                <Checkbox
                  checked={checked}
                  onChange={() => {
                    const nextLanguages = toggleValue(selectedLanguages, option.value);
                    setSelectedLanguages(nextLanguages);
                    applyFilters({ languages: nextLanguages });
                  }}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="profiles-accent">لهجه</Label>
        <Select
          value={selectedAccent}
          onValueChange={(value) => {
            setSelectedAccent(value);
            applyFilters({ accent: value === NONE_VALUE ? undefined : value });
          }}
        >
          <SelectTrigger id="profiles-accent">
            <SelectValue placeholder="همه لهجه‌ها" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>همه لهجه‌ها</SelectItem>
            {accentOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
        <Button type="submit" className="flex-1 sm:flex-none">
          اعمال فیلترها
        </Button>
        <Button type="button" variant="ghost" onClick={clearFilters}>
          حذف فیلترها
        </Button>
      </div>
    </form>
    </div>
  );
}
