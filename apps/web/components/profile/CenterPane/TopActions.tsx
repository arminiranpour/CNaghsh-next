"use client";

import Image from "next/image";
import { useState } from "react";

const ORANGE = "#F58A1F";
const GRAY = "#7C7C7C";

type ActionId = "share" | "favorite";

type TopActionsProps = {
  canEdit?: boolean;
  onEditClick?: () => void;
};

const ICONS: Record<ActionId, JSX.Element> = {
  favorite: (
    <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21s-6.7-4.35-9.33-8.7C.33 9.36 2.08 5 6 5c2.2 0 3.67 1.33 4.5 2.67C11.33 6.33 12.8 5 15 5c3.92 0 5.67 4.36 3.33 7.3C18.7 16.65 12 21 12 21z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  ),
  share: (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"
        stroke="currentColor"
        strokeWidth="2"
      />
      <polyline
        points="16 6 12 2 8 6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <line
        x1="12"
        y1="2"
        x2="12"
        y2="15"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  ),
};

export function TopActions({ canEdit, onEditClick }: TopActionsProps) {
  const [activeAction, setActiveAction] = useState<ActionId | null>(null);

  return (
    <div
      style={{
        position: "absolute",
        left: 32, // دقیقا پوزیشن قبلی
        top: 18,
        width: 136,
        height: 23,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        direction: "ltr",
        zIndex: 10, // مهم: روی اسلاید قرار بگیرد تا کلیک‌ها را بگیرد
      }}
    >
      {(["share", "favorite"] as ActionId[]).map((id) => {
        const isActive = id === activeAction;

        return (
          <button
            key={id}
            type="button"
            onClick={() => setActiveAction(isActive ? null : id)}
            style={{
              width: 25,
              height: 25,
              padding: 0,
              margin: 0,
              border: "none",
              backgroundColor: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: isActive ? ORANGE : GRAY,
              transition: "color 0.15s ease",
            }}
          >
            {ICONS[id]}
          </button>
        );
      })}

      <span
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: GRAY,
        }}
      >
        ۲۵۳۲
      </span>

      {canEdit ? (
        <button
          type="button"
          onClick={() => onEditClick?.()}
          style={{
            width: 25,
            height: 25,
            padding: 0,
            margin: 0,
            border: "none",
            backgroundColor: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Image
            src="/cineflash/profile/edit.png"
            alt="ویرایش پروفایل"
            width={16}
            height={16}
          />
        </button>
      ) : null}
    </div>
  );
}
