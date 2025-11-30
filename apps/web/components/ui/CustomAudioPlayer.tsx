// components/CustomAudioPlayer.tsx
"use client";

import { useRef, useState } from "react";

type CustomAudioPlayerProps = {
  src: string;
};

export function CustomAudioPlayer({ src }: CustomAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

const handleLoadedMetadata = () => {
  const audio = audioRef.current;
  if (!audio) return;
  // keep as a fallback
  setDuration(audio.duration || 0);
};
const handleTimeUpdate = () => {
  const audio = audioRef.current;
  if (!audio) return;

  const ct = audio.currentTime || 0;
  const dur = audio.duration || 0;

  setCurrentTime(ct);
  // keep duration in sync as the browser learns it
  if (dur > 0) {
    setDuration(dur);
  }
};

  const formatTime = (value: number) => {
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    const mm = String(minutes).padStart(2, "0");
    const ss = String(seconds).padStart(2, "0");
    return `${mm}:${ss}`;
  };

const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="relative flex items-center">
        <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        style={{ display: "none" }}
        />


      <button
        type="button"
        onClick={togglePlay}
        className="mr-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#B0A9A8]"
      >
        <span
          className="ml-[2px]"
          style={{
            width: 0,
            height: 0,
            borderTop: "6px solid transparent",
            borderBottom: "6px solid transparent",
            borderLeft: isPlaying ? "0 solid transparent" : "10px solid white",
            borderRight: isPlaying ? "0 solid transparent" : "0 solid transparent",
          }}
        />
        {isPlaying ? (
          <span className="absolute h-3 w-3" />
        ) : null}
      </button>

      <div className="relative flex-1">
        <div className="flex h-14 items-center rounded-full border border-white">
          <div className="flex h-full w-28 items-center justify-center bg-white">
<span className="text-lg text-[#B0A9A8]">
  {formatTime(currentTime)}
</span>
          </div>

            {/* progress bar */}
<div className="mx-4 flex-1">
  <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#D1D5DB]">
    <div
      className="h-full rounded-full bg-white"
      style={{ width: `${progress}%` }}
    />
  </div>
</div>


        </div>
      </div>
    </div>
  );
}
