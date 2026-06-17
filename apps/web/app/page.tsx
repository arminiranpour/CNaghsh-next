import Banner from "@/components/Home/Banner";
import IntroHeading from "@/components/Home/IntroHeading";
import FeaturedHeader from "@/components/Home/FeaturedHeader";
import FeaturedCard from "@/components/Home/FeaturedCard";
import AgeGenderCategories from "@/components/Home/AgeGenderCategories";
import CommunityBanner from "@/components/Home/CommunityBanner";

export default function HomePage() {
  return (
    <main dir="rtl" className="relative w-full min-h-[100svh] overflow-x-hidden">
      <div
        className="fixed inset-0 -z-10 bg-[url('/cineflash/home/background.jpg')] bg-cover bg-top bg-no-repeat"
        aria-hidden="true"
      />

      {/* Page content container (keeps desktop centered, mobile padded) */}
      <div className="relative mx-auto w-full max-w-[1526px] px-0 sm:px-0 lg:px-0">
        <Banner />
        <section className="flex justify-center mt-20 sm:mt-24 lg:mt-[150px]">
          <div className="relative w-full max-w-[1407px]">
            <FeaturedHeader />
            <div className="mt-8" />
            <FeaturedCard />
          </div>
        </section>

        <AgeGenderCategories />
        <CommunityBanner />
      </div>
    </main>
  );
}
