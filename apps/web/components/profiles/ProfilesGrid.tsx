import Link from "next/link";

import { Button } from "@/components/ui/button";
import ProfileCard from "@/components/profiles/ProfileCard";
import { buildProfilesHref } from "@/lib/url/buildProfilesHref";
import type { NormalizedSearchParams } from "@/lib/url/normalizeSearchParams";
import type { fetchProfilesOrchestrated } from "@/lib/orchestrators/profiles";
import { cn } from "@/lib/utils";

type ProfileListItem = Awaited<ReturnType<typeof fetchProfilesOrchestrated>>["items"][number];

type ProfilesGridProps = {
  profiles: ProfileListItem[];
  cityMap: Map<string, string>; // kept for compatibility
  normalized: NormalizedSearchParams;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  clearHref: string;
  className?: string;
};

export function ProfilesGrid({
  profiles,
  cityMap, // currently unused inside; safe to keep for future
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
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 place-items-center">
          {profiles.map((item) => {
            const displayName = resolveDisplayName(item);

            return (
              <Link
                key={item.id}
                href={`/profiles/${item.id}`}
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <ProfileCard
                  name={displayName}
                  age={item.age ?? null}
                  avatarUrl={item.avatarUrl ?? null}
                  // level & rating use defaults inside ProfileCard
                />
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
  const parts = [item.firstName ?? "", item.lastName ?? ""]
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.join(" ") || "پروفایل";
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
