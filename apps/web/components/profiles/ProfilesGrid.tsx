import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildProfilesHref } from "@/lib/url/buildProfilesHref";
import type { NormalizedSearchParams } from "@/lib/url/normalizeSearchParams";
import type { fetchProfilesOrchestrated } from "@/lib/orchestrators/profiles";
import { SKILLS, isSkillKey } from "@/lib/profile/skills";
import { cn } from "@/lib/utils";

const SKILL_LABELS = new Map(SKILLS.map((skill) => [skill.key, skill.label] as const));

const UPDATED_AT_FORMATTER = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium",
});

type ProfileListItem = Awaited<ReturnType<typeof fetchProfilesOrchestrated>>["items"][number];

type ProfilesGridProps = {
  profiles: ProfileListItem[];
  cityMap: Map<string, string>;
  normalized: NormalizedSearchParams;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  clearHref: string;
  className?: string;
};

export function ProfilesGrid({
  profiles,
  cityMap,
  normalized,
  currentPage,
  hasNextPage,
  hasPrevPage,
  clearHref,
  className,
}: ProfilesGridProps) {
  if (!profiles.length) {
    return <EmptyState clearHref={clearHref} className={className} />;
  }

  const pageItems = buildPageList(currentPage, hasPrevPage, hasNextPage);

  return (
    <section className={cn("flex flex-col gap-5", className)} dir="rtl" aria-label="لیست بازیگران">
      <div className="p-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {profiles.map((item) => {
            const displayName = resolveDisplayName(item);
            const cityName = item.cityId ? cityMap.get(item.cityId) ?? item.cityId : "—";
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
                <Card className="h-full overflow-hidden rounded-2xl border border-border/70 bg-white shadow-sm transition duration-150 group-hover:-translate-y-0.5 group-hover:shadow-md">
                  <CardHeader className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-lg font-semibold text-foreground">{displayName}</CardTitle>
                      <Badge variant="secondary" className="rounded-full bg-muted text-xs font-medium text-foreground">
                        پروفایل
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">ساکن {cityName}</p>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    {skills.length ? (
                      <div className="flex flex-wrap gap-2">
                        {skills.slice(0, 4).map((skill) => (
                          <Badge
                            key={skill.key}
                            variant="secondary"
                            className="rounded-full bg-muted px-3 py-1 text-xs text-foreground"
                          >
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
        </div>
      </div>

      <nav
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white/90 px-4 py-3 text-sm shadow-sm"
        aria-label="صفحه‌بندی"
      >
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrevPage}
          asChild={hasPrevPage}
          className="min-w-[96px]"
        >
          {hasPrevPage ? (
            <Link
              href={buildProfilesHref(normalized, () => ({
                page: currentPage - 1 > 1 ? currentPage - 1 : undefined,
              }))}
            >
              قبلی
            </Link>
          ) : (
            <span>قبلی</span>
          )}
        </Button>

        <div className="flex items-center gap-2">
          {pageItems.map((page) => (
            <Button
              key={page}
              size="sm"
              variant={page === currentPage ? "default" : "outline"}
              asChild
              className={cn(
                "h-9 w-9 rounded-full text-sm",
                page === currentPage ? "bg-foreground text-background" : "bg-white",
              )}
            >
              <Link
                href={buildProfilesHref(normalized, () => ({
                  page: page > 1 ? page : undefined,
                }))}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </Link>
            </Button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={!hasNextPage}
          asChild={hasNextPage}
          className="min-w-[96px]"
        >
          {hasNextPage ? (
            <Link
              href={buildProfilesHref(normalized, () => ({
                page: currentPage + 1,
              }))}
            >
              بعدی
            </Link>
          ) : (
            <span>بعدی</span>
          )}
        </Button>
      </nav>
    </section>
  );
}

function buildPageList(current: number, hasPrevPage: boolean, hasNextPage: boolean) {
  const pages = new Set<number>([current]);
  if (hasPrevPage && current > 1) {
    pages.add(current - 1);
  }
  if (hasNextPage) {
    pages.add(current + 1);
  }
  return Array.from(pages).sort((a, b) => a - b);
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

function EmptyState({ clearHref, className }: { clearHref: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center",
        className,
      )}
      dir="rtl"
    >
      <p className="text-base font-medium text-foreground">هنرمندی با فیلترهای انتخابی یافت نشد.</p>
      <p className="text-sm text-muted-foreground">فیلترها را تغییر دهید یا جستجوی جدیدی انجام دهید.</p>
      <Button variant="link" asChild>
        <Link href={clearHref}>حذف فیلترها</Link>
      </Button>
    </div>
  );
}
