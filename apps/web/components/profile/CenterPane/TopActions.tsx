"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

const ORANGE = "#F58A1F";
const GRAY = "#7C7C7C";

type ActionId = "share";

type TopActionsProps = {
  canEdit?: boolean;
  onEditClick?: () => void;
  profileId?: string;
  initialSaved?: boolean;
  initialLikesCount?: number;
};

const ICONS: Record<ActionId, JSX.Element> = {
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

const numberFormatter = new Intl.NumberFormat("fa-IR", { useGrouping: false });

export function TopActions({
  canEdit,
  onEditClick,
  profileId,
  initialSaved = false,
  initialLikesCount = 0,
}: TopActionsProps) {
  const [shareActive, setShareActive] = useState(false);
  const [saved, setSaved] = useState(initialSaved);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isPending, setIsPending] = useState(false);

  const formattedLikes = useMemo(
    () => numberFormatter.format(Math.max(0, likesCount)),
    [likesCount],
  );

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
      <button
        type="button"
        onClick={() => setShareActive((prev) => !prev)}
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
          color: shareActive ? ORANGE : GRAY,
          transition: "color 0.15s ease",
        }}
      >
        {ICONS.share}
      </button>

      <button
        type="button"
        onClick={async () => {
          if (!profileId || isPending) {
            return;
          }
          const next = !saved;
          const prevSaved = saved;
          const prevCount = likesCount;
          setSaved(next);
          setLikesCount((value) => Math.max(0, value + (next ? 1 : -1)));
          setIsPending(true);
          try {
            const response = await fetch("/api/saves/profiles/toggle", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ profileId }),
            });
            if (!response.ok) {
              throw new Error("REQUEST_FAILED");
            }
            const data = (await response.json()) as { saved: boolean; likesCount: number };
            setSaved(Boolean(data.saved));
            setLikesCount(Math.max(0, data.likesCount ?? 0));
          } catch (error) {
            setSaved(prevSaved);
            setLikesCount(prevCount);
          } finally {
            setIsPending(false);
          }
        }}
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
          cursor: profileId ? "pointer" : "default",
          color: saved ? ORANGE : GRAY,
          transition: "color 0.15s ease",
        }}
      >
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 21s-6.7-4.35-9.33-8.7C.33 9.36 2.08 5 6 5c2.2 0 3.67 1.33 4.5 2.67C11.33 6.33 12.8 5 15 5c3.92 0 5.67 4.36 3.33 7.3C18.7 16.65 12 21 12 21z"
            stroke="currentColor"
            strokeWidth="2"
            fill={saved ? "currentColor" : "none"}
          />
        </svg>
      </button>

      <span
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: GRAY,
        }}
      >
        {formattedLikes}
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
