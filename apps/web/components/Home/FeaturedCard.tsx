"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Card from "./Card";

export default function FeaturedCard() {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const demoActors = [
    {
      name: "نام و نام خانوادگی",
      age: 32,
      level: "پیشرفته",
      rating: 2539,
      avatarSrc: "/cineflash/home/Bazigaran/ActorDemo.jpg",
    },
    {
      name: "کاربر نمونه دوم",
      age: 27,
      level: "حرفه‌ای",
      rating: 2711,
      avatarSrc: "/cineflash/home/Bazigaran/ActorDemo.jpg",
    },
    {
      name: "نام و نام خانوادگی",
      age: 32,
      level: "پیشرفته",
      rating: 2539,
      avatarSrc: "/cineflash/home/Bazigaran/ActorDemo.jpg",
    },
    {
      name: "کاربر نمونه دوم",
      age: 27,
      level: "حرفه‌ای",
      rating: 2711,
      avatarSrc: "/cineflash/home/Bazigaran/ActorDemo.jpg",
    },
    {
      name: "کاربر نمونه پنجم",
      age: 29,
      level: "پیشرفته",
      rating: 2890,
      avatarSrc: "/cineflash/home/Bazigaran/ActorDemo.jpg",
    },
  ];

  const CARD_WIDTH = 280; // width of each card
  const SCROLL_AMOUNT = CARD_WIDTH; // scroll by one card

  const scroll = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;

    container.scrollBy({
      left: direction === "left" ? -SCROLL_AMOUNT : SCROLL_AMOUNT,
      behavior: "smooth",
    });
  };

  return (
    <div
      className="relative mt-[40px] h-[372px] w-full"
      dir="rtl"
    >
      {/* inner wrapper: centers the whole carousel and limits it to 4 cards width */}
      <div className="relative mx-auto h-full max-w-[1120px] flex items-center justify-center">
        {/* Left arrow (visually “next” in RTL) */}
        <button
          type="button"
          onClick={() => scroll("left")}
          className="
            absolute left-[-40px] top-1/2 z-10 -translate-y-1/2
            flex h-10 w-10 items-center justify-center
            rounded-full bg-white/90 text-black shadow
            hover:bg-white
          "
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Right arrow (visually “prev” in RTL) */}
        <button
          type="button"
          onClick={() => scroll("right")}
          className="
            absolute right-[-40px] top-1/2 z-10 -translate-y-1/2
            flex h-10 w-10 items-center justify-center
            rounded-full bg-white/90 text-black shadow
            hover:bg-white
          "
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Scrollable row */}
        <div className="w-full flex justify-center">
<div className="relative mx-auto h-full max-w-[1120px] flex items-center justify-center overflow-visible">
  <div className="w-full flex justify-center overflow-visible">
    <div
      ref={scrollRef}
      className="
        flex
        h-[372px]
        w-full
        overflow-x-auto
        overflow-y-visible
        scroll-smooth
        justify-center
      "
      style={{ scrollbarWidth: "none" }}
    >
      {demoActors.map((actor, i) => (
        <Card key={i} {...actor} />
      ))}
    </div>
  </div>
</div>
</div>
      </div>
    </div>
  );
}
