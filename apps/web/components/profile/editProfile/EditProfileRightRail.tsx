"use client";

import Image from "next/image";

type EditProfileRightRailProps = {
  avatarUrl?: string;
  displayName?: string;
};

export function EditProfileRightRail({ avatarUrl, displayName }: EditProfileRightRailProps) {
  const avatarSrc = avatarUrl && avatarUrl.trim()
    ? avatarUrl
    : "/cineflash/profile/example.jpg";

  return (
    <section
      aria-label="راهنمای ویرایش پروفایل"
      style={{
        position: "absolute",
        left: 1095,
        top: 315,
        width: 265,
        height: 804,
        borderRadius: 20,
        backgroundColor: "#FFFFFF",
        boxShadow: "0 10px 30px rgba(0,0,0,0.10)",
        overflow: "visible",
        direction: "rtl",
        fontFamily: "IRANSans, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 180,
          height: 180,
          left: "50%",
          top: -90,
          transform: "translateX(-50%)",
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
        }}
      >
        <Image
          src={avatarSrc}
          alt={displayName ?? "تصویر پروفایل"}
          width={180}
          height={180}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      <h2
        style={{
          position: "absolute",
          top: 110,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 18,
          fontWeight: 700,
          color: "#000000",
          margin: 0,
          whiteSpace: "nowrap",
        }}
      >
        {displayName ?? "اطلاعات پروفایل"}
      </h2>

      <div
        style={{
          position: "absolute",
          top: 160,
          left: 24,
          right: 24,
          borderRadius: 16,
          backgroundColor: "#F5F5F5",
          padding: "16px 14px",
          textAlign: "right",
          color: "#5C5A5A",
          fontSize: 12,
          lineHeight: 1.7,
        }}
      >
        <p style={{ margin: 0 }}>
          با تکمیل اطلاعات شخصی، شانس دیده شدن شما در پورتفولیو افزایش می‌یابد.
        </p>
      </div>

      <div
        style={{
          position: "absolute",
          top: 260,
          left: 24,
          right: 24,
          borderRadius: 16,
          backgroundColor: "#FFF3E7",
          padding: "14px 12px",
          textAlign: "right",
          color: "#E57A20",
          fontSize: 12,
          lineHeight: 1.7,
        }}
      >
        <p style={{ margin: 0 }}>
          برای ذخیره تغییرات، دکمه «ذخیره اطلاعات» را در پایین فرم انتخاب کنید.
        </p>
      </div>
    </section>
  );
}
