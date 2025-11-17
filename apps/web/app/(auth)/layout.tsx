import type { ReactNode } from "react";
import localFont from "next/font/local";

const iranSans = localFont({
  src: [
    {
      path: "../../public/fonts/IRANSansWeb.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/IRANSansWeb_Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/IRANSansWeb_Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/IRANSansWeb_Black.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  display: "swap",
});

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={iranSans.className}>
      {children}
    </div>
  );
}
