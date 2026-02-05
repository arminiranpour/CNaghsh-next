"use client";

import Image from "next/image";

import profileIcon from "../profile_8536054.png";
import booksIcon from "../books_2182787.png";
import monologueIcon from "../monolougue_6681932.png";
import moviesIcon from "../movies_8944076.png";

const numberFormatter = new Intl.NumberFormat("fa-IR", { useGrouping: false });

const formatCount = (value: number) => `${numberFormatter.format(Math.max(0, value))} مورد`;

type ArchiveCounts = {
  profiles: number;
  movies: number;
  books: number;
  monologues: number;
};

type EditProfileArchivePaneProps = {
  counts: ArchiveCounts;
};

export function EditProfileArchivePane({ counts }: EditProfileArchivePaneProps) {
  return (
    <section
      aria-label="آرشیو"
      className="absolute left-[273px] top-[315px] h-[595px] w-[748px] rounded-[20px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.10)]"
      dir="rtl"
    >
      <div className="flex h-full flex-col px-[44px] pt-[28px]">
        <h2 className="text-right text-[30px] font-bold text-black">آرشیو من</h2>

        <div className="mt-12 grid grid-cols-3 gap-6">
          <ArchiveTile
            label="پروفایل‌ها"
            count={counts.profiles}
            iconSrc={profileIcon}
            className="col-start-1"
          />
          <ArchiveTile
            label="کتاب‌ها"
            count={counts.books}
            iconSrc={booksIcon}
            className="col-start-2"
          />
          <ArchiveTile
            label="مونولوگ‌ها"
            count={counts.monologues}
            iconSrc={monologueIcon}
            className="col-start-3"
          />
          <ArchiveTile
            label="فیلم‌ها"
            count={counts.movies}
            iconSrc={moviesIcon}
            className="col-start-1 row-start-2"
          />
        </div>
      </div>
    </section>
  );
}

type ArchiveTileProps = {
  label: string;
  count: number;
  iconSrc: typeof profileIcon;
  className?: string;
  variant?: "active" | "inactive";
};

function ArchiveTile({ label, count, iconSrc, className, variant = "inactive" }: ArchiveTileProps) {
  const isActive = variant === "active";

  return (
    <div
      className={`group relative h-[112px] w-[186px] overflow-hidden rounded-[18px] rounded-tl-[42px] px-4 py-3 transition-colors ${
        isActive ? "bg-[#FF7F19]" : "bg-[#EAEAEA] hover:bg-[#FF7F19]"
      } ${className ?? ""}`}
    >
      <Image
        src={iconSrc}
        alt=""
        width={120}
        height={120}
        className={`absolute left-[-20px] top-1/2 bottom-[-10px] -translate-y-1/2 opacity-20 transition ${
          isActive ? "brightness-0 invert" : "group-hover:brightness-0 group-hover:invert"
        }`}
      />

      <div
        className={`relative z-10 text-right transition-colors ${
          isActive ? "text-white" : "text-[#7C7C7C] group-hover:text-white"
        }`}
      >
        <div className="text-[14px] font-bold">{label}</div>
        <div className="mt-1 text-[11px] font-semibold">{formatCount(count)}</div>
      </div>
    </div>
  );
}
