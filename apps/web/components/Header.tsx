"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CineMenuOverlay } from "@/components/header/CineMenuOverlay";

const FRAME_WIDTH = 1200;
const TOP = 108;
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
  const [hovered, setHovered] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const orangeFilter =
    "brightness(0) saturate(100%) invert(61%) sepia(61%) saturate(1043%) hue-rotate(351deg) brightness(98%) contrast(98%)";

  return (
    <>
      <header
        style={{
          position: "absolute",
          top: TOP,
          left: "48%",
          transform: "translateX(-50%)",
          width: FRAME_WIDTH,
          height: 0,
          zIndex: 60,
          pointerEvents: "none",
          direction: "rtl",
          fontFamily: "IRANSans",
          color: "#fff",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: RIGHT_PADDING,
            top: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            pointerEvents: "auto",
          }}
        >
          {/* راست: آیکن‌ها + متن‌ها */}
          <div style={{ display: "flex", alignItems: "center", gap: GAP_GROUPS }}>
            {/* آیکن‌ها */}
            <div style={{ display: "flex", alignItems: "center", gap: GAP_ICONS }}>
              {/* Menu */}
            <button
              type="button"
              aria-label={menuOpen ? "close menu" : "open menu"}
              onClick={() => setMenuOpen((prev) => !prev)}
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
                src={
                  menuOpen
                    ? "/cineflash/home/header/vecteezy_simple-close-button-icon-for-ui-ux_58235344 [Converted].png" 
                    : "/cineflash/home/header/menu.png"       
                }
                alt="Menu"
                width={50}
                height={30}
                className="w-[50px] h-[30px] object-contain"
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
            </button>


              {/* User */}
              <button
                type="button"
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
              </button>
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
                href="/auth/register"
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
                href="/talents/search"
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

          {/* چپ: لوگو */}
          <div
            style={{
              position: "relative",
              width: LOGO_W,
              height: LOGO_H,
              marginLeft: GAP_LOGO,
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
          </div>
        </div>
      </header>

      {/* Overlay menu */}
      <CineMenuOverlay open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
