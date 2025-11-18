"use client";

import { useEffect, useRef, useState } from "react";

type LoginCharacterProps = {
  isPasswordPhase: boolean;
};

const FRAME_COUNT = 68;

export function LoginCharacter({ isPasswordPhase }: LoginCharacterProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [frameIndex, setFrameIndex] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleMouseMove(e: MouseEvent) {
      if (isPasswordPhase) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;

      let angleRad = Math.atan2(dy, dx);
      let angleDeg = 90 + (angleRad * 180) / Math.PI;
      if (angleDeg < 0) angleDeg += 360;

      let index = Math.round((angleDeg / 360) * FRAME_COUNT);
      if (index < 1) index = 1;
      if (index > FRAME_COUNT) index = FRAME_COUNT;

      setFrameIndex(index);
    }

    function handleMouseLeavePage() {
      if (isPasswordPhase) return;
      setFrameIndex(null); // back to default frame
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeavePage);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeavePage);
    };
  }, [isPasswordPhase]);

  let src = "/character/default.webp";

  if (isPasswordPhase) {
    src = "/character/password.webp";
  } else if (frameIndex !== null) {
    src = `/character/${frameIndex}.webp`;
  }

  return (
    <div
      ref={containerRef}
      className="relative w-[500px] h-full md:w-[500px] md:h-full"    >
      <img
        src={src}
        alt="login character"
        className="w-full h-full object-contain select-none pointer-events-none"
        draggable={false}
      />
    </div>
  );
}
