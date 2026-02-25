"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { MoviesFilterSidebar } from "@/app/(public)/movies/_components/movies-filter-sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MovieFiltersResponsiveProps = {
  genres: Array<{ id: string; slug: string; nameFa: string; nameEn: string }>;
  countries: string[];
  ageRanges: string[];
  yearMin: number;
  yearMax: number;
  className?: string;
};

export function MovieFiltersResponsive({
  genres,
  countries,
  ageRanges,
  yearMin,
  yearMax,
  className,
}: MovieFiltersResponsiveProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    if (open) {
      window.addEventListener("keydown", handleKey);
    }
    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 1024px)");
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    if (media.matches) setOpen(false);
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  return (
    <div className={cn("w-full", className)} dir="rtl">
      <div className="lg:hidden">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-center rounded-2xl border-[#E5E5E5] bg-white px-4 py-3 text-base font-bold text-black shadow-[0_10px_40px_-24px_rgba(0,0,0,0.35)]"
          onClick={() => setOpen(true)}
        >
          فیلترها
        </Button>
      </div>

      <div className="hidden lg:block">
        <MoviesFilterSidebar
          genres={genres}
          countries={countries}
          ageRanges={ageRanges}
          yearMin={yearMin}
          yearMax={yearMax}
          className={className}
        />
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="بستن فیلترها"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 max-h-[80dvh] overflow-y-auto rounded-t-2xl bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-base font-bold text-black">فیلترها</span>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E5E5] text-black"
                onClick={() => setOpen(false)}
                aria-label="بستن"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <MoviesFilterSidebar
              genres={genres}
              countries={countries}
              ageRanges={ageRanges}
              yearMin={yearMin}
              yearMax={yearMax}
              className={cn(
                className,
                "w-full min-h-0 rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br-2xl px-4 py-4 shadow-none",
              )}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
