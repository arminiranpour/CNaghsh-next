import type { Metadata } from "next";

import { buildCanonical } from "@/lib/seo/canonical";
import { normalizeSearchParams } from "@/lib/url/normalizeSearchParams";

// Sprint 4 Phase 1: Listings rendered via SSR; details remain ISR

const PAGE_TITLE = "Jobs board (Phase 1 baseline)";

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  searchParams: SearchParams;
};

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const canonical = buildCanonical("/jobs", searchParams);

  return {
    title: PAGE_TITLE,
    alternates: {
      canonical,
    },
  };
}

export default function JobsPage({ searchParams }: PageProps) {
  const normalized = normalizeSearchParams(searchParams);

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6 py-10" dir="rtl">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">فرصت‌های شغلی</h1>
        <p className="text-sm text-muted-foreground">
          در فاز فعلی تنها اسکلت صفحه و طرح پارامترهای جستجو آماده شده است. لایه داده و فیلترها در مراحل بعدی
          تکمیل می‌شوند.
        </p>
      </header>
      <div className="space-y-4 rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm">
        <p className="font-medium text-foreground">پارامترهای نرمال‌سازی شده</p>
        <pre className="overflow-auto rounded-md bg-background p-4 text-xs shadow-sm">
          {JSON.stringify(normalized, null, 2)}
        </pre>
      </div>
    </section>
  );
}
