import Header from "@/components/Header";
import Banner from "@/components/Home/Banner";
import IntroHeading from "@/components/Home/IntroHeading";
import FeaturedHeader from "@/components/Home/FeaturedHeader";
import FeaturedCard from "@/components/Home/FeaturedCard";
import AgeGenderCategories from "@/components/Home/AgeGenderCategories";
import CommunityBanner from "@/components/Home/CommunityBanner";
import Footer from "@/components/Footer";

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
          position: "relative", // خیلی مهم برای اینکه absolute هدر درست عمل کنه
        }}
      >
        <Header />

        <Banner />

        <section style={{ marginTop: 120 }}>
          <IntroHeading />
        </section>

        <section className="flex justify-center mt-[150px]">
          <div className="relative w-[1526px] mx-auto">
            <FeaturedHeader />
            <div className="mt-8" />
            <FeaturedCard />
          </div>
        </section>

        <AgeGenderCategories />
        <CommunityBanner />
        <Footer />
      </div>
    </main>
  );
}
