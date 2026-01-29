"use client";

import Image from "next/image";

export default function CommunityBanner() {
  return (
    <section
      dir="rtl"
      className="w-full flex justify-center"
      style={{
        marginTop: "200px",
      }}
    >
      {/* parent که اجازه میده تصویر از باکس بزنه بیرون */}
      <div
        style={{
          position: "relative",
          width: "1155px",
          height: "272px",
          // هیچ overflow اینجا و پایینش نباید hidden باشه
          overflow: "visible",
        }}
      >
        {/* مستطیل گرادیانت با گوشه‌های گرد */}
        <div
          style={{
            width: "1155px",
            height: "272px",
            borderRadius: "30px",
            background:
              "linear-gradient(90deg, #FF7F19 0%, #FFDDC4 80%)",
          }}
        />

        {/* تصویر سه‌بعدی که باید از لبه چپ بزنه بیرون */}
        <div
          style={{
            position: "absolute",
            left: "50px",         // لبه تصویر تقریباً مماس روی گوشه چپ باکس
            top: "-50px",
            width: "423px",
            height: "423px",
            // چون تصویر بزرگ‌تر از ارتفاع باکس (423 > 272) هست،
            // برای اینکه وسط عمودی باشه مثل فیگما، میاریمش یه ذره بالا یا پایین
            transform: "translate(-20px, -70px)",
            // translate X منفی یعنی حتی بیشتر از باکس بیرون بزنه سمت چپ 👈
          }}
        >
          <Image
            src="/cineflash/home/categories/cineflash-3d.png"
            alt="cineflash community illustration"
            fill
            unoptimized
            priority
            style={{
              objectFit: "contain",
            }}
          />
        </div>

        
        {/* 🔸 تیتر "همه ما یک جامعه هستیم!" */}
        <h2
          className="font-iransans font-bold"
          style={{
            fontFamily: "IRANSans",
            fontWeight: "bold",
            position: "absolute",
            top: "30px",
            right: "40px",
            fontSize: "35px",
            color: "#F58A1F",
            lineHeight: "1.2",
            whiteSpace: "nowrap",
          }}
        >
          همه ما یک جامعه هستیم!
        </h2>

        {/* 🔹 متن توضیح زیر عنوان */}
<p
  className="font-iransans"
  style={{
    fontFamily: "IRANSans",
    position: "absolute",
    top: "100px", // زیر عنوان
    right: "42px",
    width: "650px", // تقریباً مطابق فیگما
    fontSize: "20px",
    fontWeight: "400",
    color: "#000000",
    lineHeight: "1.8",
  }}
>
  به انجمن متخصصان بازیگری بپیوندید. کار پیدا کنید، همکاری کنید و از یکدیگر حمایت کنید. همه در یک مکان.
</p>

 {/* دکمه‌ها */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          right: "42px",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "90px",
        }}
      >
        {/* دکمه سبز */}
        <button
          style={{
            height: "46px",
            padding: "0 24px",
            borderRadius: "90px",
            border: "2px solid #1E3016",
          
            color: "#1E3016",
            fontSize: "20px",
            fontWeight: 'bold',
            fontFamily: "IRANSans",
            cursor: "pointer",
          }}
        >
          به سی‌نقش بپیوندید.
        </button>
        
        {/* دکمه نارنجی سوالی داری؟ */}
        <button
          style={{
            height: "46px",
            padding: "0 24px",
            borderRadius: "90px",
            border: "2px solid #FF7F19",
            backgroundColor: "transparent",
            color: "#FF7F19",
            fontSize: "20px",
            fontWeight: 'bold',
            fontFamily: "IRANSans",
            cursor: "pointer",
          }}
        >
          سوالی داری؟
        </button>
</div>
      </div>
    </section>
  );
}