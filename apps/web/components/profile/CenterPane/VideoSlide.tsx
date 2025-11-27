"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

import type { ProfileVideoData } from "@/components/profile/ProfilePageClient";

const VideoPlayer = dynamic(() => import("@/components/media/VideoPlayer"), { ssr: false });

type VideosSlideProps = {
  videos?: ProfileVideoData[];
};

const ITEMS_PER_PAGE = 6;

export function VideosSlide({ videos }: VideosSlideProps) {
  const normalizedVideos = useMemo(
    () => (videos ?? []).filter((video) => video?.mediaId && video.url),
    [videos],
  );

  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [normalizedVideos.length]);

  const totalPages = Math.max(1, Math.ceil(normalizedVideos.length / ITEMS_PER_PAGE));
  const startIndex = page * ITEMS_PER_PAGE;
  const pageVideos = normalizedVideos.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const slots = Array.from({ length: ITEMS_PER_PAGE }, (_, index) => pageVideos[index]);

  const showEmptyState = normalizedVideos.length === 0;

  const handleNextPage = () => {
    if (totalPages <= 1) {
      return;
    }
    setPage((prev) => (prev + 1) % totalPages);
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        direction: "rtl",
        fontFamily: "IRANSans, sans-serif",
      }}
    >
      <h1
        style={{
          position: "absolute",
          left: 630,
          top: 35,
          height: 47,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          fontSize: 32,
          fontWeight: 900,
          color: "#000000",
          whiteSpace: "nowrap",
        }}
      >
        ویدئو ها
      </h1>

      {normalizedVideos.length === 0 ? (
        <p
          style={{
            position: "absolute",
            top: 90,
            left: 55,
            margin: 0,
            fontSize: 14,
            color: "#666666",
          }}
        >
          هنوز ویدئویی ثبت نشده است.
        </p>
      ) : null}

      <div
        style={{
          position: "absolute",
          top: 120,
          left: 55,
          width: 680,
          height: 584,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gridTemplateRows: "repeat(2, 1fr)",
          gap: "22px 18px",
        }}
      >
        {slots.map((video, index) => {
          const title = video?.title?.trim() || "ویدئو";
          const badge = video ? `#${startIndex + index + 1}` : "جای خالی";
          const placeholderText = showEmptyState ? "ویدیویی برای نمایش وجود ندارد" : "ویدئو اضافه کنید";
          return (
            <div
              key={`${video?.mediaId ?? "placeholder"}-${index}`}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 12,
                overflow: "hidden",
                position: "relative",
                backgroundColor: "#C89E2B",
              }}
            >
              {video ? (
                <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
                  <VideoPlayer
                    mediaId={video.mediaId}
                    manifestUrl={video.url}
                    playbackKind={video.playbackKind ?? "public-direct"}
                    posterUrl={video.posterUrl ?? undefined}
                    fillParent
                    autoPlayMuted
                    className="h-full"
                  />
                </div>
              ) : (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#FFFFFF",
                    fontSize: 14,
                    fontWeight: 700,
                    backgroundColor: "#C89E2B",
                    zIndex: 1,
                    textAlign: "center",
                    padding: "0 12px",
                  }}
                >
                  {placeholderText}
                </div>
              )}

              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: "100%",
                  height: 190,
                  background: "linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0))",
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              />

              <span
                style={{
                  position: "absolute",
                  bottom: 12,
                  right: 16,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  zIndex: 3,
                }}
              >
                {title}
              </span>

              <span
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 16,
                  color: "#fff",
                  fontSize: 12,
                  opacity: 0.8,
                  zIndex: 3,
                }}
              >
                {badge}
              </span>
            </div>
          );
        })}
      </div>

      <div
        onClick={totalPages > 1 ? handleNextPage : undefined}
        style={{
          position: "absolute",
          left: 797 / 2 - 141 / 2,
          top: 1038 - 290,
          width: 141,
          height: 44,
          borderRadius: 38,
          backgroundColor: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          cursor: totalPages > 1 ? "pointer" : "default",
          fontFamily: "IRANSans, sans-serif",
          color: "#FF7F19",
          fontSize: 15,
          fontWeight: 700,
          opacity: totalPages > 1 ? 1 : 0.5,
        }}
      >
        <span>صفحه بعد</span>
        <span style={{ fontSize: 20, marginBottom: 2 }}>←</span>
      </div>
    </div>
  );
}
