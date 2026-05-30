export type FeaturedActorCard = {
  name: string;
  age?: number | null;
  level?: string | null;
  rating?: number | null;
  avatarSrc?: string | null;
  href?: string;
};

export const DEFAULT_FEATURED_CARDS: FeaturedActorCard[] = [
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

export const FEATURED_CARD_COUNT = DEFAULT_FEATURED_CARDS.length;
