/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { PaginationNav } from "@/components/ui/pagination-nav";
import { EDIT_PROFILE_MOBILE_BOTTOM_NAV_H } from "@/components/profile/editProfile/constants";
import { buildPageList } from "@/lib/pagination";

const PAGE_SIZE = 2;

type RegisteredChallengeCard = {
  id: string;
  title: string;
  imageUrl: string | null;
  statusLabel: string;
  dateRangeLabel: string;
};

type EditProfileChallengesPaneProps = {
  challenges: RegisteredChallengeCard[];
};

export function EditProfileChallengesPane({ challenges }: EditProfileChallengesPaneProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(challenges.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== currentPage) {
      setPage(currentPage);
    }
  }, [page, currentPage]);

  const visibleChallenges = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return challenges.slice(startIndex, startIndex + PAGE_SIZE);
  }, [challenges, currentPage]);

  const hasPrevPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;
  const pageItems = buildPageList(currentPage, hasPrevPage, hasNextPage, totalPages);

  return (
    <section
      aria-label="چالش‌ها"
      className="fixed left-0 right-0 bottom-0 top-[calc(var(--mobile-header-h,72px)+env(safe-area-inset-top))] z-40 w-screen overflow-x-hidden overflow-y-auto bg-white pb-[calc(var(--edit-profile-bottom-nav-h)+env(safe-area-inset-bottom))] shadow-[0_10px_30px_rgba(0,0,0,0.10)] md:absolute md:left-[273px] md:right-auto md:top-[315px] md:h-[595px] md:w-[748px] md:overflow-hidden md:rounded-[20px] md:pb-0"
      style={{ "--edit-profile-bottom-nav-h": `${EDIT_PROFILE_MOBILE_BOTTOM_NAV_H}px` } as CSSProperties & {
        "--edit-profile-bottom-nav-h": string;
      }}
      dir="rtl"
    >
      <div className="flex min-w-0 flex-col px-4 pt-4 md:h-full md:px-[44px] md:pt-[28px]">
        <h2 className="text-right text-[30px] font-bold text-black">چالش‌های من</h2>

        {challenges.length === 0 ? (
          <p className="mt-16 text-center text-[14px] text-[#8B8B8B]">
            هنوز در هیچ چالشی ثبت‌نام نکرده‌اید.
          </p>
        ) : (
          <div className="mt-6 flex flex-1 flex-col md:mt-10">
            <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-2">
              {visibleChallenges.map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
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

function ChallengeCard({ challenge }: { challenge: RegisteredChallengeCard }) {
  return (
    <Link
      href={`/challenges/${challenge.id}`}
      className="flex h-full flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_18px_30px_rgba(0,0,0,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="relative h-[170px] w-full overflow-hidden bg-[#1a1a1a]">
        {challenge.imageUrl ? (
          <img src={challenge.imageUrl} alt={challenge.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[12px] text-[#B5B5B5]">
            بدون تصویر
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 py-4">
        <h3 className="line-clamp-2 text-[15px] font-bold text-black">{challenge.title}</h3>
        <p className="text-xs text-[#6D6D6D]">{challenge.dateRangeLabel}</p>
        <p className="text-sm font-semibold text-[#FF7F19]">{challenge.statusLabel}</p>
        <span className="mt-auto inline-flex w-fit rounded-full bg-[#F5F5F5] px-4 py-2 text-xs font-bold text-[#2F2F2F]">
          ادامه
        </span>
      </div>
    </Link>
  );
}
