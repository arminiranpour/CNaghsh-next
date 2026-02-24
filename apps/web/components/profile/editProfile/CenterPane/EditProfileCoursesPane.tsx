/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { PaginationNav } from "@/components/ui/pagination-nav";
import { buildPageList } from "@/lib/pagination";
import { EDIT_PROFILE_MOBILE_BOTTOM_NAV_H } from "@/components/profile/editProfile/constants";

const PAGE_SIZE = 2;

type EnrolledCourseCard = {
  id: string;
  title: string;
  imageUrl: string | null;
};

type EditProfileCoursesPaneProps = {
  courses: EnrolledCourseCard[];
};

export function EditProfileCoursesPane({ courses }: EditProfileCoursesPaneProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(courses.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== currentPage) {
      setPage(currentPage);
    }
  }, [page, currentPage]);

  const visibleCourses = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return courses.slice(startIndex, startIndex + PAGE_SIZE);
  }, [courses, currentPage]);

  const hasPrevPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;
  const pageItems = buildPageList(currentPage, hasPrevPage, hasNextPage, totalPages);

  return (
    <section
      aria-label="کلاس‌ها"
      className="fixed left-0 right-0 bottom-0 top-[calc(var(--mobile-header-h,72px)+env(safe-area-inset-top))] z-40 w-screen overflow-x-hidden overflow-y-auto bg-white pb-[calc(var(--edit-profile-bottom-nav-h)+env(safe-area-inset-bottom))] shadow-[0_10px_30px_rgba(0,0,0,0.10)] md:absolute md:left-[273px] md:top-[315px] md:h-[595px] md:w-[748px] md:overflow-hidden md:rounded-[20px] md:pb-0"
      style={{ ["--edit-profile-bottom-nav-h" as any]: `${EDIT_PROFILE_MOBILE_BOTTOM_NAV_H}px` }}
      dir="rtl"
    >
      <div className="flex min-w-0 flex-col px-4 pt-4 md:h-full md:px-[44px] md:pt-[28px]">
        <h2 className="text-right text-[30px] font-bold text-black">کلاس‌های من</h2>

        {courses.length === 0 ? (
          <p className="mt-16 text-center text-[14px] text-[#8B8B8B]">
            هنوز در هیچ کلاسی ثبت‌نام نکرده‌اید.
          </p>
        ) : (
          <div className="mt-6 flex flex-1 flex-col md:mt-10">
            <div className="grid flex-1 grid-cols-1 gap-6 place-items-top sm:grid-cols-2 md:grid-cols-2">
              {visibleCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  title={course.title}
                  imageUrl={course.imageUrl}
                  courseId={course.id}
                />
              ))}
            </div>

            {totalPages > 1 ? (
              <div className="mt-auto pb-4">
                <PaginationNav
                  currentPage={currentPage}
                  hasPrevPage={hasPrevPage}
                  hasNextPage={hasNextPage}
                  lastPage={totalPages}
                  pageItems={pageItems}
                  onPageChange={setPage}
                />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function CourseCard({
  title,
  imageUrl,
  courseId,
}: {
  title: string;
  imageUrl: string | null;
  courseId: string;
}) {
  return (
    <Link
      href={`/courses/${courseId}`}
      className="relative block w-full aspect-square overflow-hidden rounded-[28px] bg-[#1a1a1a] shadow-[0_18px_30px_rgba(0,0,0,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-[312px] md:w-[312px]"
    >
      {imageUrl ? (
        <img src={imageUrl} alt={title} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#2a2a2a] text-[12px] text-[#B5B5B5]">
          بدون تصویر
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />

      <span className="absolute bottom-4 right-4 text-[13px] font-semibold text-white">
        {title}
      </span>

      <span className="absolute bottom-4 left-4 flex h-[30px] w-[72px] items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#2F2F2F] shadow">
        انتخاب
      </span>
    </Link>
  );
}
