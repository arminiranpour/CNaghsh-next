import Image from "next/image";

export default function IntroHeading() {
  return (
    <div
      className="relative"
      style={{
        width: 1526,
        height: 520,
        margin: "0 auto",
        position: "relative",
        right: "-40px", // 👈 کمی کل سکشن رو به راست می‌بره (مقدار قابل تنظیم)
      }}
    >
      {/* 🖼️ تیتر اصلی */}
      <Image
        src="/cineflash/home/intro/Heading.png"
        alt="تیتر بخش سی‌نقش"
        width={687}
        height={50}
        className="absolute"
        style={{
          left: "377px",
          top: "0px",
          zIndex: 10,
        }}
        unoptimized
        priority
      />

      {/* 🟧 کارت وسط */}
      <Image
        src="/cineflash/home/intro/CardCenter.png"
        alt="کارت نارنجی وسط"
        width={450}
        height={290}
        className="absolute"
        style={{
          left: "473px",
          top: "137px",
          transform: "rotate(-6.47deg)",
          zIndex: 10,
        }}
        unoptimized
        priority
      />

      {/* 🟧 کارت راست */}
      <Image
        src="/cineflash/home/intro/CardRight.png"
        alt="کارت نارنجی راست"
        width={320}
        height={327}
        className="absolute"
        style={{
          left: "998px",
          top: "90px",
          zIndex: 10,
        }}
        unoptimized
        priority
      />

      {/* 🟧 کارت چپ */}
      <Image
        src="/cineflash/home/intro/CardLeft.png"
        alt="کارت نارنجی چپ"
        width={259}
        height={272}
        className="absolute"
        style={{
          left: "147px",
          top: "110px",
          zIndex: 10,
        }}
        unoptimized
        priority
      />
    </div>
  );
}
