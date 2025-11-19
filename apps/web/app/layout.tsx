import type { Metadata } from "next";
import type { ReactNode } from "react";

import { iransans } from "./fonts";
import "./globals.css";

import {
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
} from "@/lib/seo/constants";

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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className={`${iransans.variable} font-iransans antialiased`}>
        {children}
      </body>
    </html>
  );
}
