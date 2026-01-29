import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { headers } from "next/headers";

import { iransansMedium } from "@/app/fonts";
import { ConsentGate } from "@/components/analytics/ConsentGate";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";
import { Toaster } from "@/components/ui/toaster";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_DESCRIPTION, SITE_LOCALE, SITE_LOGO_PATH, SITE_NAME } from "@/lib/seo/constants";
import { getBaseUrl } from "@/lib/seo/baseUrl";
import { siteOrganizationJsonLd } from "@/lib/seo/jsonld";



const isStaging = process.env.NEXT_PUBLIC_ENV === "staging";
const appBaseUrl = getBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(appBaseUrl),
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

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  const baseUrl = appBaseUrl;
  const organizationJsonLd = siteOrganizationJsonLd({
    name: SITE_NAME,
    url: baseUrl,
    logoUrl: `${baseUrl}${SITE_LOGO_PATH}`,
  });
  const isAuthRoute = isAuthPath();

  return (
    <html lang="fa-IR" dir="rtl" suppressHydrationWarning className={iransansMedium.className}>
      <body className="min-h-screen font-sans antialiased">
        <SessionProvider>
          <ThemeProvider>
            <div className="relative flex min-h-screen flex-col">
              <ConsentGate />
              {!isAuthRoute ? <Header /> : null}
              <main className="flex-1">{children}</main>
              <JsonLd data={organizationJsonLd} />
              {!isAuthRoute ? <Footer /> : null}
            </div>
            <Toaster />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

function isAuthPath() {
  const headerList = headers();
  const headerCandidates = ["x-invoke-path", "x-matched-path", "next-url"] as const;
  let pathname: string | null = null;

  for (const name of headerCandidates) {
    const value = headerList.get(name);
    if (!value) continue;

    if (name === "next-url") {
      pathname = extractPathname(value);
    } else {
      pathname = value;
    }

    if (pathname) {
      break;
    }
  }

  if (!pathname) {
    return false;
  }

  const normalizedPathname = pathname.replace(/\/\([^/]+\)/g, "");
  const authRoutes = ["/auth", "/signin", "/signup"];

  return authRoutes.some((route) => {
    return (
      normalizedPathname === route ||
      normalizedPathname.startsWith(`${route}/`)
    );
  });
}

function extractPathname(value: string) {
  try {
    const parsed =
      value.startsWith("http://") || value.startsWith("https://")
        ? new URL(value)
        : new URL(value, "http://localhost");
    return parsed.pathname;
  } catch {
    return value.startsWith("/") ? value : `/${value}`;
  }
}
