"use client";

import Image from "next/image";
import type { ProfileTabId } from "@/components/profile/ProfilePageClient";

const NAV_ITEMS: { id: ProfileTabId; label: string; iconSrc: string }[] = [
  {
    id: "personal",
    label: "اطلاعات شخصی",
    iconSrc: "/cineflash/profile/personal.png",
  },
  {
    id: "gallery",
    label: "گالری تصاویر",
    iconSrc: "/cineflash/profile/gallery.png",
  },
  {
    id: "videos",
    label: "ویدئوها",
    iconSrc: "/cineflash/profile/videos.png",
  },
  {
    id: "audio",
    label: "فایل‌های صوتی",
    iconSrc: "/cineflash/profile/audio.png",
  },
  {
    id: "awards",
    label: "افتخارات",
    iconSrc: "/cineflash/profile/awards.png",
  },
];

const grayFilter =
  "brightness(0) saturate(100%) invert(39%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(90%)";

const whiteFilter = "brightness(0) invert(1)";

type LeftRailProps = {
  activeTab: ProfileTabId;
  onTabChange: (id: ProfileTabId) => void;
};

export function LeftRail({ activeTab, onTabChange }: LeftRailProps) {
  return (
    <>
      <div className="hidden md:block">
        <aside
          aria-label="navigation"
          style={{
            position: "absolute",
            left: 143,
            top: 315,
            width: 108,
            height: 595,
            borderRadius: 20,
            backgroundColor: "#FFFFFF",
            border: "1px solid rgba(0,0,0,0.05)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
            paddingTop: 18,
            paddingBottom: 18,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 30,
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === activeTab;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                style={{
                  width: 87.15,
                  height: 87.15,
                  borderRadius: 22,
                  backgroundColor: isActive ? "#F58A1F" : "#DFDFDF", // نارنجی فیگما
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "background-color 0.15s ease",
                }}
              >
                {/* آیکن */}
                <div
                  style={{
                    width: 35,
                    height: 35,
                    position: "relative",
                    filter: isActive ? whiteFilter : grayFilter,
                  }}
                >
                  <Image
                    src={item.iconSrc}
                    alt={item.label}
                    fill
                    style={{ objectFit: "contain" }}
                  />
                </div>

                {/* متن زیر آیکن */}
                <span
                  style={{
                    fontFamily: "IRANSans, sans-serif",
                    fontSize: 11,
                    fontWeight: 700,
                    color: isActive ? "#FFFFFF" : "#7C7C7C",
                    lineHeight: 1.3,
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </aside>
      </div>

      <nav
        aria-label="profile tabs"
        className="fixed bottom-0 left-0 right-0 z-50 w-full h-[100px] bg-white border-t border-black/10 pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="flex w-full px-4 py-[9px]">
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === activeTab;

            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                onClick={() => onTabChange(item.id)}
                className="grow basis-0 w-full w-max-16 flex flex-col justify-between items-center gap-0 h-14 cursor-pointer rounded-[70px] transition-colors"
                style={{
                  backgroundColor: isActive ? "#FF7F19" : "transparent",
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    position: "relative",
                    filter: isActive ? whiteFilter : grayFilter,
                  }}
                >
                  <Image
                    src={item.iconSrc}
                    alt={item.label}
                    fill
                    style={{ objectFit: "contain" }}
                  />
                </div>

                <span
                  style={{
                    fontFamily: "IRANSans, sans-serif",
                    fontSize: 10,
                    fontWeight: 700,
                    color: isActive ? "#FFFFFF" : "#7C7C7C",
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="h-[70px] md:hidden" aria-hidden="true" />
    </>
  );
}
