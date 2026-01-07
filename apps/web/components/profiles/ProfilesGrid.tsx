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
  lastPage?: number;
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
  lastPage,
  hasNextPage,
  hasPrevPage,
  clearHref,
  className,
}: ProfilesGridProps) {
  if (!profiles.length) {
    return <EmptyState clearHref={clearHref} className={className} />;
  }

  const pageItems = buildPageList(currentPage, hasPrevPage, hasNextPage, lastPage);

  return (
    <section className={cn("flex flex-col gap-5", className)} dir="rtl" aria-label="لیست بازیگران">
      <div className="p-1">
        <div className="grid gap-7 sm:grid-cols-4 xl:grid-cols-3 place-items-center">
          {profiles.map((item) => {
            const displayName = resolveDisplayName(item);

            return (
              <Link
                key={item.id}
                href={`/profiles/${item.id}`}
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                style={{ width: "230px", height: "325px" }}
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
        className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm shadow-sm"
        aria-label="صفحه‌بندی"
      >
        <div className="flex items-center gap-2">
          {pageItems.map((item, index) =>
            item === "..." ? (
              <span key={`ellipsis-${index}`} className="px-2 text-lg font-bold text-[#1F1F1F]">
                ...
              </span>
            ) : (
              <Button
                key={`page-${item}`}
                size="sm"
                variant="outline"
                asChild
                className={cn(
                  "h-7 w-7 rounded-full border bg-white text-sm font-bold",
                  item === currentPage
                    ? "border-transparent bg-[#F37C1F] text-white"
                    : "border-border text-[#1F1F1F]",
                )}
              >
                <Link
                  href={buildProfilesHref(normalized, () => ({
                    page: item > 1 ? item : undefined,
                  }))}
                  aria-current={item === currentPage ? "page" : undefined}
                >
                  {item}
                </Link>
              </Button>
            ),
          )}
        </div>
      </nav>
    </section>
  );
}

type PageItem = number | "...";

function buildPageList(
  current: number,
  hasPrevPage: boolean,
  hasNextPage: boolean,
  lastPage?: number,
): PageItem[] {
  const inferredLast = lastPage ?? (hasNextPage ? current + 1 : current);
  const safeLast = Math.max(inferredLast, current);

  if (safeLast <= 1) return [1];
  if (safeLast <= 4) return Array.from({ length: safeLast }, (_, i) => i + 1);

  if (current <= 2) {
    return [1, 2, 3, "...", safeLast];
  }

  if (current >= safeLast - 1) {
    return [1, "...", safeLast - 2, safeLast - 1, safeLast];
  }

  return [1, current, current + 1, "...", safeLast];
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
