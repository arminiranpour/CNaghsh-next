import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

import { SiteShell } from "@acme/ui";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

const navigation = [
  { href: "/", label: "خانه" },
  { href: "/castings", label: "فراخوان‌ها" },
  { href: "/talent/123", label: "استعدادها" }
];

export const metadata: Metadata = {
  title: "بازار فراخوان بازیگری",
  description: "اسکلت اولیه بازارگاه فراخوان‌ها و استعدادها"
};

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="fa-IR" dir="rtl" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <SiteShell navigation={navigation}>{children}</SiteShell>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}