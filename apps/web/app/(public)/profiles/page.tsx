import type { Metadata } from "next";

import { ListAnalyticsTracker } from "@/components/analytics/ListAnalyticsTracker";
import { JsonLd } from "@/components/seo/JsonLd";
import { badgeVariants } from "@/components/ui/badge";
import {
  ACCENT_LABEL_MAP,
  EDUCATION_LABEL_MAP,
  GENDER_LABEL_MAP,
  LANGUAGE_LABEL_MAP,
} from "@/lib/profile/filter-options";
import { getCities } from "@/lib/location/cities";
import { fetchProfilesOrchestrated } from "@/lib/orchestrators/profiles";
import { SKILLS, isSkillKey } from "@/lib/profile/skills";
import { buildCanonical } from "@/lib/seo/canonical";
import { SITE_LOCALE, SITE_NAME } from "@/lib/seo/constants";
import { getBaseUrl } from "@/lib/seo/baseUrl";
import { websiteJsonLd } from "@/lib/seo/jsonld";
import {
  normalizeSearchParams,
  type NormalizedSearchParams,
} from "@/lib/url/normalizeSearchParams";
import { parseSkillsSearchParam } from "@/lib/url/skillsParam";
import { cn } from "@/lib/utils";
import { ProfilesFilterSidebar } from "@/components/profiles/ProfilesFilterSidebar";
import { ProfilesGrid } from "@/components/profiles/ProfilesGrid";
import { ProfilesSearchBar } from "@/components/profiles/ProfilesSearchBar";
import Header from "@/components/Header";
import { buildProfilesHref } from "@/lib/url/buildProfilesHref";

export const revalidate = 60;

const PAGE_TITLE = "بازیگران سی‌نقش | جستجو و فیلتر هنرمندان";
const PAGE_DESCRIPTION =
  "جستجو و فیلتر پروفایل‌های تایید‌شده هنرمندان براساس نام، سن، شهر، مهارت‌ها، زبان و لهجه.";
const DEFAULT_PAGE_SIZE = 12;

const SKILL_LABELS = new Map(SKILLS.map((skill) => [skill.key, skill.label] as const));

const SORT_OPTIONS = [
  { value: "relevance", label: "مرتبط‌ترین" },
  { value: "newest", label: "جدیدترین" },
  { value: "alpha", label: "مرتب‌سازی الفبا" },
] as const;

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const canonical = buildCanonical("/profiles", searchParams);

  return {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    alternates: {
      canonical,
    },
    openGraph: {
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      url: canonical,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
    },
    twitter: {
      card: "summary_large_image",
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
    },
  };
}

export default async function ProfilesPage({ searchParams }: { searchParams: SearchParams }) {
  const normalized = normalizeSearchParams(searchParams);
  const parsedSkills = parseSkillsSearchParam(searchParams);
  const normalizedSkills = parsedSkills.length ? parsedSkills : normalized.skills;

  const [data, cities] = await Promise.all([
    fetchProfilesOrchestrated(searchParams),
    getCities(),
  ]);

  const cityMap = new Map(cities.map((city) => [city.id, city.name] as const));
  const currentPage = data.page ?? normalized.page ?? 1;
  const pageSize = data.pageSize ?? DEFAULT_PAGE_SIZE;
  const hasNextPage = data.items.length === pageSize;
  const hasPrevPage = currentPage > 1;

  const initialFilters: NormalizedSearchParams = {
    ...normalized,
    skills: normalizedSkills,
    gender: normalized.gender ?? [],
    edu: normalized.edu ?? [],
    lang: normalized.lang ?? [],
    accent: normalized.accent ?? [],
  };

  const normalizedForLinks: NormalizedSearchParams = {
    ...initialFilters,
    page: currentPage,
  };

  const appliedFilters = data.appliedFilters.map((chip) => {
    const formattedValue = formatFilterValue(chip.key, chip.value, {
      cityMap,
    });

    const href = buildProfilesHref(normalizedForLinks, () => {
      switch (chip.key) {
        case "skills":
          return { skills: undefined, page: undefined };
        case "gender":
          return { gender: undefined, page: undefined };
        case "age":
          return { ageMin: undefined, ageMax: undefined, page: undefined };
        case "edu":
          return { edu: undefined, page: undefined };
        case "lang":
          return { lang: undefined, page: undefined };
        case "accent":
          return { accent: undefined, page: undefined };
        default:
          return { [chip.key]: undefined, page: undefined } as Partial<NormalizedSearchParams>;
      }
    });

    return { ...chip, label: formattedValue, href };
  });

  const clearFiltersHref = buildProfilesHref(normalizedForLinks, () => ({
    city: undefined,
    gender: undefined,
    ageMin: undefined,
    ageMax: undefined,
    edu: undefined,
    skills: undefined,
    lang: undefined,
    accent: undefined,
    page: undefined,
  }));

  const baseUrl = getBaseUrl();
  const jsonLd = websiteJsonLd({
    url: baseUrl,
    searchUrlProfiles: `${baseUrl}/profiles`,
    searchUrlJobs: `${baseUrl}/jobs`,
  });

  return (
    <div className="relative w-full" dir="rtl">
      {/* 🔥 Full-width background */}
      <div
        className="
          absolute inset-0
          bg-[url('/profiles/concretewall-bg.png')]
          bg-cover bg-center bg-no-repeat
        "
      />

      {/* Centered content container – unchanged */}
      <div className="relative mx-auto w-full max-w-6xl px-4 py-10">
        <ListAnalyticsTracker
          scope="profiles"
          query={normalized.query ?? undefined}
          city={normalized.city ?? undefined}
          sort={normalized.sort ?? undefined}
          page={currentPage}
        />

        <JsonLd data={jsonLd} />
      
<div className="flex items-center justify-between mb-6" dir="rtl">
  <header className="flex flex-col">
    <h1 className="text-3xl font-semibold text-orange-500">بازیگران سی‌نقش</h1>
  </header>

  <ProfilesSearchBar initialQuery={normalized.query ?? ""} className="w-[790px]" />
</div>


        {appliedFilters.length ? (
          <section
            aria-label="فیلترهای اعمال شده"
            className="mb-6 flex flex-wrap gap-2"
          >
            {appliedFilters.map((chip) => (
              <a
                key={chip.key}
                href={chip.href}
                className={cn(
                  badgeVariants({ variant: "outline" }),
                  "group inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs hover:bg-muted"
                )}
                aria-label={`حذف فیلتر ${chip.label}`}
              >
                <span>{chip.label}</span>
                <span aria-hidden className="text-muted-foreground">×</span>
              </a>
            ))}
          </section>
        ) : null}

        <main className="flex flex-col gap-6 xl:flex-row xl:items-start">
          <ProfilesFilterSidebar
            cities={cities}
            initialFilters={normalizedForLinks}
            clearHref={clearFiltersHref}
            className="w-full xl:w-[371px] shrink-0"
          />

          <ProfilesGrid
            profiles={data.items}
            cityMap={cityMap}
            normalized={normalizedForLinks}
            currentPage={currentPage}
            hasNextPage={hasNextPage}
            hasPrevPage={hasPrevPage}
            clearHref={clearFiltersHref}
            className="flex-1"
          />
        </main>
      </div>
    </div>
  );
}

type FilterFormatterContext = {
  cityMap: Map<string, string>;
};

function formatFilterValue(key: string, value: string, context: FilterFormatterContext) {
  switch (key) {
    case "query":
      return `جستجو: ${value}`;
    case "city":
      return `شهر: ${context.cityMap.get(value) ?? value}`;
    case "skills": {
      const labels = formatListWithMap(value, SKILL_LABELS, isSkillKey);
      return `مهارت‌ها: ${labels}`;
    }
    case "gender": {
      const labels = formatListWithMap(value, GENDER_LABEL_MAP);
      return `جنسیت: ${labels}`;
    }
    case "age":
      return formatAgeLabel(value);
    case "edu": {
      const labels = formatListWithMap(value, EDUCATION_LABEL_MAP);
      return `مدرک تحصیلی: ${labels}`;
    }
    case "lang": {
      const labels = formatListWithMap(value, LANGUAGE_LABEL_MAP);
      return `زبان: ${labels}`;
    }
    case "accent": {
      const labels = formatListWithMap(value, ACCENT_LABEL_MAP);
      return `لهجه: ${labels}`;
    }
    case "sort": {
      const label = SORT_OPTIONS.find((option) => option.value === value)?.label ?? value;
      return `مرتب‌سازی: ${label}`;
    }
    default:
      return value;
  }
}

function formatListWithMap(
  value: string,
  labelMap: Map<string, string>,
  validator?: (input: string) => boolean,
) {
  const labels: string[] = [];
  const seen = new Set<string>();

  for (const part of value.split(",")) {
    const trimmed = part.trim();
    if (!trimmed || seen.has(trimmed)) continue;

    if (validator && !validator(trimmed)) {
      labels.push(trimmed);
      seen.add(trimmed);
      continue;
    }
    labels.push(labelMap.get(trimmed) ?? trimmed);
    seen.add(trimmed);
  }

  return labels.join("، ");
}

function formatAgeLabel(value: string) {
  const [minRaw, maxRaw] = value.split("-");
  const min = minRaw && minRaw !== "?" ? minRaw.trim() : "";
  const max = maxRaw && maxRaw !== "?" ? maxRaw.trim() : "";

  if (min && max) return `سن: از ${min} تا ${max} سال`;
  if (min) return `سن: از ${min} سال`;
  if (max) return `سن: تا ${max} سال`;
  return "سن";
}
