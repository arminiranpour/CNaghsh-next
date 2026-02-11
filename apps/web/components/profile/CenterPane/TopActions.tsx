"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Bookmark, Heart, Share2 } from "lucide-react";

const ORANGE = "#F58A1F";
const GRAY = "#7C7C7C";

type TopActionsProps = {
  canEdit?: boolean;
  onEditClick?: () => void;
  profileId?: string;
  initialSaved?: boolean;
  initialLiked?: boolean;
  initialLikesCount?: number;
  isOwner?: boolean;
};

const numberFormatter = new Intl.NumberFormat("fa-IR", { useGrouping: false });

export function TopActions({
  canEdit,
  onEditClick,
  profileId,
  initialSaved = false,
  initialLiked = false,
  initialLikesCount = 0,
  isOwner = false,
}: TopActionsProps) {
  const [shareActive, setShareActive] = useState(false);
  const [saved, setSaved] = useState(initialSaved);
  const [liked, setLiked] = useState(initialLiked && !isOwner);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isSavePending, setIsSavePending] = useState(false);
  const [isLikePending, setIsLikePending] = useState(false);

  const formattedLikes = useMemo(
    () => numberFormatter.format(Math.max(0, likesCount)),
    [likesCount],
  );

  const handleToggleSave = async () => {
    if (!profileId || isSavePending) {
      return;
    }
    const next = !saved;
    const prevSaved = saved;
    setSaved(next);
    setIsSavePending(true);
    try {
      const response = await fetch("/api/saves/profiles/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      });
      if (!response.ok) {
        throw new Error("REQUEST_FAILED");
      }
      const data = (await response.json()) as { saved: boolean };
      setSaved(Boolean(data.saved));
    } catch (error) {
      setSaved(prevSaved);
    } finally {
      setIsSavePending(false);
    }
  };

  const canLike = Boolean(profileId) && !isOwner;

  const handleLikeToggle = async () => {
    if (!profileId || isLikePending || !canLike) {
      return;
    }
    const prevLiked = liked;
    const prevCount = likesCount;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount((value) => Math.max(0, value + (nextLiked ? 1 : -1)));
    setIsLikePending(true);
    try {
      const response = await fetch("/api/likes/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      });
      if (!response.ok) {
        throw new Error("REQUEST_FAILED");
      }
      const data = (await response.json()) as { likesCount: number; liked: boolean };
      setLikesCount(Math.max(0, data.likesCount ?? 0));
      setLiked(Boolean(data.liked));
    } catch (error) {
      setLiked(prevLiked);
      setLikesCount(prevCount);
    } finally {
      setIsLikePending(false);
    }
  };

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
        gap: 7,
        direction: "ltr",
        zIndex: 10, // مهم: روی اسلاید قرار بگیرد تا کلیک‌ها را بگیرد
      }}
    >
      <button
        type="button"
        onClick={handleToggleSave}
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
        <Bookmark strokeWidth={1.5} className="h-6 w-6" />
      </button>
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
        <Share2 strokeWidth={1.5} className="h-6 w-6" />
      </button>

      <button
        type="button"
        onClick={handleLikeToggle}
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
          cursor: canLike ? "pointer" : "default",
          color: liked ? ORANGE : GRAY,
          transition: "color 0.15s ease",
        }}
        disabled={!canLike}
      >
        <Heart strokeWidth={1.5} className="h-6 w-6" />
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
