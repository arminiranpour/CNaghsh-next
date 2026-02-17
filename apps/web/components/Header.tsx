"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { CineMenuOverlay, CineMenuOverlayContent } from "@/components/header/CineMenuOverlay";

const FRAME_WIDTH = 1200;
const TOP = 50;
const RIGHT_PADDING = 6;

const GAP_GROUPS = 60;
const GAP_TEXTS = 60;
const GAP_ICONS = 60;
const GAP_LOGO = 10;

const MENU_W = 50;
const MENU_H = 22;
const USER_W = 35;
const USER_H = 26;
const LOGO_W = 140;
const LOGO_H = 43;

type HeaderVariant = "static" | "overlay";

type HeaderProps = {
  variant?: HeaderVariant;
};
type HeaderStyle = CSSProperties & {
  "--header-padding": string;
};

function getHeaderConfig(pathname: string) {
  const shouldAutoHide =
    pathname === "/profiles" ||
    pathname.startsWith("/profiles/") ||
    pathname === "/dashboard/profile" ||
    pathname.startsWith("/dashboard/profile/");
  const useWhiteHeader =
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname === "/pricing" ||
    pathname.startsWith("/profiles/") ||
    pathname.startsWith("/profile/");
  const topPadding = pathname === "/" ? 100 : TOP;

  return { shouldAutoHide, useWhiteHeader, topPadding };
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQueryList = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    setMatches(mediaQueryList.matches);
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener("change", handleChange);
      return () => mediaQueryList.removeEventListener("change", handleChange);
    }

    mediaQueryList.addListener(handleChange);
    return () => mediaQueryList.removeListener(handleChange);
  }, [query]);

  return matches;
}

export default function Header({ variant = "static" }: HeaderProps) {
  // برای هاور شدن هر آیتم
  const [hovered, setHovered] = useState<string | null>(null);
  const [isHidden, setIsHidden] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();
  const { shouldAutoHide, useWhiteHeader, topPadding } = getHeaderConfig(pathname);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // فیلتر نارنجی (مثل قبل)
  const orangeFilter =
    "brightness(0) saturate(100%) invert(61%) sepia(61%) saturate(1043%) hue-rotate(351deg) brightness(98%) contrast(98%)";

  useEffect(() => {
    setIsMenuOpen(false);
    setIsMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) {
      setIsMoreOpen(false);
    }
  }, [isMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsMoreOpen(false);
  }, [isDesktop]);

  useEffect(() => {
    if (!isMenuOpen || isDesktop) return;

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen, isDesktop]);

  useEffect(() => {
    if (!isDesktop) {
      setIsHidden(false);
      return;
    }
    if (!shouldAutoHide) {
      setIsHidden(false);
      return;
    }

    let rafId = 0;

    const updateHidden = (event?: Event) => {
      const target = event?.target instanceof HTMLElement ? event.target : null;
      const windowScrolled = window.scrollY > 4;
      const documentScrolled = (document.scrollingElement?.scrollTop ?? 0) > 4;
      const targetScrolled = target ? target.scrollTop > 4 : false;
      setIsHidden(windowScrolled || documentScrolled || targetScrolled);
    };

    const handleScroll = (event: Event) => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => updateHidden(event));
    };

    updateHidden();

    document.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [pathname, shouldAutoHide, isDesktop]);

  return (
    <>
      <header
        className="sticky top-0 z-[100] bg-transparent lg:absolute lg:top-0 lg:left-0 lg:right-0 pt-4 pb-4 lg:pt-[var(--header-padding)] lg:pb-[var(--header-padding)]"
        style={
          {
            "--header-padding": `${topPadding}px`,
            width: "100%",
            direction: "rtl",
            fontFamily: "IRANSans",
            color: useWhiteHeader ? "#fff" : "#000",
            transform: isHidden ? "translateY(-120px)" : "translateY(0)",
            opacity: isHidden ? 0 : 1,
            pointerEvents: isHidden ? "none" : "auto",
            transition: "transform 0.2s ease, opacity 0.2s ease",
          } as HeaderStyle
        }
        data-variant={variant}
      >
        <div className="hidden lg:block">
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
                <button
                  type="button"
                  aria-label="menu"
                  onClick={() => {
                    if (!isDesktop) return;
                    setIsMenuOpen((prev) => !prev);
                  }}
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
                      useWhiteHeader
                        ? "/cineflash/home/Header/menu-white.png"
                        : "/cineflash/home/header/menu.png"
                    }
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
                </button>

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
                    src={
                      useWhiteHeader
                        ? "/cineflash/home/Header/user-white.png"
                        : "/cineflash/home/header/user.png"
                    }
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
              src={
                useWhiteHeader
                  ? "/cineflash/home/Header/cnaghsh-logo-white.png"
                  : "/cineflash/home/header/cnaghsh-logo.png"
              }
              alt="CNAGHSH ART GROUP"
              fill
              sizes="130px"
              style={{ objectFit: "contain" }}
              unoptimized
              priority
            />
          </Link>
          </div>
        </div>

        <div className="lg:hidden">
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
            <button
              type="button"
              aria-label="menu"
              aria-expanded={isMenuOpen}
              onClick={() => {
                if (isDesktop) return;
                setIsMenuOpen((prev) => !prev);
              }}
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
                  useWhiteHeader
                    ? "/cineflash/home/Header/menu-white.png"
                    : "/cineflash/home/header/menu.png"
                }
                alt="Menu"
                width={MENU_W}
                height={MENU_H}
                unoptimized
                priority
                style={{
                  display: "block",
                  objectFit: "contain",
                }}
              />
            </button>

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
                src={
                  useWhiteHeader
                    ? "/cineflash/home/Header/cnaghsh-logo-white.png"
                    : "/cineflash/home/header/cnaghsh-logo.png"
                }
                alt="CNAGHSH ART GROUP"
                fill
                sizes="130px"
                style={{ objectFit: "contain" }}
                unoptimized
                priority
              />
            </Link>
          </div>
        </div>
      </header>
      {!isDesktop ? (
        <div
          className={`fixed inset-0 z-[120] ${
            isMenuOpen ? "pointer-events-auto" : "pointer-events-none"
          }`}
          aria-hidden={!isMenuOpen}
        >
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
              isMenuOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setIsMenuOpen(false)}
          />
          <div
            dir="rtl"
            role="dialog"
            aria-modal="true"
            className={`absolute top-0 right-0 h-full w-full bg-[#2F3439] text-white transform transition-transform duration-300 ease-out ${
              isMenuOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
            }`}
            style={{ fontFamily: "IRANSans" }}
          >
            <div className="relative h-full w-full overflow-y-auto px-6 py-6">
              <button
                type="button"
                aria-label="close menu"
                onClick={() => setIsMenuOpen(false)}
                className="absolute left-4 top-4 text-xl"
              >
                ×
              </button>

              <div className="mt-10 flex flex-col gap-4 text-lg">
                <Link
                  href="/auth?tab=signup"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsMoreOpen(false);
                  }}
                >
                  ثبت نام
                </Link>
                <Link
                  href="/profiles"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsMoreOpen(false);
                  }}
                >
                  جست‌ و جوی هنرمندان
                </Link>
                <Link
                  href={session?.user ? "/dashboard/profile" : "/auth?tab=signup"}
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsMoreOpen(false);
                  }}
                >
                  پروفایل
                </Link>

                <button
                  type="button"
                  aria-expanded={isMoreOpen}
                  onClick={() => setIsMoreOpen((prev) => !prev)}
                  className="flex items-center justify-between"
                >
                  <span>بیشتر</span>
                  <span className="text-xl">{isMoreOpen ? "-" : "+"}</span>
                </button>

                {isMoreOpen ? (
                  <div className="pt-2">
                    <CineMenuOverlayContent
                      mode="mobile"
                      onNavigate={() => {
                        setIsMenuOpen(false);
                        setIsMoreOpen(false);
                      }}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <CineMenuOverlay
        open={isDesktop && isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
      />
    </>
  );
}
