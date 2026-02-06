"use client";

import Image from "next/image";

export type EditProfileTabId =
  | "portfolio"
  | "messages"
  | "saved"
  | "challenges"
  | "courses"
  | "subscription";

const LEFT_PANE_ICON_BASE = "/cineflash/profile/editProfile/leftPane";

const NAV_ITEMS: {
  id: EditProfileTabId;
  label: string;
  iconSrcActive: string;
  iconSrcInactive: string;
  isEnabled: boolean;
}[] = [
  {
    id: "portfolio",
    label: "پورتفولیو",
    iconSrcActive: `${LEFT_PANE_ICON_BASE}/portfolio-white.png`,
    iconSrcInactive: `${LEFT_PANE_ICON_BASE}/portfolio-gray.png`,
    isEnabled: true,
  },
  {
    id: "messages",
    label: "صندوق پیام",
    iconSrcActive: `${LEFT_PANE_ICON_BASE}/message-white.png`,
    iconSrcInactive: `${LEFT_PANE_ICON_BASE}/message-gray.png`,
    isEnabled: false,
  },
  {
    id: "saved",
    label: "آرشیو",
    iconSrcActive: `${LEFT_PANE_ICON_BASE}/saved-white.png`,
    iconSrcInactive: `${LEFT_PANE_ICON_BASE}/saved-gray.png`,
    isEnabled: true,
  },
  {
    id: "challenges",
    label: "چالش و رویداد",
    iconSrcActive: `${LEFT_PANE_ICON_BASE}/challenges-white.png`,
    iconSrcInactive: `${LEFT_PANE_ICON_BASE}/challenges-gray.png`,
    isEnabled: false,
  },
  {
    id: "courses",
    label: "کلاس و آموزش",
    iconSrcActive: `${LEFT_PANE_ICON_BASE}/courses-white.png`,
    iconSrcInactive: `${LEFT_PANE_ICON_BASE}/courses-gray.png`,
    isEnabled: true,
  },
  {
    id: "subscription",
    label: "اشتراک",
    iconSrcActive: `${LEFT_PANE_ICON_BASE}/subscription-white.png`,
    iconSrcInactive: `${LEFT_PANE_ICON_BASE}/subscription-gray.png`,
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
        const iconSrc = isActive ? item.iconSrcActive : item.iconSrcInactive;

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
                src={iconSrc}
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
