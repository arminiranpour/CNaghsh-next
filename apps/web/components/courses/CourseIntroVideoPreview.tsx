"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Play } from "lucide-react";
import { iransans } from "@/app/fonts";

import type { MediaPlaybackKind } from "@/lib/media/urls";
import { cn } from "@/lib/utils";

const VideoPlayer = dynamic(() => import("@/components/media/VideoPlayer"), { ssr: false });

type CourseIntroVideoPreviewProps = {
  mediaId?: string | null;
  title: string;
  videoUrl: string | null;
  posterUrl: string | null;
  playbackKind?: MediaPlaybackKind;
  className?: string;
  compact?: boolean;
};

export function CourseIntroVideoPreview({
  mediaId,
  title,
  videoUrl,
  posterUrl,
  playbackKind = "public-direct",
  className,
  compact = false,
}: CourseIntroVideoPreviewProps) {
  const [showPlayer, setShowPlayer] = useState(false);
  const canPlay = Boolean(videoUrl);

  return (
    <div
      className={cn(
        `${iransans.className} relative w-full bg-black`,
        compact ? "h-[250px]" : "aspect-video",
        className
      )}
    >
      {showPlayer && canPlay ? (
        <VideoPlayer
          mediaId={mediaId ?? "unknown"}
          manifestUrl={videoUrl ?? undefined}
          playbackKind={playbackKind}
          posterUrl={posterUrl ?? undefined}
          autoPlayMuted
          fillParent
          className="h-full"
        />
      ) : posterUrl ? (
        <img src={posterUrl} alt={title} className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full bg-muted" />
      )}
      {!showPlayer ? (
        <button
          type="button"
          onClick={() => {
            if (canPlay) {
              setShowPlayer(true);
            }
          }}
          disabled={!canPlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 transition disabled:cursor-not-allowed disabled:bg-black/40"
          aria-label="Play intro video"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition hover:scale-110 hover:bg-white disabled:hover:scale-100">
            <Play className="h-8 w-8 fill-primary text-primary" style={{ marginLeft: "4px" }} />
          </div>
        </button>
      ) : null}
      {!canPlay && !showPlayer ? (
        <div className="absolute inset-x-0 bottom-3 flex justify-center">
          <span className="rounded-full bg-black/70 px-3 py-1 text-xs text-white">
            Video is processing
          </span>
        </div>
      ) : null}
    </div>
  );
}
