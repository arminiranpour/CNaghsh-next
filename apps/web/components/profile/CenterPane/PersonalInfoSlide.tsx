"use client";

import Image from "next/image";
import type { Prisma } from "@prisma/client";

const ORANGE = "#F58A1F";

const CARD_WIDTH = 320;
const CARD_HEIGHT = 176;

const bulletDotStyle: React.CSSProperties = {
  width: 5,
  height: 5,
  borderRadius: "999px",
  backgroundColor: "#5C5A5A",
  flexShrink: 0,
};

const bulletTextStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 400,
  color: "#5C5A5A",
  lineHeight: 1.9,
};

type ExperienceItem = {
  role: string;
  work: string;
};

export type ExperienceData = {
  theatre?: ExperienceItem[] | null;
  shortFilm?: ExperienceItem[] | null;
  cinema?: ExperienceItem[] | null;
  tv?: ExperienceItem[] | null;
};

const isExperienceItem = (entry: unknown): entry is ExperienceItem =>
  !!entry &&
  typeof entry === "object" &&
  "role" in entry &&
  typeof (entry as { role?: unknown }).role === "string" &&
  "work" in entry &&
  typeof (entry as { work?: unknown }).work === "string";

const EXPERIENCE_SECTIONS: { key: keyof ExperienceData; title: string }[] = [
  { key: "shortFilm", title: "فیلم کوتاه" },
  { key: "theatre", title: "تئاتر" },
  { key: "tv", title: "تلویزیون" },
  { key: "cinema", title: "سینمایی" },
];

const EXPERIENCE_CARD_META: Record<
  keyof ExperienceData,
  {
    left: number;
    top: number;
    backgroundColor: string;
    titleColor: string;
    iconSrc: string;
    iconAlt: string;
    iconWidth: number;
    iconHeight: number;
  }
> = {
  shortFilm: {
    left: 65,
    top: 345,
    backgroundColor: "#E8F5DD",
    titleColor: "#0A3F35",
    iconSrc: "/cineflash/profile/jobs/short-film.png",
    iconAlt: "فیلم کوتاه",
    iconWidth: 28,
    iconHeight: 28,
  },
  theatre: {
    left: 65 + CARD_WIDTH + 30,
    top: 345,
    backgroundColor: "#FEE5D5",
    titleColor: ORANGE,
    iconSrc: "/cineflash/profile/jobs/theatre.png",
    iconAlt: "تئاتر",
    iconWidth: 38,
    iconHeight: 38,
  },
  tv: {
    left: 65,
    top: 345 + CARD_HEIGHT + 30,
    backgroundColor: "#FEE5D5",
    titleColor: ORANGE,
    iconSrc: "/cineflash/profile/jobs/tv.png",
    iconAlt: "تلویزیون",
    iconWidth: 28,
    iconHeight: 28,
  },
  cinema: {
    left: 65 + CARD_WIDTH + 30,
    top: 345 + CARD_HEIGHT + 30,
    backgroundColor: "#E8F5DD",
    titleColor: "#0A3F35",
    iconSrc: "/cineflash/profile/jobs/cinema.png",
    iconAlt: "سینمایی",
    iconWidth: 28,
    iconHeight: 28,
  },
};

type PersonalInfoSlideProps = {
  bio?: string | null;
  // allow both object AND JSON string from DB
  experience?: ExperienceData | Prisma.JsonValue | string | null;
};

const DEFAULT_BIO =
  "من عاشق لحظه‌هایی‌ام که می‌توانم از خودم بیرون بیایم و توی پوست یه آدم دیگه زندگی کنم. بازیگری برام راهیه برای شناخت احساسات آدم‌ها و دنیاهای تازه.\nفارغ‌التحصیل ادبیات نمایشی‌ام و تا حالا تو چند نمایش و فیلم بازی کردم. از کار گروهی، صحنه و سکوت پشت دوربین لذت می‌برم. ویولن می‌زنم، صداپیشگی می‌کنم و با زبان ترکی و انگلیسی آشنا‌م. همیشه دنبال تجربه‌هایی‌ام که بتونن منو به یه نسخه عمیق‌تر از خودم نزدیک‌تر کنن.";

export function PersonalInfoSlide({ bio, experience }: PersonalInfoSlideProps) {
  const bioToRender = bio && bio.trim() ? bio : DEFAULT_BIO;

  let experienceData: ExperienceData = {};

  if (experience) {
    if (typeof experience === "string") {
      // experience is JSON string from DB
      try {
        const parsed = JSON.parse(experience);
        if (parsed && typeof parsed === "object") {
          experienceData = parsed as ExperienceData;
        }
      } catch {
        // invalid JSON → just keep it empty
        experienceData = {};
      }
    } else {
      // experience is already an object
      experienceData = experience as ExperienceData;
    }
  }


  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        direction: "rtl",
        fontFamily: "IRANSans, sans-serif",
      }}
    >
      {/* درباره من */}
      <h1
        style={{
          position: "absolute",
          left: 620,
          top: 35,
          height: 47,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          fontSize: 32,
          fontWeight: 900,
          color: "#000000",
          whiteSpace: "nowrap",
        }}
      >
        درباره من
      </h1>

      <div
        style={{
          position: "absolute",
          left: 75,
          top: 107,
          width: 662,
          color: "#5C5A5A",
          fontSize: 13,
          fontWeight: 450,
          lineHeight: 1.9,
          textAlign: "justify",
          overflow: "hidden",
          whiteSpace: "pre-line",
        }}
      >
        <p style={{ margin: 0 }}>{bioToRender}</p>
      </div>

      {/* تیتر کارهایی که انجام دادم */}
      <h2
        style={{
          position: "absolute",
          left: 696 - 228,
          top: 573 - 300,
          width: 271,
          height: 47,
          margin: 0,
          fontSize: 30,
          fontWeight: 700,
          color: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          whiteSpace: "nowrap",
        }}
      >
        کارهایی که انجام دادم:
      </h2>

      {EXPERIENCE_SECTIONS.map((section) => {
        const card = EXPERIENCE_CARD_META[section.key];
        const rawItems = experienceData?.[section.key];
        const items = Array.isArray(rawItems) ? rawItems.filter(isExperienceItem) : [];

        return (
          <div
            key={section.key}
            style={{
              position: "absolute",
              left: card.left,
              top: card.top,
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
              borderRadius: 24,
              backgroundColor: card.backgroundColor,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 22,
                right: 32,
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: card.titleColor,
                fontSize: 18,
                fontWeight: 700,
                flexDirection: "row",
              }}
            >
              <Image
                src={card.iconSrc}
                alt={card.iconAlt}
                width={card.iconWidth}
                height={card.iconHeight}
              />
              <span>{section.title}</span>
            </div>

            <div
              style={{
                position: "absolute",
                top: 62,
                right: 56,
                width: CARD_WIDTH - 96,
              }}
            >
              {items.length > 0 ? (
                items.map((item, idx) => (
                  <div key={`${section.key}-${idx}`}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: idx < items.length - 1 ? 4 : 0,
                      }}
                    >
                      <span style={bulletDotStyle} />
                      <span style={bulletTextStyle}>
                        {item.role} / {item.work}
                      </span>
                    </div>

                    {idx < items.length - 1 ? (
                      <div
                        style={{
                          height: 1,
                          backgroundColor: "rgba(0,0,0,0.15)",
                          margin: "10px 12px 10px 0",
                        }}
                      />
                    ) : null}
                  </div>
                ))
              ) : (
                <div style={{ minHeight: 20 }} />
              )}
            </div>
          </div>
        );
      })}

      {/* دکمه صفحه بعد – بدون بُردر، وسط، فلش سمت راست */}
      <div
        style={{
          position: "absolute",
          left: (797 / 2) - (141 / 2), // وسط افقی نسبت به عرض 748 کانتینر
          top: 1038 - 290, // موقعیت دقیق فیگما
          width: 141,
          height: 44,
          borderRadius: 38,
          backgroundColor: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          cursor: "pointer",
          fontFamily: "IRANSans, sans-serif",
          color: "#FF7F19",
          fontSize: 15,
          fontWeight: 700,
        }}
      >
        {/* متن سمت چپ */}
        <span>صفحه بعد</span>

        {/* فلش سمت راست ← */}
        <span style={{ fontSize: 20, marginBottom: 2 }}>←</span>
      </div>

    </div>
  );
}
