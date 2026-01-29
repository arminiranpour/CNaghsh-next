import Link from "next/link";

import { Button } from "@/components/ui/button";
import { buildMoviesHref, type MovieSearchParams } from "@/lib/url/buildMoviesHref";
import { cn } from "@/lib/utils";

import { MovieCard, type MovieCardItem } from "./movie-card";

type MoviesGridProps = {
  movies: MovieCardItem[];
  normalized: MovieSearchParams;
  currentPage: number;
  pageCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  clearHref: string;
  className?: string;
};

export function MoviesGrid({
  movies,
  normalized,
  currentPage,
  pageCount,
  hasNextPage,
  hasPrevPage,
  clearHref,
  className,
}: MoviesGridProps) {
  if (!movies.length) {
    return <EmptyState clearHref={clearHref} className={className} />;
  }

  const pageItems = buildPageList(currentPage, hasPrevPage, hasNextPage, pageCount);

  return (
    <section className={cn("flex flex-col gap-5", className)} dir="rtl" aria-label="لیست فیلم‌ها">
      <div className="p-1">
        <div className="grid gap-7 sm:grid-cols-4 xl:grid-cols-3 place-items-center">
          {movies.map((item) => (
            <MovieCard key={item.id} movie={item} />
          ))}
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
                  href={buildMoviesHref(normalized, () => ({
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

function EmptyState({ clearHref, className }: { clearHref: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center",
        className,
      )}
      dir="rtl"
    >
      <p className="text-base font-medium text-foreground">فیلمی با فیلترهای انتخابی یافت نشد.</p>
      <p className="text-sm text-muted-foreground">فیلترها را تغییر دهید یا جستجوی جدیدی انجام دهید.</p>
      <Button variant="link" asChild>
        <Link href={clearHref}>حذف فیلترها</Link>
      </Button>
    </div>
  );
}
