import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { Header, type NavigationItem } from "@/components/site/header";

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

export const metadata: Metadata = {
  title: "بازار فراخوان بازیگری",
  description: "اسکلت اولیه بازارگاه فراخوان‌ها و کاربران چندمنظوره"
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
          <div className="flex min-h-screen flex-col bg-background">
            <Header navigation={navigation} />
            <main className="flex-1">{children}</main>
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