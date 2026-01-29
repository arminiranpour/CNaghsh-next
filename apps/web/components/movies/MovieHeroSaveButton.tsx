"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";

import { cn } from "@/lib/utils";

type MovieHeroSaveButtonProps = {
  className?: string;
};

export function MovieHeroSaveButton({ className }: MovieHeroSaveButtonProps) {
  const [saved, setSaved] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setSaved((prev) => !prev)}
      className={cn("flex items-center gap-[10px] text-[20px] font-bold text-white", className)}
      dir="rtl"
    >
      <Bookmark
        className={cn(
          "h-[42px] w-[32px] text-white",
          saved ? "fill-white" : "fill-transparent",
        )}
        strokeWidth={1}
      />
      <span className="leading-[30px]">بعدا می‌بینم</span>

    </button>
  );
}
