"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";

const FRAME_WIDTH = 1200;
const TOP = 50;
const RIGHT_PADDING = 6;

const GAP_GROUPS = 60;
const GAP_TEXTS = 60;
const GAP_ICONS = 60;
const GAP_LOGO = 90;

const MENU_W = 50;
const MENU_H = 22;
const USER_W = 35;
const USER_H = 26;
const LOGO_W = 140;
const LOGO_H = 43;

export default function Header() {
  // برای هاور شدن هر آیتم
  const [hovered, setHovered] = useState<string | null>(null);
  const { data: session } = useSession();

  // فیلتر نارنجی (مثل قبل)
  const orangeFilter =
    "brightness(0) saturate(100%) invert(61%) sepia(61%) saturate(1043%) hue-rotate(351deg) brightness(98%) contrast(98%)";

  return (
    <header
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        width: "100%",
        paddingTop: TOP,
        paddingBottom: TOP,
        backgroundColor: "transparent",
        zIndex: 100,
        direction: "rtl",
        fontFamily: "IRANSans",
        color: "#fff",
      }}
    >
      <div
        style={{
          maxWidth: FRAME_WIDTH,
          width: "100%",
          margin: "0 auto",
          paddingRight: RIGHT_PADDING,
          paddingLeft: RIGHT_PADDING,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* راست: آیکن‌ها + متن‌ها */}
        <div style={{ display: "flex", alignItems: "center", gap: GAP_GROUPS }}>
          {/* آیکن‌ها */}
          <div style={{ display: "flex", alignItems: "center", gap: GAP_ICONS }}>
            {/* Menu */}
            <a
              href="#"
              aria-label="menu"
              onMouseEnter={() => setHovered("menu")}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                border: 0,
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <Image
                src="/cineflash/home/header/menu.png"
                alt="Menu"
                width={MENU_W}
                height={MENU_H}
                unoptimized
                priority
                style={{
                  display: "block",
                  objectFit: "contain",
                  transition: "filter .2s ease, transform .15s ease",
                  filter: hovered === "menu" ? orangeFilter : "none",
                  transform: hovered === "menu" ? "translateY(-1px)" : "none",
                }}
              />
            </a>

            {/* User */}
            <Link
              href={session?.user ? "/dashboard/profile" : "/auth?tab=signup"}
              aria-label="user"
              onMouseEnter={() => setHovered("user")}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                border: 0,
                background: "transparent",
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              <Image
                src="/cineflash/home/header/user.png"
                alt="User"
                width={USER_W}
                height={USER_H}
                unoptimized
                priority
                style={{
                  display: "block",
                  transition: "filter .2s ease, transform .15s ease",
                  filter: hovered === "user" ? orangeFilter : "none",
                  transform: hovered === "user" ? "translateY(-1px)" : "none",
                }}
              />
            </Link>
          </div>

          {/* متن‌ها */}
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: GAP_TEXTS,
              fontSize: 22,
              fontWeight: 500,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            <Link
              href="/auth?tab=signup"
              onMouseEnter={() => setHovered("register")}
              onMouseLeave={() => setHovered(null)}
              style={{
                textDecoration: "none",
                color: hovered === "register" ? "#F58A1F" : "inherit",
                transition: "color .2s ease",
                cursor: "pointer",
              }}
            >
              ثبت نام
            </Link>

            <Link
              href="/profiles"
              onMouseEnter={() => setHovered("search")}
              onMouseLeave={() => setHovered(null)}
              style={{
                textDecoration: "none",
                color: hovered === "search" ? "#F58A1F" : "inherit",
                transition: "color .2s ease",
                cursor: "pointer",
              }}
            >
              جست‌ و جوی هنرمندان
            </Link>
          </nav>
        </div>

        {/* چپ: لوگو (بدون تغییر) */}
        <Link
          href="/"
          style={{
            position: "relative",
            width: LOGO_W,
            height: LOGO_H,
            marginLeft: GAP_LOGO,
            display: "block",
            textDecoration: "none",
          }}
        >
          <Image
            src="/cineflash/home/header/cnaghsh-logo.png"
            alt="CNAGHSH ART GROUP"
            fill
            sizes="130px"
            style={{ objectFit: "contain" }}
            unoptimized
            priority
          />
        </Link>
      </div>
    </header>
  );
}
