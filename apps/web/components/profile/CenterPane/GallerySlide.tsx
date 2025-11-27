"use client";

import { useState } from "react";
import Image from "next/image";
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

export function GallerySlide({ images }: GallerySlideProps) {
  const normalizedImages = images ?? [];

  // index of opened image in lightbox, or null if closed
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

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
      {/* Title */}
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

      {/* Gallery Container */}
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
        {SLOTS.map((slot, index) => {
          const image = normalizedImages[index];

          return (
            <div
              key={index}
              onClick={
                image ? () => setActiveIndex(index) : undefined
              }
              style={{
                position: "absolute",
                left: slot.left,
                top: slot.top,
                width: slot.width,
                height: slot.height,
                borderRadius: 12,
                backgroundColor: slot.color,
                overflow: "hidden",
                cursor: image ? "pointer" : "default",
              }}
            >
              {image && (
                <Image
                  src={image.url}
                  alt=""
                  fill
                  style={{
                    objectFit: "cover",
                    width: "100%",
                    height: "100%",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Next Page Button */}
      <div
        style={{
          position: "absolute",
          left: (797 / 2) - (141 / 2),
          top: 1038 - 290,
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
        <span>صفحه بعد</span>
        <span style={{ fontSize: 20, marginBottom: 2 }}>←</span>
      </div>

      {/* Lightbox overlay */}
      {activeIndex !== null && normalizedImages[activeIndex] && (
        <div
          onClick={() => setActiveIndex(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.75)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Stop click from bubbling when clicking on the image / close button */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "80vw",
              height: "80vh",
              maxWidth: 900,
              maxHeight: 900,
            }}
          >
            <Image
              src={normalizedImages[activeIndex].url}
              alt=""
              fill
              style={{
                objectFit: "contain",
              }}
            />

            {/* Close button */}
            <button
              type="button"
              onClick={() => setActiveIndex(null)}
              style={{
                position: "absolute",
                top: 16,
                left: 16,
                width: 36,
                height: 36,
                borderRadius: "999px",
                border: "none",
                backgroundColor: "rgba(0,0,0,0.6)",
                color: "#fff",
                fontSize: 18,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
