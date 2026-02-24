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
const grayFilter =
  "brightness(0) saturate(100%) invert(39%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(90%)";
const whiteFilter = "brightness(0) invert(1)";

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
    <>
      <div className="hidden md:block">
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
      </div>

      <nav
        aria-label="ویرایش پروفایل"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 w-full h-[100px] bg-white border-t border-black/10 pb-[env(safe-area-inset-bottom)] flex flex-col justify-end overflow-hidden"
      >
        <div className="flex w-full px-4 py-[9px]">
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === activeTab;
            const isEnabled = item.isEnabled;

            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                disabled={!isEnabled}
                onClick={() => {
                  if (!isEnabled || isActive) {
                    return;
                  }
                  onTabChange(item.id);
                }}
                className="grow basis-0 w-full flex flex-col items-center justify-between h-14 rounded-[70px] transition-colors"
                style={{
                  backgroundColor: isActive ? "#FF7F19" : "transparent",
                  cursor: isEnabled ? "pointer" : "not-allowed",
                  opacity: isEnabled ? 1 : 0.6,
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
                    src={item.iconSrcInactive}
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

      <div className="h-[100px] md:hidden" aria-hidden="true" />
    </>
  );
}
