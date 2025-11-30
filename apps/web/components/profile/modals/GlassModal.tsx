"use client";

import { useEffect, type ReactNode } from "react";

export type GlassModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  height?: number;
};

export default function GlassModal({
  open,
  onClose,
  children,
  width = 435,
  height = 500,
}: GlassModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/10 backdrop-blur-sm px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="
          relative max-h-[90vh] max-w-[95vw]
          overflow-hidden rounded-[32px]
          border border-white/25
          bg-white/10
          backdrop-blur-xl
          shadow-[0_24px_80px_rgba(0,0,0,0.55)]
        "
        style={{ width, height }}
        onClick={(event) => event.stopPropagation()}
        dir="rtl"
      >
        <div
          className="
            flex h-full w-full flex-col items-center gap-8 overflow-y-auto
            px-12 py-10 text-black
            bg-gradient-to-b from-white/30 via-white/10 to-white/5
          "
        >
          {children}
        </div>
      </div>
    </div>
  );
}
