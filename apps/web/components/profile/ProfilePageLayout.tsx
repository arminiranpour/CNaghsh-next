"use client";

import type { ReactNode } from "react";
import Header from "@/components/Header";

type Props = {
  bgUrl?: string;
  children?: ReactNode;
};

export function ProfilePageLayout({ bgUrl, children }: Props) {
  const background = bgUrl
    ? `url(${bgUrl}) center / cover no-repeat fixed`
    : [
        "radial-gradient(900px 900px at 0% 0%, rgba(252, 154, 72, 0.85), transparent 95%)",
        "radial-gradient(900px 900px at 100% 0%, rgba(112, 203, 212, 0.90), transparent 100%)",
        "radial-gradient(900px 900px at 100% 100%, rgba(252, 154, 72, 0.85), transparent 80%)",
        "radial-gradient(900px 900px at 0% 100%, rgba(112, 203, 212, 0.90), transparent 80%)",
        "radial-gradient(1000px 800px at 50% 50%, rgba(243, 238, 230, 0.85), transparent 50%)",
        "#f4f1ed",
      ].join(", ");

  return (
    <main
      dir="rtl"
      data-profile-page="true"
      style={{
        minHeight: "100vh",        // به‌جای height ثابت
        width: "100%",
        background,
        backgroundAttachment: "fixed",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        position: "relative",
        overflowX: "hidden",      
      }}
    >
      {/* مخفی کردن هدر/فوتر اصلی و تنظیم پوزیشن هدر خودت */}
      <style jsx global>{`
        [data-layout="chrome"] > header,
        [data-layout="chrome"] > footer {
          display: none !important;
        }

        main[data-profile-page="true"] > header {
          position: absolute !important;
          top: 102px !important;
          left: 143px !important;
          width: 1155px !important;
          transform: none !important;
        }
      `}</style>

      <Header />

      {children}
    </main>
  );
}
