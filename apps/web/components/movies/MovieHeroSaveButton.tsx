"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";

import { cn } from "@/lib/utils";

type MovieHeroSaveButtonProps = {
  className?: string;
  movieId: string;
  initialSaved?: boolean;
};

export function MovieHeroSaveButton({
  className,
  movieId,
  initialSaved = false,
}: MovieHeroSaveButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, setIsPending] = useState(false);

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={async () => {
        if (isPending) {
          return;
        }
        const next = !saved;
        const previous = saved;
        setSaved(next);
        setIsPending(true);
        try {
          const response = await fetch("/api/saves/movies/toggle", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ movieId }),
          });
          if (!response.ok) {
            throw new Error("REQUEST_FAILED");
          }
          const data = (await response.json()) as { saved?: boolean };
          setSaved(Boolean(data.saved));
        } catch (error) {
          setSaved(previous);
        } finally {
          setIsPending(false);
        }
      }}
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
