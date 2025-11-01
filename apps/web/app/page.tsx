import Banner from "@/components/Home/Banner";
import IntroHeading from "@/components/Home/IntroHeading";
import FeaturedHeader from "@/components/Home/FeaturedHeader";
import FeaturedCard from "@/components/Home/FeaturedCard";
import AgeGenderCategories from "@/components/Home/AgeGenderCategories";
import CommunityBanner from "@/components/Home/CommunityBanner";
import Image from "next/image";

const CARD_H = 392;
const ARROW_W = 29;
const ARROW_H = 23;
const ARROW_Y = CARD_H / 2 - ARROW_H / 2; // ≈ 184.5px

export default function HomePage() {
  return (
    <main dir="rtl">
      <div
        style={{
          backgroundImage: "url('/cineflash/home/background.jpg')",
          backgroundRepeat: "repeat-y",
          backgroundSize: "cover",
          backgroundPosition: "top center",
          width: "100%",
          minHeight: "100vh",
        }}
      >
        <Banner />

        <section style={{ marginTop: 120 }}>
          <IntroHeading />
        </section>

        <section className="flex justify-center mt-[150px]">
          <FeaturedHeader />
          <div className="relative w-[1526px] mx-auto">
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
