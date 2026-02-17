import Banner from "@/components/Home/Banner";
import IntroHeading from "@/components/Home/IntroHeading";
import FeaturedHeader from "@/components/Home/FeaturedHeader";
import FeaturedCard from "@/components/Home/FeaturedCard";
import AgeGenderCategories from "@/components/Home/AgeGenderCategories";
import CommunityBanner from "@/components/Home/CommunityBanner";

export default function HomePage() {
  return (
    <main
      dir="rtl"
      className="relative w-full flex justify-center max-md:h-[100svh] max-md:overflow-hidden"
    >
      <div
        className="fixed inset-0 -z-10 bg-[url('/cineflash/home/background.jpg')] bg-cover bg-top bg-repeat-y"
        aria-hidden="true"
      />
      {/* خیلی مهم برای اینکه absolute هدر درست عمل کنه */}
      <div className="mx-auto relative w-[1526px] min-h-[100vh] max-md:min-h-0 max-md:h-[100svh] max-md:overflow-hidden">
        <Banner />

        <section style={{ marginTop: 120 }}>
          <IntroHeading />
        </section>

        <section className="flex justify-center mt-[150px]">
          <div className="relative w-[1407px] mx-auto">
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
