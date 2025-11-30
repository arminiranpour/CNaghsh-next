"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export type SelectRoleModalProps = {
  open: boolean;
  onClose: () => void;
  onContinue?: () => void;
  actorName?: string;
};

const DEFAULT_ROLES = [
  "نقش مکمل سریال درام خانوادگی",
  "نقش مکمل فیلم سینمایی",
  "نقش اصلی تله‌فیلم",
];

export function SelectRoleModal({
  open,
  onClose,
  onContinue,
  actorName,
}: SelectRoleModalProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(2);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="
        fixed inset-0 z-[80] flex items-center justify-center
        bg-black/10 backdrop-blur-sm
        px-4
      "
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="
          relative h-[500px] w-[435px] max-h-[90vh] max-w-[95vw]
          overflow-hidden rounded-[32px]
          border border-white/25
          bg-white/10
          backdrop-blur-xl
          shadow-[0_24px_80px_rgba(0,0,0,0.55)]
        "
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >


        <div
          className="
            flex h-full w-full flex-col
            items-stretch
            gap-6
            overflow-y-auto
            px-10 py-10
            text-black
            bg-gradient-to-b from-white/40 via-white/15 to-white/5
            font-iransans
          "
        >
          <div className="mb-4 text-center space-y-2">
            <p className="text-[20px] font-bold leading-[32px]">چه تصمیم جالبی!</p>
            <p className="text-[16px] leading-[30px] text-black/80">
              برای کدوم نقش این بازیگر رو انتخاب کردی؟

            </p>
          </div>

          <div className="flex flex-col gap-3">
            {DEFAULT_ROLES.map((role, index) => {
              const selected = selectedIndex === index;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  className={`
                    flex w-full items-center justify-between
                    rounded-full px-6 py-3 text-[14px]
                    transition
                    ${
                      selected
                        ? "bg-[#FF7F19] text-white shadow-[0_6px_18px_rgba(255,127,25,0.45)]"
                        : "bg-[#F5F5F5] text-black/90 hover:bg-[#EDEDED]"
                    }
                  `}
                >
                  <span className="truncate text-right">{role}</span>
                  <span
                    className={`
                      ml-2 h-3 w-3 rounded-full
                      ${selected ? "bg-white" : "bg-[#FF7F19]/70"}
                    `}
                  />
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="mt-3 flex items-center justify-center gap-2 text-[14px] font-semibold text-[#FF7F19]"
          >
            <span className="text-[18px] leading-none">+</span>
            <span>اضافه کردن نقش</span>
          </button>


                    <p className="mt-4 text-[12px] leading-[20px] text-black/60 text-right">
می‌دونی که! این اطلاعات پیش ما محفوظه و قرار نیست با بازیگر یا هیچکس دیگه در میون گذاشته بشه.
          </p>

          <button
            type="button"
            className="
              mt-6 h-[44px] w-[160px]
              self-center
              rounded-full
              bg-[#FF7F19] text-[16px] font-bold text-white
              shadow-[0_8px_20px_rgba(0,0,0,0.25)]
              transition hover:bg-[#ff973f]
            "
            onClick={() => onContinue?.()}
          >
            بعدی
          </button>
        </div>
      </div>
    </div>
  );
}
