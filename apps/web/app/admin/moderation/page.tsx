import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL_SELECT_OPTION_VALUE, normalizeSelectValue } from "@/lib/select";
import { getCities } from "@/lib/location/cities";
import { listProfilesForModeration } from "@/lib/profile/moderation";
import { SKILLS } from "@/lib/profile/skills";

import { ModerationTable } from "./_components/moderation-table";

type SearchParams = Record<string, string | string[] | undefined>;

type SkillOption = {
  key: string;
  label: string;
};

const ALL_OPTION_VALUE = ALL_SELECT_OPTION_VALUE;

const STATUS_OPTIONS = [
  { value: ALL_OPTION_VALUE, label: "همه وضعیت‌ها" },
  { value: "PENDING", label: "در انتظار بررسی" },
  { value: "APPROVED", label: "تایید شده" },
  { value: "REJECTED", label: "رد شده" },
] as const;

const VISIBILITY_OPTIONS = [
  { value: ALL_OPTION_VALUE, label: "همه نمایش‌ها" },
  { value: "PUBLIC", label: "منتشر" },
  { value: "PRIVATE", label: "غیرمنتشر" },
] as const;

const AVATAR_OPTIONS = [
  { value: ALL_OPTION_VALUE, label: "همه" },
  { value: "with", label: "دارای تصویر" },
  { value: "without", label: "بدون تصویر" },
] as const;

type StatusSelectValue = (typeof STATUS_OPTIONS)[number]["value"];
type VisibilitySelectValue = (typeof VISIBILITY_OPTIONS)[number]["value"];
type AvatarSelectValue = (typeof AVATAR_OPTIONS)[number]["value"];

function isStatusSelectValue(value: string | undefined): value is StatusSelectValue {
  return STATUS_OPTIONS.some((option) => option.value === value);
}

function isVisibilitySelectValue(value: string | undefined): value is VisibilitySelectValue {
  return VISIBILITY_OPTIONS.some((option) => option.value === value);
}

function isAvatarSelectValue(value: string | undefined): value is AvatarSelectValue {
  return AVATAR_OPTIONS.some((option) => option.value === value);
}

const PAGE_SIZE = 20;

function getParam(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function parseDateParam(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
}

function normalizeSkills(): SkillOption[] {
  return SKILLS.map((skill) => ({ key: skill.key, label: skill.label }));
}

function getDisplayName(
  stageName?: string | null,
  firstName?: string | null,
  lastName?: string | null,
) {
  if (stageName && stageName.trim()) {
    return stageName.trim();
  }
  const fullName = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return fullName || "بدون نام";
}

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const statusParam = getParam(searchParams, "status");
  const visibilityParam = getParam(searchParams, "visibility");
  const hasAvatarParam = getParam(searchParams, "avatar");
  const cityParam = getParam(searchParams, "city");
  const skillParam = getParam(searchParams, "skill");
  const fromParam = getParam(searchParams, "from");
  const toParam = getParam(searchParams, "to");
  const queryParam = getParam(searchParams, "q");
  const pageParam = Number.parseInt(getParam(searchParams, "page") ?? "1", 10);

  const statusSelectValue: StatusSelectValue = (() => {
    const normalized = normalizeSelectValue(statusParam)?.toUpperCase();
    return isStatusSelectValue(normalized) ? normalized : ALL_OPTION_VALUE;
  })();

  const visibilitySelectValue: VisibilitySelectValue = (() => {
    const normalized = normalizeSelectValue(visibilityParam)?.toUpperCase();
    return isVisibilitySelectValue(normalized) ? normalized : ALL_OPTION_VALUE;
  })();

  const avatarSelectValue: AvatarSelectValue = (() => {
    const normalized = normalizeSelectValue(hasAvatarParam);
    return isAvatarSelectValue(normalized) ? normalized : ALL_OPTION_VALUE;
  })();

  const citySelectValue = normalizeSelectValue(cityParam) ?? ALL_OPTION_VALUE;
  const skillSelectValue = normalizeSelectValue(skillParam) ?? ALL_OPTION_VALUE;

  const filters = {
    status:
      statusSelectValue !== ALL_OPTION_VALUE
        ? (statusSelectValue as Exclude<StatusSelectValue, typeof ALL_OPTION_VALUE>)
        : undefined,
    visibility:
      visibilitySelectValue !== ALL_OPTION_VALUE
        ? (visibilitySelectValue as Exclude<VisibilitySelectValue, typeof ALL_OPTION_VALUE>)
        : undefined,
    hasAvatar:
      avatarSelectValue === "with"
        ? true
        : avatarSelectValue === "without"
          ? false
          : undefined,
    cityId: citySelectValue !== ALL_OPTION_VALUE ? citySelectValue : undefined,
    skill: skillSelectValue !== ALL_OPTION_VALUE ? skillSelectValue : undefined,
    from: parseDateParam(fromParam),
    to: parseDateParam(toParam),
    q: queryParam?.trim() ? queryParam.trim() : undefined,
  } satisfies Parameters<typeof listProfilesForModeration>[0];

  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const [listResult, cities] = await Promise.all([
    listProfilesForModeration(filters, { page, pageSize: PAGE_SIZE }),
    getCities(),
  ]);

  const cityMap = new Map(cities.map((city) => [city.id, city.name] as const));
  const skillOptions = normalizeSkills();

  const rows = listResult.items.map((item) => {
    const rawSkills = Array.isArray(item.skills) ? (item.skills as unknown[]) : [];
    const skills = rawSkills
      .filter((value): value is string => typeof value === "string")
      .map((key) => {
        const skill = skillOptions.find((option) => option.key === key);
        return {
          key,
          label: skill?.label ?? key,
        };
      });

    return {
      id: item.id,
      displayName: getDisplayName(item.stageName, item.firstName, item.lastName),
      cityName: item.cityId ? cityMap.get(item.cityId) ?? item.cityId : "نامشخص",
      age: item.age,
      skills,
      avatarUrl: typeof item.avatarUrl === "string" ? item.avatarUrl : null,
      visibility: item.visibility,
      moderationStatus: item.moderationStatus,
      updatedAt: item.updatedAt.toISOString(),
    };
  });

  const totalPages = Math.max(1, Math.ceil(listResult.total / listResult.pageSize));

  const sanitizedSearchParams: SearchParams = {
    ...searchParams,
    status: normalizeSelectValue(statusSelectValue),
    visibility: normalizeSelectValue(visibilitySelectValue),
    avatar: normalizeSelectValue(avatarSelectValue),
    city: normalizeSelectValue(citySelectValue),
    skill: normalizeSelectValue(skillSelectValue),
  };

  return (
    <div className="space-y-6" dir="rtl">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">پنل مدیریت پروفایل‌ها</h1>
        <p className="text-sm text-muted-foreground">
          مدیریت وضعیت انتشار و ممیزی پروفایل‌های کاربران.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-background p-4 shadow-sm">
        <form className="grid grid-cols-1 gap-4 md:grid-cols-4" method="get">
          <input type="hidden" name="page" value="1" />
          <div className="space-y-2">
            <Label htmlFor="status">وضعیت</Label>
            <Select defaultValue={statusSelectValue} name="status">
              <SelectTrigger id="status">
                <SelectValue placeholder="وضعیت" />
              </SelectTrigger>
              <SelectContent align="end">
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">نمایش</Label>
            <Select defaultValue={visibilitySelectValue} name="visibility">
              <SelectTrigger id="visibility">
                <SelectValue placeholder="نمایش" />
              </SelectTrigger>
              <SelectContent align="end">
                {VISIBILITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar">تصویر پروفایل</Label>
            <Select defaultValue={avatarSelectValue} name="avatar">
              <SelectTrigger id="avatar">
                <SelectValue placeholder="تصویر" />
              </SelectTrigger>
              <SelectContent align="end">
                {AVATAR_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">شهر</Label>
            <Select defaultValue={citySelectValue} name="city">
              <SelectTrigger id="city">
                <SelectValue placeholder="همه شهرها" />
              </SelectTrigger>
              <SelectContent align="end" className="max-h-64">
                <SelectItem value={ALL_OPTION_VALUE}>همه شهرها</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="skill">مهارت</Label>
            <Select defaultValue={skillSelectValue} name="skill">
              <SelectTrigger id="skill">
                <SelectValue placeholder="همه مهارت‌ها" />
              </SelectTrigger>
              <SelectContent align="end" className="max-h-64">
                <SelectItem value={ALL_OPTION_VALUE}>همه مهارت‌ها</SelectItem>
                {skillOptions.map((skill) => (
                  <SelectItem key={skill.key} value={skill.key}>
                    {skill.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="from">از تاریخ</Label>
            <Input id="from" name="from" type="date" defaultValue={fromParam ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="to">تا تاریخ</Label>
            <Input id="to" name="to" type="date" defaultValue={toParam ?? ""} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="q">جستجو</Label>
            <Input
              id="q"
              name="q"
              placeholder="نام، نام هنری یا توضیحات..."
              defaultValue={queryParam ?? ""}
            />
          </div>

          <div className="flex items-end gap-2 md:col-span-2">
            <Button type="submit" className="w-full md:w-auto">
              اعمال فیلتر
            </Button>
            <Button variant="outline" className="w-full md:w-auto" asChild>
              <a href="/admin/moderation">پاکسازی</a>
            </Button>
          </div>
        </form>
      </section>

      <Suspense fallback={<div className="text-sm text-muted-foreground">در حال بارگذاری...</div>}>
        <ModerationTable
          rows={rows}
          total={listResult.total}
          page={listResult.page}
          pageSize={listResult.pageSize}
        />
      </Suspense>

      <PaginationControls
        totalPages={totalPages}
        currentPage={listResult.page}
        searchParams={sanitizedSearchParams}
      />
    </div>
  );
}

type PaginationProps = {
  totalPages: number;
  currentPage: number;
  searchParams: SearchParams;
};

function PaginationControls({ totalPages, currentPage, searchParams }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const createLink = (page: number) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value[0]) {
          params.set(key, value[0]);
        }
      } else if (value) {
        params.set(key, value);
      }
    });
    params.set("page", page.toString());
    return `?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4 text-sm">
      <span>
        صفحه {currentPage} از {totalPages}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          asChild
        >
          <a href={createLink(Math.max(1, currentPage - 1))}>قبلی</a>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          asChild
        >
          <a href={createLink(Math.min(totalPages, currentPage + 1))}>بعدی</a>
        </Button>
      </div>
    </div>
  );
}
