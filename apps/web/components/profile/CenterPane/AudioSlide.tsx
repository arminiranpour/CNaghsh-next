"use client";

import { useEffect, useState } from "react";

const ORANGE = "#F58A1F";
const GRAY = "#7C7C7C";

type Track = {
  id: string;
  label: string;
  duration: string;
};

const TRACKS: Track[] = [
  { id: "en", label: "زبان انگلیسی", duration: "02:25" },
  { id: "tr-lang", label: "زبان ترکی", duration: "02:25" },
  { id: "tr-accent", label: "لهجه ترکی", duration: "02:25" },
];


export function AudioFilesSlide() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0); // 0 تا 1

  useEffect(() => {
    if (!activeId) {
      setProgress(0);
      return;
    }

    const durationMs = 2250; // فقط دمو

    const start = performance.now();

    const frame = (time: number) => {
      const elapsed = time - start;
      const p = Math.min(elapsed / durationMs, 1);
      setProgress(p);

      if (p < 1 && activeId) {
        requestAnimationFrame(frame);
      } else {
        setActiveId(null);
        setProgress(0);
      }
    };

    const id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [activeId]);

  const toggleTrack = (id: string) => {
    setActiveId((current) => (current === id ? null : id));
    setProgress(0);
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
      {/* تیتر اصلی */}
      <h1
        style={{
          position: "absolute",
          left: 545,
          top: 35,
          margin: 0,
          height: 47,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          fontWeight: 900,
          color: "#000",
          whiteSpace: "nowrap",
        }}
      >
        فایل‌های صوتی
      </h1>

      {/* لیست ترک‌ها */}
      <div
        style={{
          position: "absolute",
          top: 150,
          right: 67,
          width: 680,
        }}
      >
        {TRACKS.map((track, index) => {
          const isActive = activeId === track.id;
          const barActiveWidth = isActive ? progress : 0;

          return (
            <div
              key={track.id}
              style={{
                marginBottom: index === TRACKS.length - 1 ? 40 : 60,
              }}
            >
              {/* ردیف عنوان + دکمه پلی/پاوز (بالای نوار) */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "row-reverse",
                  justifyContent: "flex-end",
                  textAlign: "right",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  marginBottom: 10,
                }}
              >
                {/* متن ترک (سمت راست) */}
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#000",
                    whiteSpace: "nowrap",
                  }}
                >
                  {track.label}
                </span>

                {/* دکمه پلی / پاوز (سمت چپ متن) */}
                <button
                  type="button"
                  onClick={() => toggleTrack(track.id)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "999px",
                    border: `2px solid ${isActive ? ORANGE : "#D9D9D9"}`,
                    backgroundColor: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      color: isActive ? ORANGE : GRAY,
                      transform: !isActive ? "translateX(1px)" : undefined,
                    }}
                  >
                    {isActive ? "❚❚" : "▶"}
                  </span>
                </button>
              </div>

              {/* کانتینر نوار ویس دقیقا مثل فیگما */}
              <div
                style={{
                  position: "relative",
                  width: 650,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: "#FFFFFF",
                  border: `1px solid ${isActive ? ORANGE : "#aaaaaa8d"}`,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  paddingInline: 24,
                  marginTop: 20,
                  direction: "ltr", // برای اینکه زمان سمت چپ و نوار درست بچیند
                }}
              >
                {/* باکس زمان 39×24 در ابتدای نوار */}
                <div
                  style={{
                    width: 39,
                    height: 24,
                                       
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    fontWeight: 500,
                    color: isActive ? ORANGE : "#A6A6A6",
                    flexShrink: 0,
                    marginRight: 10,
                    marginLeft: -5,
                  }}
                >
                  {track.duration}
                </div>
{/* ویو ویس */}
<div
  style={{
    position: "relative",
    flex: 1,
    height: 18,
    borderRadius: 999,
    overflow: "hidden",
  }}
>
  {/* پس‌زمینه خاکستری */}
  <div
    style={{
      position: "absolute",
      inset: 0,
      backgroundImage:
        "repeating-linear-gradient(to right, rgba(0,0,0,0.12) 0 2px, transparent 2px 4px)",
    }}
  />

  {/* موج نارنجی — پر شدن از راست → چپ */}
  <div
    style={{
      position: "absolute",
      inset: 0,
      overflow: "hidden",
      display: "flex",
      justifyContent: "flex-end", // مهم
      pointerEvents: "none",
    }}
  >
    <div
      style={{
        width: `${barActiveWidth * 100}%`,
        height: "100%",
        backgroundImage:
          "repeating-linear-gradient(to right, rgba(245,138,31,1) 0 2px, transparent 2px 4px)",
        transition: "width 0.08s linear",
      }}
    />
  </div>  
</div>
              </div>              
            </div>
          );
        })}
        
      </div>
       {/* دکمه صفحه بعد – بدون بُردر، وسط، فلش سمت راست */}
<div
  style={{
    position: "absolute",
    left: (797 / 2) - (141 / 2), // وسط افقی نسبت به عرض 748 کانتینر
    top: 1038 - 290,            // موقعیت دقیق فیگما
    width: 141,
    height: 44,
    borderRadius: 38,
    backgroundColor: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    cursor: "pointer",
    fontFamily: "IRANSans, sans-serif",
    color: "#FF7F19",
    fontSize: 15,
    fontWeight: 700,
  }}
>
  {/* متن سمت چپ */}
  <span>صفحه بعد</span>

  {/* فلش سمت راست ← */}
  <span style={{ fontSize: 20, marginBottom: 2 }}>←</span>
</div>
    </div>
  );
}
