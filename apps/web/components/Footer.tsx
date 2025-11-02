"use client";

import Image from "next/image";
import Link from "next/link";
import { Instagram, Send, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer
      style={{
        width: "100%",
        backgroundColor: "transparent",
        // فاصله از بنر بالا
        marginTop: "100px",

        paddingTop: "40px",
        paddingBottom: "60px",
        paddingLeft: "50px",
        paddingRight: "50px",

        fontFamily: "IRANSans",
        direction: "ltr",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",

          display: "flex",
          flexDirection: "row",
          flexWrap: "nowrap",

          alignItems: "flex-start",

          justifyContent: "space-between",

          columnGap: "40px",
        }}
      >
        {/* ستون ۱: لوگو */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            rowGap: "16px",
            color: "#0F0F0F",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "174px",
              height: "44px",
            }}
          >
            <Image
              src="/cineflash/home/footer/cnaghsh-logo.png"
              alt="CNAGHSH ART GROUP"
              fill
              unoptimized
              sizes="174px"
              style={{
                objectFit: "contain",
              }}
            />
          </div>
        </div>

        {/* ستون ۲: سی‌نقش / خانه / درباره سی‌نقش */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minWidth: "140px",

            direction: "rtl",
            textAlign: "right",
            rowGap: "12px",
            color: "#0F0F0F",
          }}
        >
          <div
            style={{
              fontSize: "20px",
              fontWeight: 700,
              lineHeight: 1.4,
            }}
          >
            سی‌نقش
          </div>

          <Link
            href="/"
            style={{
              textDecoration: "none",
              color: "#0F0F0F",
              fontSize: "20px",
              fontWeight: 400,
              lineHeight: 1.5,
              transition: "color 0.3s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#F58A1F")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#0F0F0F")}
          >
            خانه
          </Link>

          <Link
            href="/about"
            style={{
              textDecoration: "none",
              color: "#0F0F0F",
              fontSize: "20px",
              fontWeight: 400,
              lineHeight: 1.5,
              transition: "color 0.3s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#F58A1F")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#0F0F0F")}
          >
            درباره سی‌نقش
          </Link>
        </div>

        {/* ستون ۳: پروفایل */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minWidth: "160px",

            direction: "rtl",
            textAlign: "right",
            rowGap: "12px",
            color: "#0F0F0F",
          }}
        >
          <div
            style={{
              fontSize: "20px",
              fontWeight: 700,
              lineHeight: 1.4,
            }}
          >
            پروفایل
          </div>

          <Link
            href="/register"
            style={{
              textDecoration: "none",
              color: "#0F0F0F",
              fontSize: "20px",
              fontWeight: 400,
              lineHeight: 1.5,
              transition: "color 0.3s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#F58A1F")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#0F0F0F")}
          >
            ثبت نام
          </Link>

          <Link
            href="/plans"
            style={{
              textDecoration: "none",
              color: "#0F0F0F",
              fontSize: "20px",
              fontWeight: 400,
              lineHeight: 1.5,
              transition: "color 0.3s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#F58A1F")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#0F0F0F")}
          >
            خرید اشتراک
          </Link>

          <Link
            href="/portfolio"
            style={{
              textDecoration: "none",
              color: "#0F0F0F",
              fontSize: "20px",
              fontWeight: 400,
              lineHeight: 1.5,
              transition: "color 0.3s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#F58A1F")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#0F0F0F")}
          >
            تکمیل پورتفولیو
          </Link>
        </div>

        {/* ستون ۴: ارتباط با ما */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minWidth: "160px",

            direction: "rtl",
            textAlign: "right",
            rowGap: "16px",
            color: "#0F0F0F",
          }}
        >
          <div
            style={{
              fontSize: "20px",
              fontWeight: 700,
              lineHeight: 1.4,
            }}
          >
            ارتباط با ما
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "flex-start",
              alignItems: "center",
              gap: "20px",
            }}
          >
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#0F0F0F",
                textDecoration: "none",
                display: "inline-flex",
                transition: "color 0.3s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#F58A1F")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#0F0F0F")}
            >
              <Instagram size={26} strokeWidth={1.8} />
            </a>

            <a
              href="https://t.me"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#0F0F0F",
                textDecoration: "none",
                display: "inline-flex",
                transition: "color 0.3s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#F58A1F")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#0F0F0F")}
            >
              <Send size={26} strokeWidth={1.8} />
            </a>

            <a
              href="mailto:info@example.com"
              style={{
                color: "#0F0F0F",
                textDecoration: "none",
                display: "inline-flex",
                transition: "color 0.3s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#F58A1F")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#0F0F0F")}
            >
              <Mail size={26} strokeWidth={1.8} />
            </a>
          </div>
        </div>

        {/* ستون ۵: خبرنامه */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",

            minWidth: "250px",

            direction: "rtl",
            textAlign: "right",
            color: "#0F0F0F",
            rowGap: "16px",
          }}
        >
          <div
            style={{
              fontSize: "20px",
              fontWeight: 700,
              lineHeight: 1.4,
            }}
          >
            به خبرنامه سی‌نقش بپیوندید
          </div>

          <div
            style={{
              position: "relative",
              width: "232px",
              height: "33px",
            }}
          >
            <input
              type="email"
              placeholder="آدرس ایمیل"
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50px",
                border: "none",
                backgroundColor: "#FFFFFF",
                outline: "none",
                padding: "0 70px 0 16px",
                fontFamily: "IRANSans",
                fontSize: "16px",
                color: "#0F0F0F",
                boxShadow: "0 0 0 1px #D9D9D9 inset",
              }}
            />

            <button
              style={{
                position: "absolute",
                left: "0px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "48px",
                height: "30px",
                border: "none",
                borderRadius: "50px",
                backgroundColor: "#979797",
                color: "#FFFFFF",
                fontSize: "14px",
                fontFamily: "IRANSans",
                cursor: "pointer",
              }}
            >
              ارسال
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
