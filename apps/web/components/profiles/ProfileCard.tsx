"use client";

import Image from "next/image";

type FeaturedCardProps = {
  name: string;
  age?: number | null;
  avatarUrl?: string | null;
  level?: string | null;
  rating?: number | null;
  frameSrc?: string;
  starSrc?: string;
};

export default function Card({
  name,
  age,
  avatarUrl,
  level = "حرفه‌ای",
  rating = 4.5,
  frameSrc = "/cineflash/home/Bazigaran/CardFrame.png",
  starSrc = "/cineflash/home/Bazigaran/Star.png",
}: FeaturedCardProps) {
  const avatarSrc = avatarUrl && avatarUrl.trim()
    ? avatarUrl
    : "/cineflash/home/Header/user.png"; // fallback image

  const ageLabel =
    typeof age === "number"
      ? `سن: ${age} سال`
      : "سن ثبت نشده";

  return (
    <div
      className="relative w-full h-full"
      style={{ direction: "rtl" }}
    >
      <div
        className="
          relative flex flex-col items-center justify-start text-center
          w-full h-full
        "
      >
        {/* Default Frame */}
        <div className="absolute inset-0 pointer-events-none">
          <Image
            src={frameSrc}
            alt="قاب کارت"
            fill
            unoptimized
            sizes="100vw"
            style={{ objectFit: "contain" }}
          />
        </div>


        {/* Avatar (Profile Picture) */}
        <div
          className="absolute overflow-hidden"
          style={{
            top: "4.2%",
            left: "6.3%",
            width: "87.4%",
            height: "53.3%",
            borderRadius: "15px",
          }}
        >
          <Image
            src={avatarSrc}
            alt={name}
            fill
            sizes="100%"
            style={{ objectFit: "cover" }}
          />
        </div>

        {/* Star, Rating, and Level Container */}
        <div
          className="absolute flex items-center justify-between w-full px-[14.3%]"
          style={{
            top: "60.9%",
            left: 0,
          }}
        >
          {/* Left side: Star and Rating */}
          <div className="flex items-center gap-[1.8%]">
            {/* Star */}
            <div
              className="relative flex items-center justify-center"
              style={{
                width: "4.3%",
                height: "3.5%",
                minWidth: "12px",
                minHeight: "11px",
              }}
            >
              <Image
                src={starSrc}
                alt="ستاره"
                fill
                unoptimized
                sizes="4.3%"
                style={{ objectFit: "contain" }}
              />
            </div>

            {/* Rating */}
            <div
              className="font-iransans flex items-center justify-center"
              style={{
                fontSize: "clamp(10px, 3.8vw, 12px)",
                fontWeight: 600,
                lineHeight: "1.2",
                color: "#FF7F19",
              }}
            >
              {rating}
            </div>
          </div>

          {/* Right side: Level */}
          <div
            className="flex items-center justify-center font-iransans"
            style={{
              width: "16.8%",
              height: "4.5%",
              minWidth: "47px",
              minHeight: "14px",
              backgroundColor: "#Ff7F19",
              borderRadius: "19px",
            }}
          >
            <span
              style={{
                fontFamily: "IRANSans",
                fontSize: "clamp(8px, 3.2vw, 10px)",
                color: "#ffffff",
                lineHeight: "1",
                fontWeight: 500,
              }}
            >
              {level}
            </span>
          </div>
        </div>

        {/* Name + Age */}
        <div
          className="absolute w-full text-center"
          style={{ bottom: "16%", left: 0 }}
        >
          <div
            style={{
              fontFamily: "IRANSans",
              fontSize: "clamp(14px, 5.8vw, 18px)",
              fontWeight: 800,
              color: "#0F0F0F",
              lineHeight: "1.2",
            }}
          >
            {name}
          </div>

          <div
            style={{
              marginTop: "1.9%",
              fontFamily: "IRANSans",
              fontSize: "clamp(9px, 3.5vw, 11px)",
              fontWeight: 400,
              color: "#0F0F0F",
            }}
          >
            {ageLabel}
          </div>
        </div>
      </div>
    </div>
  );
}
