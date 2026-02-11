"use client";

import Image from "next/image";
import { useMemo } from "react";

import { toPersianDigits } from "@/lib/format/persianNumbers";

const ORANGE = "#FF7F19";
const GRAY = "#7C7C7C";

type AwardEntry = {
  title: string;
  workTitle?: string | null;
  place?: string | null;
  awardDate?: string | null;
};

type AwardsSlideProps = {
  awards?: AwardEntry[];
};

function formatAwardDate(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})(?:-(0[1-9]|1[0-2]))?$/);
  if (!match) return trimmed;

  const [, year, month] = match;
  return month ? `${year}/${month}` : year;
}

function buildSubtitle(award: AwardEntry) {
  const parts = [];
  if (award.place?.trim()) parts.push(toPersianDigits(award.place.trim()));
  const formatted = formatAwardDate(award.awardDate);
  if (formatted) parts.push(toPersianDigits(formatted));
  return parts.join(" / ");
}

export function AwardsSlide({ awards }: AwardsSlideProps) {
  const normalized = useMemo(
    () =>
      (awards ?? [])
        .map((a) => ({
          title: a.title.trim(),
          workTitle: a.workTitle?.trim() || "",
          place: a.place?.trim() || "",
          awardDate: a.awardDate?.trim() || "",
        }))
        .filter((x) => x.title),
    [awards],
  );

  return (
    <div
      style={{
        fontFamily: "IRANSans, sans-serif",
        direction: "rtl",
        position: "relative",
        padding: "0 55px",
      }}
    >
      {/* Title */}
      <h1
        style={{
          margin: 0,
          marginTop: 35,
          fontSize: 32,
          fontWeight: 900,
          textAlign: "center",
          color: "#000",
        }}
      >
        جوایز و افتخارات
      </h1>

      {/* No awards */}
      {normalized.length === 0 ? (
        <p
          style={{
            marginTop: 120,
            fontSize: 14,
            color: GRAY,
            textAlign: "center",
          }}
        >
          جایزه‌ای ثبت نشده است.
        </p>
      ) : (
        <div
          style={{
            marginTop: 140,
            display: "flex",
            flexDirection: "column",
            gap: 40,
            width: 680,
          }}
        >
          {normalized.map((award, index) => {
            const subtitle = buildSubtitle(award);
            const title = toPersianDigits(award.title.trim());
            const workTitle = award.workTitle?.trim();
            const workTitleLabel = workTitle ? toPersianDigits(workTitle) : "";

            return (
              <div key={index} style={{ width: "100%" }}>
                {/* Title Row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <Image
                    src="/cineflash/profile/trophy.png"
                    width={26}
                    height={26}
                    alt="award icon"
                  />

                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: ORANGE,
                    }}
                  >
                    {title}
                    {workTitleLabel ? (
                      <span
                        style={{
                          fontSize: 16,
                          color: GRAY,
                          marginTop: 10,
                          fontWeight: 500,
                          marginRight: 5,
                          display: "inline-block",
                        }}
                      >
                        {`_  ${workTitleLabel}`}
                      </span>
                    ) : null}
                  </span>
                </div>

                {/* Subtitle */}
                <div
                  style={{
                    fontSize: 16,
                    color: GRAY,
                    marginTop: 10,
                  }}
                >
                  {subtitle}
                </div>

                {/* Divider – except after the last item */}
                {index < normalized.length - 1 && (
                  <div
                    style={{
                      width: 544,
                      height: 0,
                      border: "1px solid #000",
                      opacity: 0.3,
                      marginTop: 25,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
