import Header from "@/components/Header";
import Banner from "@/components/Home/Banner";
import FeaturedHeader from "@/components/Home/FeaturedHeader";
import FeaturedCard from "@/components/Home/FeaturedCard";
import {
  DEFAULT_FEATURED_CARDS,
  FEATURED_CARD_COUNT,
  type FeaturedActorCard,
} from "@/components/Home/featured-card-data";
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
    <main dir="rtl" className="relative w-full flex justify-center">
      <div
        className="fixed inset-0 -z-10 bg-[url('/cineflash/home/background.jpg')] bg-cover bg-top bg-repeat-y"
        aria-hidden="true"
      />
      <div
        className="mx-auto"
        style={{
          width: "1526px",
          minHeight: "100vh",
          position: "relative",
        }}
      >
        <Header />

        <Banner />



        <section className="flex justify-center mt-[150px]">
          <div className="relative w-[1407px] mx-auto">
            <FeaturedHeader />
            <div className="mt-8" />
            <FeaturedCard cards={featuredCards} />
          </div>
        </section>

        <AgeGenderCategories />
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
