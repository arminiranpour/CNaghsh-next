import { useMemo, useRef, useState } from "react";
import {
  WaveformAudioPlayer,
  type WaveformAudioPlayerHandle,
} from "@/components/ui/WaveformAudioPlayer";

type AudioEntry = {
  mediaId: string;
  url: string;
  title?: string | null;
  duration?: number | null;
};

type AudioSlideProps = {
  voices?: AudioEntry[];
};

function AudioRow({ voice, index }: { voice: AudioEntry; index: number }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const waveformRef = useRef<WaveformAudioPlayerHandle | null>(null);

  const title = voice.title?.trim() || "فایل صوتی بدون عنوان";
  const badge = `#${index + 1}`;
  const durationLabel =
    typeof voice.duration === "number" && Number.isFinite(voice.duration)
      ? `${Math.round(voice.duration)} ثانیه`
      : null;

  const handleToggle = () => {
    waveformRef.current?.togglePlay();
  };

  return (
    <div
      style={{
        width: "100%",
        borderRadius: 14,
        backgroundColor: "#FFFFFF",
        padding: "14px 18px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                fontWeight: 700,
                fontSize: 16,
                // title color: black normally, FF7F19 when playing
                color: isPlaying ? "#FF7F19" : "#000000",
              }}
            >
              {title}
            </span>
            {durationLabel ? (
              <span style={{ fontSize: 12, color: "#6B7280" }}>{durationLabel}</span>
            ) : null}
          </div>
        </div>

        {/* play button beside title */}
        <button
          type="button"
          onClick={handleToggle}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "none",
            // button color: B1ADAD normally, FF7F19 when playing
            backgroundColor: isPlaying ? "#FF7F19" : "#B1ADAD",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {isPlaying ? (
            <div style={{ display: "flex", gap: 4 }}>
              <span style={{ width: 3, height: 14, backgroundColor: "#FFFFFF" }} />
              <span style={{ width: 3, height: 14, backgroundColor: "#FFFFFF" }} />
            </div>
          ) : (
            <span
              style={{
                marginLeft: 2,
                width: 0,
                height: 0,
                borderTop: "7px solid transparent",
                borderBottom: "7px solid transparent",
                borderLeft: "11px solid #FFFFFF",
              }}
            />
          )}
        </button>
      </div>

<div
  style={{
    borderRadius: "68px",
    border: "1px solid #E5E7EB",
    padding: 10,
  }}
>
  <WaveformAudioPlayer
    ref={waveformRef}
    src={voice.url}
    onPlayStateChange={setIsPlaying}
  />
</div>

    </div>
  );
}

export function AudioSlide({ voices }: AudioSlideProps) {
  const normalized = useMemo(
    () => (voices ?? []).filter((voice) => voice && voice.mediaId && voice.url),
    [voices],
  );

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
      {/* ... your header code stays the same ... */}

      {normalized.length === 0 ? (
        <p
          style={{
            position: "absolute",
            top: 110,
            left: 55,
            margin: 0,
            fontSize: 14,
            color: "#666666",
          }}
        >
          فایل صوتی ثبت نشده است.
        </p>
      ) : (
        <div
          style={{
            position: "absolute",
            top: 120,
            left: 55,
            width: 680,
            height: 620,
            display: "flex",
            flexDirection: "column",
            gap: 18,
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          {normalized.map((voice, index) => (
            <AudioRow key={`${voice.mediaId}-${index}`} voice={voice} index={index} />
          ))}
        </div>
      )}

      <div
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
          cursor: normalized.length > 1 ? "pointer" : "default",
          fontFamily: "IRANSans, sans-serif",
          color: "#FF7F19",
          fontSize: 15,
          fontWeight: 700,
          opacity: normalized.length > 1 ? 1 : 0.5,
        }}
      >
        <span>صفحه بعد</span>
        <span style={{ fontSize: 20, marginBottom: 2 }}>←</span>
      </div>
    </div>
  );
}
