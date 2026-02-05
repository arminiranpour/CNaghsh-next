"use client";

import Image from "next/image";

import challengesIcon from "./challenges-gray.png";
import coursesIcon from "./courses-white.png";
import messageIcon from "./message-gray.png";
import portfolioIcon from "./portfolio-white.png";
import savedIcon from "./saved-gray.png";
import subscriptionIcon from "./subscription-gray.png";

export type EditProfileTabId =
  | "portfolio"
  | "messages"
  | "saved"
  | "challenges"
  | "courses"
  | "subscription";

const NAV_ITEMS: {
  id: EditProfileTabId;
  label: string;
  iconSrc: typeof portfolioIcon;
  isEnabled: boolean;
}[] = [
  {
    id: "portfolio",
    label: "پورتفولیو",
    iconSrc: portfolioIcon,
    isEnabled: true,
  },
  {
    id: "messages",
    label: "صندوق پیام",
    iconSrc: messageIcon,
    isEnabled: false,
  },
  {
    id: "saved",
    label: "آرشیو",
    iconSrc: savedIcon,
    isEnabled: true,
  },
  {
    id: "challenges",
    label: "چالش و رویداد",
    iconSrc: challengesIcon,
    isEnabled: false,
  },
  {
    id: "courses",
    label: "کلاس و آموزش",
    iconSrc: coursesIcon,
    isEnabled: true,
  },
  {
    id: "subscription",
    label: "اشتراک",
    iconSrc: subscriptionIcon,
    isEnabled: true,
  },
];

type EditProfileLeftRailProps = {
  activeTab: EditProfileTabId;
  onTabChange: (tab: EditProfileTabId) => void;
};

export function EditProfileLeftRail({ activeTab, onTabChange }: EditProfileLeftRailProps) {
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
        paddingBottom: 18,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = item.id === activeTab;
        const isEnabled = item.isEnabled;

        return (
          <button
            key={item.id}
            type="button"
            disabled={!isEnabled}
            onClick={() => {
              if (!isEnabled || isActive) {
                return;
              }
              onTabChange(item.id);
            }}
            style={{
              width: 87.15,
              height: 87.15,
              borderRadius: 22,
              backgroundColor: isActive ? "#F58A1F" : "#F1F1F1",
              border: "none",
              padding: 0,
              cursor: isEnabled ? (isActive ? "default" : "pointer") : "not-allowed",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: isActive ? 1 : isEnabled ? 0.85 : 0.6,
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
