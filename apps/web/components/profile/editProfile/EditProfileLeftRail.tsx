"use client";

import Image from "next/image";

import challengesIcon from "./challenges-gray.png";
import messageIcon from "./message-gray.png";
import portfolioIcon from "./portfolio-white.png";
import savedIcon from "./saved-gray.png";
import subscriptionIcon from "./subscription-gray.png";

const NAV_ITEMS = [
  {
    id: "portfolio",
    label: "پورتفولیو",
    iconSrc: portfolioIcon,
    isActive: true,
  },
  {
    id: "messages",
    label: "صندوق پیام",
    iconSrc: messageIcon,
    isActive: false,
  },
  {
    id: "saved",
    label: "ذخیره شده",
    iconSrc: savedIcon,
    isActive: false,
  },
  {
    id: "challenges",
    label: "چالش و رویداد",
    iconSrc: challengesIcon,
    isActive: false,
  },
  {
    id: "subscription",
    label: "اشتراک",
    iconSrc: subscriptionIcon,
    isActive: false,
  },
];

export function EditProfileLeftRail() {
  return (
    <aside
      aria-label="ناوبری ویرایش پروفایل"
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
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 30,
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = item.isActive;

        return (
          <button
            key={item.id}
            type="button"
            disabled={!isActive}
            style={{
              width: 87.15,
              height: 87.15,
              borderRadius: 22,
              backgroundColor: isActive ? "#F58A1F" : "#F1F1F1",
              border: "none",
              padding: 0,
              cursor: isActive ? "default" : "not-allowed",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: isActive ? 1 : 0.6,
            }}
          >
            <div style={{ width: 35, height: 35, position: "relative" }}>
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
                fontSize: 11,
                fontWeight: 700,
                color: isActive ? "#FFFFFF" : "#8B8B8B",
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
  );
}
