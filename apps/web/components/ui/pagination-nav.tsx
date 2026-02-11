"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { buildPageList, type PageItem } from "@/lib/pagination";
import { toPersianDigits } from "@/lib/format/persianNumbers";
import { cn } from "@/lib/utils";

type PaginationNavProps = {
  currentPage: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  lastPage?: number;
  pageItems?: PageItem[];
  pageHrefs?: Record<number, string>;
  onPageChange?: (page: number) => void;
  className?: string;
};

export function PaginationNav({
  currentPage,
  hasPrevPage,
  hasNextPage,
  lastPage,
  pageItems,
  pageHrefs,
  onPageChange,
  className,
}: PaginationNavProps) {
  const items = pageItems ?? buildPageList(currentPage, hasPrevPage, hasNextPage, lastPage);

  return (
    <nav
      className={cn(
        "flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm shadow-sm",
        className,
      )}
      aria-label="صفحه‌بندی"
    >
      <div className="flex items-center gap-2">
        {items.map((item, index) =>
          item === "..." ? (
            <span key={`ellipsis-${index}`} className="px-2 text-lg font-bold text-[#1F1F1F]">
              ...
            </span>
          ) : pageHrefs ? (
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
                href={pageHrefs[item] ?? "#"}
                aria-current={item === currentPage ? "page" : undefined}
              >
                {toPersianDigits(item)}
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
              {toPersianDigits(item)}
            </Button>
          ),
        )}
      </div>
    </nav>
  );
}
