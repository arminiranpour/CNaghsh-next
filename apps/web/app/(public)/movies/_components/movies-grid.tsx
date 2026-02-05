import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { buildPageList } from "@/lib/pagination";
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
  const pageHrefs = Object.fromEntries(
    pageItems
      .filter((item): item is number => typeof item === "number")
      .map((page) => [
        page,
        buildMoviesHref(normalized, () => ({
          page: page > 1 ? page : undefined,
        })),
      ]),
  );

  return (
    <section className={cn("flex flex-col gap-5", className)} dir="rtl" aria-label="لیست فیلم‌ها">
      <div className="p-1">
        <div className="grid gap-7 sm:grid-cols-4 xl:grid-cols-3 place-items-center">
          {movies.map((item) => (
            <MovieCard key={item.id} movie={item} />
          ))}
        </div>
      </div>

      <PaginationNav
        currentPage={currentPage}
        hasPrevPage={hasPrevPage}
        hasNextPage={hasNextPage}
        lastPage={pageCount}
        pageItems={pageItems}
        pageHrefs={pageHrefs}
      />
    </section>
  );
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
