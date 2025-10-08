import Link from "next/link";
import type { Metadata } from "next";

import { Badge, badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCities } from "@/lib/location/cities";
import { fetchProfilesOrchestrated } from "@/lib/orchestrators/profiles";
import { SKILLS, isSkillKey, type SkillKey } from "@/lib/profile/skills";
import { buildCanonical } from "@/lib/seo/canonical";
import {
  normalizeSearchParams,
  type NormalizedSearchParams,
} from "@/lib/url/normalizeSearchParams";
import { parseSkillsSearchParam, setSkillsSearchParam } from "@/lib/url/skillsParam";
import { cn } from "@/lib/utils";

const PAGE_TITLE = "فهرست پروفایل‌ها";
const DEFAULT_PAGE_SIZE = 12;

const SKILL_LABELS = new Map(SKILLS.map((skill) => [skill.key, skill.label] as const));
const SKILL_KEYS = new Set(SKILLS.map((skill) => skill.key));

function isSkillKey(value: unknown): value is SkillKey {
  return typeof value === "string" && SKILL_KEYS.has(value);
}
const SORT_OPTIONS = [
  { value: "relevance", label: "مرتبط‌ترین" },
  { value: "newest", label: "جدیدترین" },
  { value: "alpha", label: "مرتب‌سازی الفبا" },
] as const;

type SearchParams = Record<string, string | string[] | undefined>;

const UPDATED_AT_FORMATTER = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium",
});

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  return {
    title: PAGE_TITLE,
    alternates: {
      canonical: buildCanonical("/profiles", searchParams),
    },
  };
}

export default async function ProfilesPage({ searchParams }: { searchParams: SearchParams }) {
  const normalized = normalizeSearchParams(searchParams);
  const selectedSkills = parseSkillsSearchParam(searchParams);

  const [data, cities] = await Promise.all([
    fetchProfilesOrchestrated(searchParams),
    getCities(),
  ]);

  const cityMap = new Map(cities.map((city) => [city.id, city.name] as const));
  const currentPage = data.page ?? normalized.page ?? 1;
  const pageSize = data.pageSize ?? DEFAULT_PAGE_SIZE;
  const hasNextPage = data.items.length === pageSize;
  const hasPrevPage = currentPage > 1;

  const normalizedForLinks: NormalizedSearchParams = {
    ...normalized,
    page: currentPage,
    skills: selectedSkills.length ? selectedSkills : normalized.skills,
  };

  const appliedFilters = data.appliedFilters.map((chip) => {
    const formattedValue = formatFilterValue(chip.key, chip.value, {
      cityMap,
    });

    const href = buildHref(normalizedForLinks, () => {
      if (chip.key === "skills") {
        return { skills: undefined, page: undefined };
      }
      return { [chip.key]: undefined, page: undefined } as Partial<NormalizedSearchParams>;
    });

    return { ...chip, label: formattedValue, href };
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10" dir="rtl">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-foreground">{PAGE_TITLE}</h1>
        <p className="text-sm text-muted-foreground">
          جستجو و فیلتر پروفایل‌های تایید‌شده هنرمندان براساس نام، شهر، مهارت‌ها و سایر معیارها.
        </p>
      </header>

      <Card className="border-border bg-background/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">فیلترها</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="profiles-query">جستجو</Label>
              <Input
                id="profiles-query"
                name="query"
                type="search"
                placeholder="نام هنرمند یا مهارت"
                defaultValue={normalized.query ?? ""}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="profiles-city">شهر</Label>
              <select
                id="profiles-city"
                name="city"
                defaultValue={normalized.city ?? ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">همه شهرها</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2 lg:col-span-2">
              <Label htmlFor="profiles-skills">مهارت‌ها</Label>
              <select
                id="profiles-skills"
                name="skills"
                multiple
                defaultValue={selectedSkills}
                size={Math.min(6, SKILLS.length)}
                className="min-h-[2.5rem] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {SKILLS.map((skill) => (
                  <option key={skill.key} value={skill.key}>
                    {skill.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                برای انتخاب چند مهارت، کلید Ctrl یا Command را نگه دارید.
              </p>
            </div>

            <fieldset className="flex flex-col gap-3">
              <legend className="text-sm font-medium">جنسیت</legend>
              <div className="flex flex-wrap gap-4 text-sm text-foreground">
                <div className="flex items-center gap-2">
                  <input
                    id="profiles-gender-male"
                    name="gender"
                    type="radio"
                    value="male"
                    defaultChecked={normalized.gender === "male"}
                    className="h-4 w-4 border border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <Label htmlFor="profiles-gender-male" className="cursor-pointer">
                    مرد
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="profiles-gender-female"
                    name="gender"
                    type="radio"
                    value="female"
                    defaultChecked={normalized.gender === "female"}
                    className="h-4 w-4 border border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <Label htmlFor="profiles-gender-female" className="cursor-pointer">
                    زن
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="profiles-gender-other"
                    name="gender"
                    type="radio"
                    value="other"
                    defaultChecked={normalized.gender === "other"}
                    className="h-4 w-4 border border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <Label htmlFor="profiles-gender-other" className="cursor-pointer">
                    سایر
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="profiles-gender-any"
                    name="gender"
                    type="radio"
                    value=""
                    defaultChecked={!normalized.gender}
                    className="h-4 w-4 border border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <Label htmlFor="profiles-gender-any" className="cursor-pointer">
                    بدون فیلتر
                  </Label>
                </div>
              </div>
            </fieldset>

            <div className="flex flex-col gap-2">
              <Label htmlFor="profiles-sort">مرتب‌سازی</Label>
              <select
                id="profiles-sort"
                name="sort"
                defaultValue={normalized.sort ?? ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">پیش‌فرض (مرتبط‌ترین)</option>
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <Button type="submit" className="w-full lg:w-auto">
                اعمال فیلترها
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {appliedFilters.length ? (
        <section aria-label="فیلترهای اعمال شده" className="flex flex-wrap gap-2">
          {appliedFilters.map((chip) => (
            <a
              key={chip.key}
              href={chip.href}
              className={cn(
                badgeVariants({ variant: "outline" }),
                "group inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
              aria-label={`حذف فیلتر ${chip.label}`}
            >
              <span>{chip.label}</span>
              <span aria-hidden className="text-muted-foreground">×</span>
            </a>
          ))}
        </section>
      ) : null}

      {data.items.length === 0 ? (
        <EmptyState />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.items.map((item) => {
            const displayName = resolveDisplayName(item);
            const cityName = item.cityId ? cityMap.get(item.cityId) ?? item.cityId : undefined;
            const skills = resolveSkillBadges(item.skills);
            const updatedAtLabel = item.updatedAt
              ? UPDATED_AT_FORMATTER.format(new Date(item.updatedAt))
              : undefined;

            return (
              <Link
                key={item.id}
                href={`/profiles/${item.id}`}
                className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Card className="h-full transition group-hover:shadow-md">
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-xl">{displayName}</CardTitle>
                    {cityName ? (
                      <p className="text-sm text-muted-foreground">ساکن {cityName}</p>
                    ) : null}
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    {skills.length ? (
                      <div className="flex flex-wrap gap-2">
                        {skills.slice(0, 4).map((skill) => (
                          <Badge key={skill.key} variant="secondary" className="rounded-full px-3 py-1 text-xs">
                            {skill.label}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">مهارتی ثبت نشده است.</p>
                    )}
                    {updatedAtLabel ? (
                      <p className="text-xs text-muted-foreground">به‌روزرسانی: {updatedAtLabel}</p>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </section>
      )}

      <footer className="flex flex-col gap-4 rounded-lg border border-border bg-background/60 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          صفحه {currentPage}
          {hasNextPage ? "" : " (آخرین صفحه)"}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasPrevPage}
            asChild={hasPrevPage}
          >
            {hasPrevPage ? (
              <Link href={buildHref(normalizedForLinks, () => ({
                page: currentPage - 1 > 1 ? currentPage - 1 : undefined,
              }))}>
                قبلی
              </Link>
            ) : (
              <>قبلی</>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNextPage}
            asChild={hasNextPage}
          >
            {hasNextPage ? (
              <Link href={buildHref(normalizedForLinks, () => ({
                page: currentPage + 1,
              }))}>
                بعدی
              </Link>
            ) : (
              <>بعدی</>
            )}
          </Button>
        </div>
      </footer>
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
      const parts = value.split(",");
      const labels = parts
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => (isSkillKey(part) ? SKILL_LABELS.get(part) ?? part : part));
      return `مهارت‌ها: ${labels.join("، ")}`;
    }
    case "sort": {
      const label = SORT_OPTIONS.find((option) => option.value === value)?.label ?? value;
      return `مرتب‌سازی: ${label}`;
    }
    default:
      return value;
  }
}

function buildHref(
  normalized: NormalizedSearchParams,
  overridesFactory: () => Partial<NormalizedSearchParams>,
) {
  const overrides = overridesFactory();
  const next: NormalizedSearchParams = { ...normalized, ...overrides };

  const params = new URLSearchParams();

  if (next.query) params.set("query", next.query);
  if (next.city) params.set("city", next.city);
  if (next.gender) params.set("gender", next.gender);
  if (next.sort) params.set("sort", next.sort);
  if (next.remote) params.set("remote", next.remote);
  if (next.category) params.set("category", next.category);
  if (next.payType) params.set("payType", next.payType);
  if (next.featured) params.set("featured", next.featured);
  if (Array.isArray(next.skills) && next.skills.length) {
    setSkillsSearchParam(params, next.skills);
  }

  const pageValue = overrides.page ?? next.page;
  if (pageValue && pageValue > 1) {
    params.set("page", pageValue.toString());
  }

  const search = params.toString();
  return search ? `/profiles?${search}` : "/profiles";
}

function resolveDisplayName(item: {
  stageName: string | null;
  firstName: string | null;
  lastName: string | null;
}) {
  if (item.stageName && item.stageName.trim()) {
    return item.stageName.trim();
  }
  const parts = [item.firstName ?? "", item.lastName ?? ""].map((part) => part.trim()).filter(Boolean);
  return parts.join(" ") || "پروفایل";
}

function resolveSkillBadges(raw: unknown) {
  if (!Array.isArray(raw)) {
    return [] as { key: string; label: string }[];
  }

  const badges: { key: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (typeof entry !== "string") {
      continue;
    }
    if (seen.has(entry)) {
      continue;
    }
    seen.add(entry);
    if (!isSkillKey(entry)) {
      continue;
    }
    badges.push({ key: entry, label: SKILL_LABELS.get(entry) ?? entry });
    if (badges.length >= 8) {
      break;
    }
  }
  return badges;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-10 text-center">
      <p className="text-base font-medium text-foreground">هنرمندی با فیلترهای انتخابی یافت نشد.</p>
      <p className="text-sm text-muted-foreground">
        فیلترها را تغییر دهید یا جستجوی جدیدی انجام دهید.
      </p>
      <Button variant="link" asChild>
        <Link href="/profiles">حذف همه فیلترها</Link>
      </Button>
    </div>
  );
}

