import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

import { ConsentGate } from "@/components/analytics/ConsentGate";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { Header, type NavigationItem } from "@/components/site/header";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_DESCRIPTION, SITE_LOCALE, SITE_LOGO_PATH, SITE_NAME } from "@/lib/seo/constants";
import { getBaseUrl } from "@/lib/seo/baseUrl";
import { siteOrganizationJsonLd } from "@/lib/seo/jsonld";

const navigation = [
  { href: "/", label: "خانه" },
  { href: "/castings", label: "فراخوان‌ها" },
  {
    href: {
      pathname: "/users/[id]",
      query: { id: "123" }
    },
    label: "کاربران",
  },
] satisfies NavigationItem[];

const isStaging = process.env.NEXT_PUBLIC_ENV === "staging";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  robots: isStaging
    ? {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
        },
      }
    : undefined,
};

import "./globals.css";
import { iransans } from "./fonts";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className={`${iransans.variable} font-iransans antialiased`}>
        {children}
      </body>
    </html>
  );
}
