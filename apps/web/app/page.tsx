import {
  FEATURED_CARD_COUNT,
  type FeaturedActorCard,
  DEFAULT_FEATURED_CARDS,
} from "@/components/Home/featured-card-data";
import Banner from "@/components/Home/Banner";
import FeaturedHeader from "@/components/Home/FeaturedHeader";
import FeaturedCard from "@/components/Home/FeaturedCard";
import AgeGenderCategories from "@/components/Home/AgeGenderCategories";
import CommunityBanner from "@/components/Home/CommunityBanner";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const profiles = await prisma.profile.findMany({
    where: {
      visibility: "PUBLIC",
      moderationStatus: "APPROVED",
      publishedAt: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      stageName: true,
      age: true,
      avatarUrl: true,
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: FEATURED_CARD_COUNT,
  });

  const realFeaturedCards: FeaturedActorCard[] = profiles.map((profile) => ({
    name: resolveFeaturedDisplayName(profile),
    age: profile.age,
    avatarSrc: profile.avatarUrl,
    href: `/profiles/${profile.id}`,
  }));

  const fallbackCards = DEFAULT_FEATURED_CARDS.slice(
    0,
    FEATURED_CARD_COUNT - realFeaturedCards.length,
  );
  const featuredCards =
    realFeaturedCards.length >= FEATURED_CARD_COUNT
      ? realFeaturedCards
      : [...realFeaturedCards, ...fallbackCards];

  return (
    <main dir="rtl" className="relative w-full min-h-[100svh] overflow-x-hidden">
      <div
        className="fixed inset-0 -z-10 bg-[url('/cineflash/home/background.jpg')] bg-cover bg-top bg-no-repeat"
        aria-hidden="true"
      />

      {/* Page content container (keeps desktop centered, mobile padded) */}
      <div className="relative mx-auto w-full max-w-[1526px] px-0 sm:px-0 lg:px-0">
        
        <Banner />
        <AgeGenderCategories />
        <section className="flex justify-center mt-20 sm:mt-24 lg:mt-[150px]">
          <div className="relative w-full max-w-[1407px]">
            <FeaturedHeader />
            <div className="mt-8" />
            <FeaturedCard cards={featuredCards} />
          </div>
        </section>

        <CommunityBanner />
      </div>
    </main>
  );
}

function resolveFeaturedDisplayName(profile: {
  stageName: string | null;
  firstName: string | null;
  lastName: string | null;
  user: {
    name: string | null;
  };
}) {
  if (profile.stageName?.trim()) {
    return profile.stageName.trim();
  }

  const fullName = [profile.firstName ?? "", profile.lastName ?? ""]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");

  if (fullName) {
    return fullName;
  }

  if (profile.user.name?.trim()) {
    return profile.user.name.trim();
  }

  return "پروفایل";
}
