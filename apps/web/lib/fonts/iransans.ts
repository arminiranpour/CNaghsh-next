import localFont from "next/font/local";

export const iranSans = localFont({
  src: [
    {
      path: "../../public/fonts/iransans/iransansweb_b1g9.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-iransans",
  display: "swap",
});
