import localFont from "next/font/local";

export const iransans = localFont({
  src: [
    
    { path: "../public/fonts/iransans/iransansweb_b1g9.ttf", weight: "400", style: "normal" },
  ],
  variable: "--font-iransans",
  display: "swap",
});

export const iransansMedium = localFont({
  src: [
    { path: "../public/fonts/IRANSansWeb_Medium.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-iransans-medium",
  display: "swap",
});

export const iransansBold = localFont({
  src: [
    { path: "../public/fonts/IRANSansWeb_Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-iransans-bold",
  display: "swap",
});