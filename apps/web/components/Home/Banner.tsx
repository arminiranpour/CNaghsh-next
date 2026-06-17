import Image from "next/image";

export default function HeroSection() {
  return (
    <section className="flex justify-center bg-black" dir="rtl">
      <div
        className="w-full px-4 sm:px-0 sm:w-[550px] md:w-[650px] lg:w-[100%] lg:max-w-[1200px] mx-auto"
      >
        <div className="relative w-full overflow-hidden aspect-[1526/1145]">
          {/* 🎞️ GIF */}
          <Image
            src="/cineflash/home/banner/BannerGif.gif"
            alt="بنر سی‌نقش"
            fill
            priority
            unoptimized
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 650px, 60vw"
            style={{ objectFit: "cover", objectPosition: "top", transform: "translateY(-6.55%)", zIndex: 0 }}
          />

          {/* 📏 فریم سفید */}
          <Image
            src="/cineflash/home/banner/MainFrame.png"
            alt="نوار سفید بنر"
            fill
            className="absolute"
            style={{
              left: "0%",
              top: "1.31%",
              transform: "scaleX(1.15) scaleY(1.05)", // ← افقی ۱۵٪ و عمودی ۵٪ کشیده‌تر
              transformOrigin: "center top", // ← از بالا ثابت بماند و پایین کشیده شود
              opacity: 0.5,
              zIndex: 10,
              objectFit: "contain",
            }}
            unoptimized
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 650px, 60vw"
          />

          {/* 🟠 لوگو */}
          <Image
            src="/cineflash/home/banner/LogoText.png"
            alt="لوگوی سی‌نقش"
            width={787}
            height={786}
            className="absolute"
            style={{
              left: "41.35%",
              top: "46.81%",
              width: "51.57%",
              height: "68.65%",
              zIndex: 20,
            }}
            unoptimized
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 650px, 60vw"
          />

          {/* 🔸 متن نارنجی */}
          <Image
            src="/cineflash/home/banner/SubText.png"
            alt="سینما آرتیستینگ تئاتر"
            width={556}
            height={34}
            className="absolute"
            style={{
              left: "48.49%",
              top: "86.03%",
              width: "36.44%",
              height: "2.97%",
              zIndex: 20,
            }}
            unoptimized
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 650px, 60vw"
          />

          {/* 🔘 دکمه تصویری */}
          <button
            type="button"
            aria-label="درباره سی‌نقش"
            className="absolute"
            style={{
              left: "12.78%",
              top: "84.02%",
              width: "10.81%",
              height: "3.14%",
              border: "none",
              padding: 0,
              background: "transparent",
              cursor: "pointer",
              zIndex: 20,
            }}
          >
            <span className="sr-only">درباره سی‌نقش</span>
            <span className="relative block" style={{ width: "100%", height: "100%" }}>
              <Image
                src="/cineflash/home/banner/AboutButton.png"
                alt=""
                fill
                unoptimized
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 650px, 60vw"
                style={{ objectFit: "cover" }}
                priority
              />
            </span>
          </button>

          {/* 📝 کپشن خاکستری */}
          <Image
            src="/cineflash/home/banner/SubCaption.png"
            alt="بزرگ‌ترین جامعه‌ی جهانی بازیگران فیلم، تئاتر، شبکه‌های خانگی، تلویزیون"
            width={634}
            height={34}
            className="absolute"
            style={{
              left: "43.38%",
              top: "92.05%",
              width: "41.55%",
              height: "2.97%",
              zIndex: 20,
            }}
            unoptimized
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 650px, 60vw"
          />

          {/* ⬅️ فلش تصویری */}
          <button
            type="button"
            aria-label="فلش بنر"
            className="absolute"
            style={{
              left: "17.96%",
              top: "92.84%",
              width: "2.23%",
              height: "2.36%",
              border: "none",
              padding: 0,
              background: "transparent",
              cursor: "pointer",
              zIndex: 20,
            }}
          >
            <span className="sr-only">فلش بنر</span>
            <span className="relative block" style={{ width: "100%", height: "100%" }}>
              <Image
                src="/cineflash/home/banner/Arrow.png"
                alt=""
                fill
                unoptimized
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 650px, 60vw"
                style={{ objectFit: "contain" }}
                priority
              />
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
