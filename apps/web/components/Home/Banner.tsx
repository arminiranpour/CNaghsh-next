import Image from "next/image";

export default function HeroSection() {
  return (
    <section className="flex justify-center bg-black" dir="rtl">
      <div className="relative overflow-hidden" style={{ width: 1526, height: 1145 }}>
        {/* 🎞️ GIF */}
        <Image
          src="/cineflash/home/banner/BannerGif.gif"
          alt="بنر سی‌نقش"
          fill
          priority
          unoptimized
          sizes="1526px"
          style={{ objectFit: "cover", objectPosition: "top", transform: "translateY(-75px)", zIndex: 0 }}
        />

        {/* ▬ نوار پایین روی GIF */}
        <div
          className="absolute"
          style={{
            left: 0,
            top: 915,
            width: 1526,
            height: 2000,
            backgroundColor: "#000000ff",
            zIndex: 5,
            pointerEvents: "none",
          }}
        />

        {/* ▮ نوار عمودی سمت چپ */}
        <div
          className="absolute"
          style={{
            left: 0,
            top: 0,
            width: 50,
            height: "100%",
            backgroundColor: "#000000ff",
            zIndex: 5,
            pointerEvents: "none",
          }}
        />

        {/* ▮ نوار عمودی سمت راست */}
        <div
          className="absolute"
          style={{
            right: 0,
            top: 0,
            width: 50,
            height: "100%",
            backgroundColor: "#000000ff",
            zIndex: 5,
            pointerEvents: "none",
          }}
        />

        {/* 📏 فریم سفید */}
        <Image
  src="/cineflash/home/banner/MainFrame.png"
  alt="نوار سفید بنر"
  fill
  className="absolute"
  style={{
    left: 0,
    top: "15px",
    transform: "scaleX(1.15) scaleY(1.05)", // ← افقی ۱۵٪ و عمودی ۵٪ کشیده‌تر
    transformOrigin: "center top", // ← از بالا ثابت بماند و پایین کشیده شود
    opacity: 0.5,
    zIndex: 10,
    objectFit: "contain",
  }}
  unoptimized
  priority
/>


        {/* 🟠 لوگو */}
        <Image
          src="/cineflash/home/banner/LogoText.png"
          alt="لوگوی سی‌نقش"
          width={787}
          height={786}
          className="absolute"
          style={{ left: "631px", top: "536px", zIndex: 20 }}
          unoptimized
          priority
        />

        {/* 🔸 متن نارنجی */}
        <Image
          src="/cineflash/home/banner/SubText.png"
          alt="سینما آرتیستینگ تئاتر"
          width={556}
          height={34}
          className="absolute"
          style={{ left: "740px", top: "985px", zIndex: 20 }}
          unoptimized
          priority
        />

        {/* 🔘 دکمه تصویری */}
        <button
          type="button"
          aria-label="درباره سی‌نقش"
          className="absolute"
          style={{
            left: 195,
            top: 962,
            width: 165,
            height: 36,
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
              sizes="165px"
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
          style={{ left: "662px", top: "1054px", zIndex: 20 }}
          unoptimized
          priority
        />

        {/* ⬅️ فلش تصویری */}
        <button
          type="button"
          aria-label="فلش بنر"
          className="absolute"
          style={{
            left: 274,
            top: 1063,
            width: 34,
            height: 27,
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
              sizes="34px"
              style={{ objectFit: "contain" }}
              priority
            />
          </span>
        </button>
      </div>
    </section>
  );
}
