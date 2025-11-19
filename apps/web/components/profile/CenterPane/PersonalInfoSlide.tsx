"use client";

import { useState } from "react";
import Image from "next/image";

type ActionId = "bookmark" | "share" | "favorite";

const ORANGE = "#F58A1F";
const GRAY = "#7C7C7C";

const ICONS: Record<ActionId, JSX.Element> = {
  favorite: (
    <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21s-6.7-4.35-9.33-8.7C.33 9.36 2.08 5 6 5c2.2 0 3.67 1.33 4.5 2.67C11.33 6.33 12.8 5 15 5c3.92 0 5.67 4.36 3.33 7.3C18.7 16.65 12 21 12 21z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  ),
  share: (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"
        stroke="currentColor"
        strokeWidth="2"
      />
      <polyline
        points="16 6 12 2 8 6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <line
        x1="12"
        y1="2"
        x2="12"
        y2="15"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  ),
  bookmark: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 2h12a1 1 0 0 1 1 1v18l-7-4-7 4V3a1 1 0 0 1 1-1z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  ),
};

const CARD_WIDTH = 320;
const CARD_HEIGHT = 176;

const bulletDotStyle: React.CSSProperties = {
  width: 5,
  height: 5,
  borderRadius: "999px",
  backgroundColor: "#5C5A5A",
  flexShrink: 0,
};

const bulletTextStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 400,
  color: "#5C5A5A",
  lineHeight: 1.9,
};

export function PersonalInfoSlide() {
  const [activeAction, setActiveAction] = useState<ActionId | null>(null);

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
     

      {/* درباره من */}
      <h1
        style={{
          position: "absolute",
          left: 620,
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
        درباره من
      </h1>

      <div
        style={{
          position: "absolute",
          left: 75,
          top: 107,
          width: 662,
          color: "#5C5A5A",
          fontSize: 13,
          fontWeight: 450,
          lineHeight: 1.9,
          textAlign: "justify",
          overflow: "hidden",
        }}
      >
        <p style={{ margin: 0 }}>
          من عاشق لحظه‌هایی‌ام که می‌توانم از خودم بیرون بیایم و توی پوست یه آدم
          دیگه زندگی کنم. بازیگری برام راهیه برای شناخت احساسات آدم‌ها و دنیاهای
          تازه.
          <br />
          فارغ‌التحصیل ادبیات نمایشی‌ام و تا حالا تو چند نمایش و فیلم بازی کردم.
          از کار گروهی، صحنه و سکوت پشت دوربین لذت می‌برم. ویولن می‌زنم،
          صداپیشگی می‌کنم و با زبان ترکی و انگلیسی آشنا‌م. همیشه دنبال
          تجربه‌هایی‌ام که بتونن منو به یه نسخه عمیق‌تر از خودم نزدیک‌تر کنن.
        </p>
      </div>

      {/* تیتر کارهایی که انجام دادم */}
      <h2
        style={{
          position: "absolute",
          left: 696 - 228,
          top: 573 - 300,
          width: 271,
          height: 47,
          margin: 0,
          fontSize: 30,
          fontWeight: 700,
          color: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          whiteSpace: "nowrap",
        }}
      >
        کارهایی که انجام دادم:
      </h2>

      {/* کارت‌ فیلم کوتاه – بالا چپ */}
      <div
        style={{
          position: "absolute",
          left: 65,
          top: 345,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          borderRadius: 24,
          backgroundColor: "#E8F5DD",
        }}
      >
        {/* تیتر + آیکن */}
        <div
          style={{
            position: "absolute",
            top: 22,
            right: 32,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#2E7D32",
            fontSize: 18,
            fontWeight: 700,
            flexDirection: "row",
          }}
        >
          <Image
            src="/cineflash/profile/jobs/short-film.png"
            alt="فیلم کوتاه"
            width={28}
            height={28}
          />
          <span>فیلم کوتاه</span>
        </div>

        {/* متن‌ها + بولت‌ها */}
        <div
          style={{
            position: "absolute",
            top: 62,
            right: 56,
            width: CARD_WIDTH - 96,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span style={bulletDotStyle} />
            <span style={bulletTextStyle}>نقش هم‌کلاس / نمایش مکتب</span>
          </div>

          <div
            style={{
              height: 1,
              backgroundColor: "rgba(0,0,0,0.15)",
              margin: "10px 12px 10px 0",
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={bulletDotStyle} />
            <span style={bulletTextStyle}>
              نقش دوم / نمایش‌نامه‌خوانی «اثر یا روز می‌گذرد»
            </span>
          </div>
        </div>
      </div>

      {/* کارت تئاتر – بالا راست */}
      <div
        style={{
          position: "absolute",
          left: 65 + CARD_WIDTH + 30,
          top: 345,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          borderRadius: 24,
          backgroundColor: "#FEE5D5",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 22,
            right: 32,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: ORANGE,
            fontSize: 18,
            fontWeight: 700,
            flexDirection: "row",
          }}
        >
          <Image
            src="/cineflash/profile/jobs/theatre.png"
            alt="تئاتر"
            width={38}
            height={38}
          />
          <span>تئاتر</span>
        </div>

        <div
          style={{
            position: "absolute",
            top: 62,
            right: 56,
            width: CARD_WIDTH - 96,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span style={bulletDotStyle} />
            <span style={bulletTextStyle}>نقش صحنه / نمایش مکتب</span>
          </div>

          <div
            style={{
              height: 1,
              backgroundColor: "rgba(0,0,0,0.15)",
              margin: "10px 12px 10px 0",
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={bulletDotStyle} />
            <span style={bulletTextStyle}>
              نقش گروهی / نمایش‌نامه‌خوانی «اثر یا روز می‌گذرد»
            </span>
          </div>
        </div>
      </div>

      {/* کارت تلویزیون – پایین چپ */}
      <div
        style={{
          position: "absolute",
          left: 65,
          top: 345 + CARD_HEIGHT + 30,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          borderRadius: 24,
          backgroundColor: "#FEE5D5",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 22,
            right: 32,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: ORANGE,
            fontSize: 18,
            fontWeight: 700,
            flexDirection: "row",
          }}
        >
          <Image
            src="/cineflash/profile/jobs/tv.png"
            alt="تلویزیون"
            width={28}
            height={28}
          />
          <span>تلویزیون</span>
        </div>

        <div
          style={{
            position: "absolute",
            top: 62,
            right: 56,
            width: CARD_WIDTH - 96,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span style={bulletDotStyle} />
            <span style={bulletTextStyle}>نقش مهمان / نمایش مکث</span>
          </div>

          <div
            style={{
              height: 1,
              backgroundColor: "rgba(0,0,0,0.15)",
              margin: "10px 12px 10px 0",
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={bulletDotStyle} />
            <span style={bulletTextStyle}>
              نقش دوم / برنامه تلویزیونی «اثر یا روز می‌گذرد»
            </span>
          </div>
        </div>
      </div>

      {/* کارت سینمایی – پایین راست */}
      <div
        style={{
          position: "absolute",
          left: 65 + CARD_WIDTH + 30,
          top: 345 + CARD_HEIGHT + 30,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          borderRadius: 24,
          backgroundColor: "#E8F5DD",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 22,
            right: 32,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#2E7D32",
            fontSize: 18,
            fontWeight: 700,
            flexDirection: "row",
          }}
        >
          <Image
            src="/cineflash/profile/jobs/cinema.png"
            alt="سینمایی"
            width={28}
            height={28}
          />
          <span>سینمایی</span>
        </div>

        <div
          style={{
            position: "absolute",
            top: 62,
            right: 56,
            width: CARD_WIDTH - 96,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span style={bulletDotStyle} />
            <span style={bulletTextStyle}>نقش مکمل / نمایش مکتب</span>
          </div>

          <div
            style={{
              height: 1,
              backgroundColor: "rgba(0,0,0,0.15)",
              margin: "10px 12px 10px 0",
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={bulletDotStyle} />
            <span style={bulletTextStyle}>
              نقش دوم / فیلم سینمایی «اثر یا روز می‌گذرد»
            </span>
          </div>
        </div>
      </div>
      
      {/* دکمه صفحه بعد – بدون بُردر، وسط، فلش سمت راست */}
<div
  style={{
    position: "absolute",
    left: (797 / 2) - (141 / 2), // وسط افقی نسبت به عرض 748 کانتینر
    top: 1038 - 290,            // موقعیت دقیق فیگما
    width: 141,
    height: 44,
    borderRadius: 38,
    backgroundColor: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    cursor: "pointer",
    fontFamily: "IRANSans, sans-serif",
    color: "#FF7F19",
    fontSize: 15,
    fontWeight: 700,
  }}
>
  {/* متن سمت چپ */}
  <span>صفحه بعد</span>

  {/* فلش سمت راست ← */}
  <span style={{ fontSize: 20, marginBottom: 2 }}>←</span>
</div>

    </div>
  );
}
