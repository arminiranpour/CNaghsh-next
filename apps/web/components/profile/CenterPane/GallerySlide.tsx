"use client";

export function GallerySlide() {
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
     
      <h1
        style={{
          position: "absolute",
          left: 655,
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
       تصاویر
      </h1>
    <div
        style={{
          position: "absolute",
          left: 55,
          top: 120,
          width: 682,
          height: 587,
          borderRadius: 24,
          // فقط برای تست، بک‌گراند خنثی. اگر دوست نداشتی می‌تونی برداری.
          backgroundColor: "#FFFFFF",
        }}
      >
        {/* مستطیل ۱ – بالا چپ  (W=213 H=216  X=305 Y=425) */}
        <div
          style={{
            position: "absolute",
            left: 2, // 305 - 303
            top: 0,  // 425 - 425
            width: 213,
            height: 216,
            borderRadius: 12,
            backgroundColor: "#FFCB1F", // زرد
          }}
        />

        {/* مستطیل ۲ – بالا وسط (W=270 H=216 X=529 Y=425) */}
        <div
          style={{
            position: "absolute",
            left: 226, // 529 - 303
            top: 0,
            width: 270,
            height: 216,
            borderRadius: 12,
            backgroundColor: "#D79333", // قهوه‌ای طلایی
          }}
        />

        {/* مستطیل ۳ – بالا راست (W=173 H=314 X=812 Y=425) */}
        <div
          style={{
            position: "absolute",
            left: 509, // 812 - 303
            top: 0,
            width: 173,
            height: 314,
            borderRadius: 12,
            backgroundColor: "#D8A35A", // بژ
          }}
        />

        {/* مستطیل ۴ – وسط چپ (W=173 H=185 X=303 Y=650) */}
        <div
          style={{
            position: "absolute",
            left: 0, // 303 - 303
            top: 225, // 650 - 425
            width: 173,
            height: 185,
            borderRadius: 12,
            backgroundColor: "#F36B08", // نارنجی تیره
          }}
        />

        {/* مستطیل ۵ – وسط وسط (W=310 H=141 X=489 Y=650) */}
        <div
          style={{
            position: "absolute",
            left: 186, // 489 - 303
            top: 225,
            width: 310,
            height: 141,
            borderRadius: 12,
            backgroundColor: "#FF9A22", // نارنجی
          }}
        />

        {/* مستطیل ۶ – پایین چپ (W=173 H=165 X=303 Y=844) */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 419, // 844 - 425
            width: 173,
            height: 165,
            borderRadius: 12,
            backgroundColor: "#D9AA63", // بژ روشن
          }}
        />

        {/* مستطیل ۷ – پایین وسط (W=310 H=202 X=489 Y=806) */}
        <div
          style={{
            position: "absolute",
            left: 186,
            top: 381, // 806 - 425
            width: 310,
            height: 202,
            borderRadius: 12,
            backgroundColor: "#CF8F30", // قهوه‌ای
          }}
        />

        {/* مستطیل ۸ – پایین راست (W=173 H=250 X=812 Y=762) */}
        <div
          style={{
            position: "absolute",
            left: 509,
            top: 337, // 762 - 425
            width: 173,
            height: 250,
            borderRadius: 12,
            backgroundColor: "#FFC51D", // زرد
          }}
        />
      </div>
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