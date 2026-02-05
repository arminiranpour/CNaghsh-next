import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PaginationNav } from "@/components/ui/pagination-nav";
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

      <PaginationNav
        currentPage={currentPage}
        hasPrevPage={hasPrevPage}
        hasNextPage={hasNextPage}
        lastPage={lastPage}
        buildHref={(page) =>
          buildProfilesHref(normalized, () => ({
            page: page > 1 ? page : undefined,
          }))
        }
      />
    </section>
  );
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
