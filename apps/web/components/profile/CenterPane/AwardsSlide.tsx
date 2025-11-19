"use client";

import Image from "next/image";

const ORANGE = "#F58A1F";
const GRAY = "#7C7C7C";

type AwardItem = {
  id: number;
  title: string;
  subtitle: string;
};

const AWARDS: AwardItem[] = [
  {
    id: 1,
    title: "نقش مکمل مرد",
    subtitle: "جشنواره تئاتر دانشگاهی نهال / مهر ۱۳۹۹",
  },
  {
    id: 2,
    title: "نقش مکمل مرد",
    subtitle: "جشنواره تئاتر دانشگاهی نهال / مهر ۱۳۹۹",
  },
  {
    id: 3,
    title: "نقش مکمل مرد",
    subtitle: "جشنواره تئاتر دانشگاهی نهال / مهر ۱۳۹۹",
  },
];

export function AwardsSlide() {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        direction: "rtl",
        fontFamily: "IRANSans, sans-serif",
      }}
    >
      {/* تیتر اصلی */}
      <h1
        style={{
          position: "absolute",
          left: 528,
          top: 35,
          height: 47,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          fontSize: 32,
          fontWeight: 900,
          color: "#000000",
          whiteSpace: "nowrap",
        }}
      >
        جوایز و افتخارات
      </h1>

      {/* لیست جوایز */}
      <div
        style={{
          position: "absolute",
          top: 160,
          right: 80,
          width: 680,
        }}
      >
        {AWARDS.map((item, index) => (
          <div
            key={item.id}
            style={{
              padding: "20px 0",
              paddingRight: 0, 
            }}
          >
            {/* ردیف عنوان + جام */}
<div
  style={{
    display: "flex",
    flexDirection: "row",
    direction: "rtl",           // مهم: چیدمان راست به چپ
    alignItems: "center",
    justifyContent: "flex-start", // از سمت راست شروع کن
    gap: 14,
    marginBottom: 15,
  }}
>
  {/* جام (سمت راست) */}
  <Image
    src="/cineflash/profile/trophy.png"
    alt="آیکن جایزه"
    width={24}
    height={24}
  />

  {/* عنوان (سمت چپ جام) */}
  <span
    style={{
      fontSize: 18,
      fontWeight: 700,
      color: ORANGE,
      whiteSpace: "nowrap",
    }}
  >
    {item.title}
  </span>
</div>


            {/* زیرعنوان خاکستری – راست‌چین زیر عنوان */}
            <div
              style={{
                fontSize: 15,
                fontWeight: 400,
                color: GRAY,
                textAlign: "right",
                paddingRight: 40,
              }}
            >
              {item.subtitle}
            </div>

            {/* خط نازک زیر هر آیتم به جز آخری */}
            {index < AWARDS.length  && (
              <div
                style={{
                  marginTop: 30,
                  height: 1.5,
                  backgroundColor: "rgba(0, 0, 0, 0.2)",
                  width: 550,
                }}
              />
            )}
          </div>
        ))}
      </div>

     {/* دکمه «جست و جوی دیگر بازیگران» – پایین چپ */}
<button
  type="button"
  style={{
    position: "absolute",
    bottom: 40,
    left: 60,
    height: 33,
    width:189,
    padding: "0 40px",
    borderRadius: 38,
    border: "1px solid #F77F19",
    backgroundColor: "#FFFFFF",
    color: "#F77F19",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
  }}
>
  جست و جوی دیگر بازیگران
</button>

      {/* متن «صفحه قبل →» – پایین راست */}
<div
  style={{
    position: "absolute",
    bottom: 48,
    right: 80,
    display: "flex",
    flexDirection: "row",
    direction: "rtl",        // راست به چپ
    alignItems: "center",
    gap: 8,
    color: ORANGE,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  }}
>
  {/* فلش سمت راست */}
  <span style={{ fontSize: 20, marginTop: 1 }}>→</span>
  {/* متن سمت چپ فلش */}
  <span>صفحه قبل</span>
</div>

    </div>
  );
}
