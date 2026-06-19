import type { Metadata } from "next";
import Link from "next/link";

import { ChallengeCard } from "@/components/challenges/ChallengeCard";
import { Button } from "@/components/ui/button";
import { fetchPublishedChallenges } from "@/lib/challenges/public/queries";
import { iranSans } from "@/lib/fonts/iransans";
import { getPublicMediaUrlFromKey } from "@/lib/media/urls";

type SearchParams = Record<string, string | string[] | undefined>;

export const metadata: Metadata = {
  title: "چالش‌ها و رویدادهای سی‌نقش",
  description: "فهرست چالش‌ها و رویدادهای منتشرشده سی‌نقش برای ثبت‌نام و ارسال اثر.",
};

export default async function ChallengesPage({ searchParams }: { searchParams?: SearchParams }) {
  const pageParam = Array.isArray(searchParams?.page) ? searchParams?.page[0] : searchParams?.page;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const { items, hasNextPage, hasPrevPage } = await fetchPublishedChallenges({
    page,
    pageSize: 6,
  });

  const buildPageLink = (nextPage: number) => (nextPage <= 1 ? "/challenges" : `/challenges?page=${nextPage}`);

  return (
    <div className={`${iranSans.className} min-h-screen`} dir="rtl">
      <main className="container mx-auto mt-[180px] px-4 pb-24">
        <div className="mb-14 text-right md:px-8 lg:px-20">
          <h1 className="text-3xl font-bold text-[#F58A1F] md:text-4xl">
            چالش و رویدادهای سی‌نقش
          </h1>
        </div>

        {items.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="rounded-[22px] bg-white/90 px-8 py-6 text-center shadow-lg">
              <h2 className="mb-2 text-xl font-semibold text-gray-800">فعلاً چالشی منتشر نشده است</h2>
              <p className="text-sm text-gray-600">
                بعد از انتشار اولین چالش، اطلاعات آن در این صفحه نمایش داده می‌شود.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 md:px-8 lg:px-20">
              {items.map((challenge) => {
                const imageUrl =
                  challenge.coverMediaAsset?.outputKey && challenge.coverMediaAsset.visibility === "public"
                    ? getPublicMediaUrlFromKey(challenge.coverMediaAsset.outputKey)
                    : null;

                return (
                  <ChallengeCard
                    key={challenge.id}
                    id={challenge.id}
                    title={challenge.title}
                    location={challenge.location}
                    summary={challenge.summary}
                    startDate={challenge.startDate}
                    endDate={challenge.endDate}
                    imageUrl={imageUrl}
                  />
                );
              })}
            </div>

            {hasNextPage || hasPrevPage ? (
              <div className="mt-12 flex items-center justify-center gap-4">
                {hasPrevPage ? (
                  <Button asChild variant="outline" className="bg-white/90">
                    <Link href={buildPageLink(page - 1)}>صفحه قبل</Link>
                  </Button>
                ) : (
                  <Button variant="outline" disabled className="bg-white/90">
                    صفحه قبل
                  </Button>
                )}
                <span className="text-sm text-black">صفحه {new Intl.NumberFormat("fa-IR").format(page)}</span>
                {hasNextPage ? (
                  <Button asChild variant="outline" className="bg-white/90">
                    <Link href={buildPageLink(page + 1)}>صفحه بعد</Link>
                  </Button>
                ) : (
                  <Button variant="outline" disabled className="bg-white/90">
                    صفحه بعد
                  </Button>
                )}
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
