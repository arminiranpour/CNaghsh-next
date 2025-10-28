import Banner from "@/components/Home/Banner";
import IntroHeading from "@/components/Home/IntroHeading";

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
        }}
      >
        <Banner />

        {/* فاصله از زیر بنر تا شروع Intro — قابل تنظیم */}
        <section style={{ marginTop: 120 }}>
          <IntroHeading />
        </section>

      </div>
    </main>
  );
}
