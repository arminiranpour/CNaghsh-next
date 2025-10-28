import type { Route } from "next";
import Link from "next/link";

function buildUrl(basePath: Route, searchParams: URLSearchParams, page: number) {
  const nextParams = new URLSearchParams(searchParams);
  nextParams.set("page", page.toString());
  return `${basePath}?${nextParams.toString()}` as Route;
}

export function PaginationControls({
  basePath,
  searchParams,
  page,
  totalPages,
}: {
  basePath: Route;
  searchParams: URLSearchParams;
  page: number;
  totalPages: number;
}) {
  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-sm" dir="rtl">
      <div>
        صفحه {page} از {totalPages}
      </div>
      <div className="flex items-center gap-2">
        <Link
          aria-disabled={!prevPage}
          className={`rounded-md border px-3 py-1 transition ${
            prevPage ? "hover:bg-muted" : "pointer-events-none opacity-50"
          }`}
          href={prevPage ? buildUrl(basePath, searchParams, prevPage) : basePath}
        >
          قبلی
        </Link>
        <Link
          aria-disabled={!nextPage}
          className={`rounded-md border px-3 py-1 transition ${
            nextPage ? "hover:bg-muted" : "pointer-events-none opacity-50"
          }`}
          href={nextPage ? buildUrl(basePath, searchParams, nextPage) : basePath}
        >
          بعدی
        </Link>
      </div>
    </div>
  );
}
