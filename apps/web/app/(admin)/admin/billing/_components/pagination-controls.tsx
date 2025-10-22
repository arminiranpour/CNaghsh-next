import Link from "next/link";

import { Button } from "@/components/ui/button";

function buildHref(
  pathname: string,
  baseQuery: Record<string, string | undefined>,
  page: number,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(baseQuery)) {
    if (value && value.length > 0 && key !== "page") {
      params.set(key, value);
    }
  }
  params.set("page", String(page));
  const queryString = params.toString();
  return queryString.length > 0 ? `${pathname}?${queryString}` : pathname;
}

type Props = {
  pathname: string;
  page: number;
  hasPrevious: boolean;
  hasNext: boolean;
  query: Record<string, string | undefined>;
};

export function PaginationControls({ pathname, page, hasPrevious, hasNext, query }: Props) {
  const prevHref = hasPrevious ? buildHref(pathname, query, page - 1) : null;
  const nextHref = hasNext ? buildHref(pathname, query, page + 1) : null;

  return (
    <div className="flex items-center justify-between gap-2">
      <Button size="sm" variant="outline" disabled={!hasPrevious} asChild={!!prevHref}>
        {prevHref ? <Link href={prevHref}>صفحه قبل</Link> : <span>صفحه قبل</span>}
      </Button>
      <span className="text-xs text-muted-foreground">صفحه {page}</span>
      <Button size="sm" variant="outline" disabled={!hasNext} asChild={!!nextHref}>
        {nextHref ? <Link href={nextHref}>صفحه بعد</Link> : <span>صفحه بعد</span>}
      </Button>
    </div>
  );
}
