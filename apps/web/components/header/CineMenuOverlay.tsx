"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { iransans } from "@/app/fonts";


type CineMenuOverlayProps = {
  open: boolean;
  onClose: () => void;
};
type MenuItem = {
  label: string;
  href: string;
  iconSrc: string;
  iconHoverSrc: string; 
};
const rightItems: MenuItem[] = [
  { label: "مقالات", href: "/articles", iconSrc: "/cineflash/home/Hamberger Menu/resume_9564228.png",iconHoverSrc: "/cineflash/home/Hamberger Menu/resume_9564227.png",},
  { label: "قوانین", href: "/rules", iconSrc: "/cineflash/home/Hamberger Menu/help_16393456.png" ,iconHoverSrc: "/cineflash/home/Hamberger Menu/help_16393455.png"},
  { label: "ارتباط با ما", href: "/contact", iconSrc: "/cineflash/home/Hamberger Menu/contact.png" ,iconHoverSrc: "/cineflash/home/Hamberger Menu/podcast_black.png"},
  { label: "درباره سی‌نقش", href: "/about", iconSrc: "/cineflash/home/Hamberger Menu/about_12180739.png" ,iconHoverSrc: "/cineflash/home/Hamberger Menu/about_12180738.png"},
];

const leftItems: MenuItem[] = [
  { label: "پادکست سی‌نقش", href: "/podcast", iconSrc: "/cineflash/home/Hamberger Menu/vecteezy_podcast-line-icons-collection-illustration_55791644 [Converted].png" ,iconHoverSrc: "/cineflash/home/Hamberger Menu/podcast_black.png"},
  { label: "کتاب", href: "/books", iconSrc: "/cineflash/home/Hamberger Menu/book_151456.png" ,iconHoverSrc: "/cineflash/home/Hamberger Menu/book_151455.png"},
  { label: "فیلم", href: "/movies", iconSrc: "/cineflash/home/Hamberger Menu/film_1101794.png" ,iconHoverSrc: "/cineflash/home/Hamberger Menu/film_1101793.png"},
  { label: "تئاتر", href: "/theatre", iconSrc: "/cineflash/home/Hamberger Menu/theater_1778558.png" ,iconHoverSrc: "/cineflash/home/Hamberger Menu/theater_1778557.png"},
  { label: "مونولوگ", href: "/monologue", iconSrc: "/cineflash/home/Hamberger Menu/psychologist_1084208.png" ,iconHoverSrc: "/cineflash/home/Hamberger Menu/psychologist_1084207.png"},
];

export function CineMenuOverlay({ open, onClose }: CineMenuOverlayProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
  if (!open) return;

  const handleClickOutside = (event: MouseEvent) => {
    if (!menuRef.current) return;
    if (!menuRef.current.contains(event.target as Node)) {
      onClose();
    }
  };

  document.addEventListener("click", handleClickOutside);
  return () => document.removeEventListener("click", handleClickOutside);
}, [open, onClose]);


  if (!open) return null;

  return (
    // absolute = positioned relative to the page scroll,
    // NOT full-screen fixed overlay
    <div
      dir="rtl"
      className="
        absolute
        left-1/2
        top-[180px]
        -translate-x-1/2
        z-[70]
      "
     style={{
     backgroundImage:"url('/cineflash/home/Hamberger Menu/Hamburger Menu BG.png')",

  }}
    >
      <div 
        ref={menuRef}
        className="mx-auto w-[1150px] max-w-[95vw] h-[530px] rounded-[40px] bg-[#2F3439]/95 text-white shadow-[0_18px_60px_rgba(0,0,0,0.55)]">
        {/* Menu content */}
<div className={`${iransans.className} grid grid-cols-1 gap-y-10 px-28 py-14 md:grid-cols-2 md:gap-x-28`}>
  {/* LEFT column */}
  <div className="flex flex-col gap-6">
    {leftItems.map((item) => (
      <Link key={item.href} href={item.href} onClick={onClose}>
        <div className="group flex items-center gap-3 border-b border-white/20 py-3 text-lg cursor-pointer">
            {/* ICON WRAPPER — keeps both icons in the same spot */}
            <div className="relative w-[19px] h-[19px]">
            {/* Default Icon (white) */}
            <Image
                src={item.iconSrc}
                alt=""
                fill
                className="object-contain group-hover:opacity-0 transition-opacity duration-150"
                unoptimized
            />

            {/* Hover Icon (black) */}
            <Image
                src={item.iconHoverSrc}
                alt=""
                fill
                className="object-contain opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                unoptimized
            />
            </div>
            {/* TEXT */}
              <span className="font-semibold transition-colors duration-200 group-hover:text-[#FF7F19]">
                {item.label}
              </span>
        </div>
      </Link>
    ))}
  </div>

  {/* RIGHT column */}
  <div className="flex flex-col gap-6">
    {rightItems.map((item) => (
      <Link key={item.href} href={item.href} onClick={onClose}>
        <div className="group flex items-center gap-3 border-b border-white/20 py-3 text-lg cursor-pointer">
            {/* ICON WRAPPER — keeps both icons in the same spot */}
            <div className="relative w-[19px] h-[19px]">
            {/* Default Icon (white) */}
            <Image
                src={item.iconSrc}
                alt=""
                fill
                className="object-contain group-hover:opacity-0 transition-opacity duration-150"
                unoptimized
            />

            {/* Hover Icon (black) */}
            <Image
                src={item.iconHoverSrc}
                alt=""
                fill
                className="object-contain opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                unoptimized
            />
            </div>
            {/* TEXT */}
              <span className="font-semibold transition-colors duration-200 group-hover:text-[#FF7F19]">
                {item.label}
              </span>
        </div>
      </Link>
    ))}
  </div>
</div>

      </div>
    </div>
  );
}
