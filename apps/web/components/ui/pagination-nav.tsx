"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageItem = number | "...";

type PaginationNavProps = {
  currentPage: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  lastPage?: number;
  buildHref?: (page: number) => string;
  onPageChange?: (page: number) => void;
  className?: string;
};

export function PaginationNav({
  currentPage,
  hasPrevPage,
  hasNextPage,
  lastPage,
  buildHref,
  onPageChange,
  className,
}: PaginationNavProps) {
  const pageItems = buildPageList(currentPage, hasPrevPage, hasNextPage, lastPage);

  return (
    <nav
      className={cn(
        "flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm shadow-sm",
        className,
      )}
      aria-label="صفحه‌بندی"
    >
      <div className="flex items-center gap-2">
        {pageItems.map((item, index) =>
          item === "..." ? (
            <span key={`ellipsis-${index}`} className="px-2 text-lg font-bold text-[#1F1F1F]">
              ...
            </span>
          ) : buildHref ? (
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
                href={buildHref(item)}
                aria-current={item === currentPage ? "page" : undefined}
              >
                {item}
              </Link>
            </Button>
          ) : (
            <Button
              key={`page-${item}`}
              size="sm"
              variant="outline"
              type="button"
              onClick={() => {
                if (item === currentPage) {
                  return;
                }
                onPageChange?.(item);
              }}
              aria-current={item === currentPage ? "page" : undefined}
              className={cn(
                "h-7 w-7 rounded-full border bg-white text-sm font-bold",
                item === currentPage
                  ? "border-transparent bg-[#F37C1F] text-white"
                  : "border-border text-[#1F1F1F]",
              )}
            >
              {item}
            </Button>
          ),
        )}
      </div>
    </nav>
  );
}

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
