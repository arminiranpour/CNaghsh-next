"use client";

export function VideosSlide() {
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
          left: 630,
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
       ویدئو ها
      </h1>

      {/* کانتینر اصلی گرید */}
      <div
        style={{
          position: "absolute",
          top: 120,
          left: 55,
          width: 680,
          height: 584,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gridTemplateRows: "repeat(2, 1fr)",
          gap: "22px 18px",
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 12,
              overflow: "hidden",
              position: "relative",
              backgroundColor: "#C89E2B", // رنگ پیش‌فرض قبل از لود ویدئو
            }}
          >
            {/* سایه مشکی پایین */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: "100%",
                height: 190,
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0))",
              }}
            />

            {/* عنوان ویدئو */}
            <span
              style={{
                position: "absolute",
                bottom: 12,
                right: 16,
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              عنوان ویدئو
            </span>

            {/* تاریخ */}
            <span
              style={{
                position: "absolute",
                bottom: 12,
                left: 16,
                color: "#fff",
                fontSize: 12,
                opacity: 0.8,
              }}
            >
              ۱۴۰۲/۰۶/۲۰
            </span>
          </div>
        ))}
      </div>

      {/* دکمه صفحه بعد */}
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