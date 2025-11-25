"use client";

import type { CSSProperties } from "react";

type GallerySlideProps = {
  images?: { url: string }[];
};

const SLOTS = [
  { left: 2, top: 0, width: 213, height: 216, color: "#FFCB1F" },
  { left: 226, top: 0, width: 270, height: 216, color: "#D79333" },
  { left: 509, top: 0, width: 173, height: 314, color: "#D8A35A" },
  { left: 0, top: 225, width: 173, height: 185, color: "#F36B08" },
  { left: 186, top: 225, width: 310, height: 141, color: "#FF9A22" },
  { left: 0, top: 419, width: 173, height: 165, color: "#D9AA63" },
  { left: 186, top: 381, width: 310, height: 202, color: "#CF8F30" },
  { left: 509, top: 337, width: 173, height: 250, color: "#FFC51D" },
] as const;

function slotStyle(
  slot: (typeof SLOTS)[number],
  image?: { url: string },
): CSSProperties {
  return {
    position: "absolute",
    left: slot.left,
    top: slot.top,
    width: slot.width,
    height: slot.height,
    borderRadius: 12,
    backgroundColor: slot.color,
    overflow: "hidden",
    ...(image
      ? {
          backgroundImage: `url(${image.url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : {}),
  };
}

export function GallerySlide({ images }: GallerySlideProps) {
  const normalizedImages = images ?? [];

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
          left: 655,
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
       تصاویر
      </h1>
    <div
        style={{
          position: "absolute",
          left: 55,
          top: 120,
          width: 682,
          height: 587,
          borderRadius: 24,
          backgroundColor: "#FFFFFF",
        }}
      >
        {SLOTS.map((slot, index) => (
          <div
            key={`${slot.left}-${slot.top}-${slot.width}-${slot.height}`}
            style={slotStyle(slot, normalizedImages[index])}
          />
        ))}
      </div>
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
