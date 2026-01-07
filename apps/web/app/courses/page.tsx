import Link from "next/link";

import { Button } from "@/components/ui/button";
import { fetchPublishedCourses } from "@/lib/courses/public/queries";
import { getPublicMediaUrlFromKey } from "@/lib/media/urls";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CourseCard from "@/components/CourseCard";
import { iranSans } from "@/lib/fonts/iransans";


type SearchParams = Record<string, string | string[] | undefined>;

export default async function CoursesPage({ searchParams }: { searchParams?: SearchParams }) {
  const pageParam = Array.isArray(searchParams?.page) ? searchParams?.page[0] : searchParams?.page;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const { items, hasNextPage, hasPrevPage } = await fetchPublishedCourses({
    page,
    pageSize: 6,
  });

  const buildPageLink = (nextPage: number) =>
    nextPage <= 1 ? "/courses" : `/courses?page=${nextPage}`;

  return (
    <div
    className={`${iranSans.className} min-h-screen`}
    style={{
        backgroundImage: "url('/images/concrete-wall.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        position: "relative",
      }}
      dir="rtl"
    >
      <Header />

      <main
        className="container mx-auto px-4 pb-24"
        style={{
          paddingTop: "180px", // Account for header at top: 108px + header height + spacing
        }}
      >
        {/* Title */}
        <div className="mb-20 px-20 text-right">
          <h1
            className="text-4xl font-bold"
            style={{
              color: "#F58A1F",
              marginBottom: "2rem",
            }}
          >
            دوره های سی نقش
          </h1>
        </div>

        {/* Courses Grid */}
        {items.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="rounded-lg bg-white/90 px-8 py-6 text-center shadow-lg">
              <h2 className="mb-2 text-xl font-semibold text-gray-800">
                هنوز دوره‌ای منتشر نشده است
              </h2>
              <p className="text-sm text-gray-600">
                پس از انتشار اولین دوره، اطلاعات آن در این صفحه نمایش داده می‌شود.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-8 px-20 md:grid-cols-2 lg:grid-cols-3">
              {items.map((course) => {
                const bannerUrl =
                  course.bannerMediaAsset?.outputKey &&
                  course.bannerMediaAsset.visibility === "public"
                    ? getPublicMediaUrlFromKey(course.bannerMediaAsset.outputKey)
                    : null;

                return (
                  <CourseCard
                    key={course.id}
                    id={course.id}
                    title={course.title}
                    ageRangeText={course.ageRangeText}
                    imageUrl={bannerUrl}
                  />
                );
              })}
            </div>

            {/* Pagination */}
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
                <span className="text-sm text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                  صفحه {page}
                </span>
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

      <Footer />
    </div>
  );
}
