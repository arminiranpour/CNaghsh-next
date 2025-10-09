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

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  const baseUrl = getBaseUrl();
  const organizationJsonLd = siteOrganizationJsonLd({
    name: SITE_NAME,
    url: baseUrl,
    logoUrl: `${baseUrl}${SITE_LOGO_PATH}`,
  });

  return (
    <html lang="fa-IR" dir="rtl" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <div className="flex min-h-screen flex-col bg-background">
            <Header navigation={navigation} />
            <ConsentGate />
            <main className="flex-1">{children}</main>
            <JsonLd data={organizationJsonLd} />
            <footer className="border-t border-border bg-card/50">
              <div className="container flex flex-col gap-2 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>© {new Date().getFullYear()} بازارگاه فراخوان‌ها</span>
                <span>ساخته شده برای اسپرینت صفر</span>
              </div>
            </footer>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}