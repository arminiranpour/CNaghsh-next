import { Instagram, Send } from "lucide-react"

import Container from "@/components/layout/Container"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const navigationLinks = [
  {
    title: "سی‌نفلش",
    links: [
      { label: "خانه", href: "#" },
      { label: "درباره سی‌نفلش", href: "#" },
    ],
  },
  {
    title: "پروفایل",
    links: [
      { label: "ثبت نام", href: "#" },
      { label: "ورود اعضاء", href: "#" },
      { label: "تکمیل پروفایل", href: "#" },
    ],
  },
]

const socialLinks = [
  { icon: <Instagram className="h-5 w-5" />, label: "اینستاگرام", href: "#" },
  { icon: <Send className="h-5 w-5" />, label: "تلگرام", href: "#" },
  {
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
      </svg>
    ),
    label: "ایمیل",
    href: "mailto:hello@cineflash.app",
  },
]

export default function Footer() {
  return (
    <footer className="bg-[#0f1a0b] py-14 text-[#f7f7f7]">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1.5fr_repeat(2,1fr)] xl:grid-cols-[1.6fr_repeat(3,1fr)]">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ff7f19] text-[#0f1a0b]">
                <span className="text-lg font-extrabold">CF</span>
              </div>
              <div>
                <p className="text-sm font-bold">CineFlash</p>
                <p className="text-xs text-[#a4a4a4]">خانواده‌ی خلاقان تصویر</p>
              </div>
            </div>
            <p className="max-w-sm text-sm leading-loose text-[#b9b9b9]">
              سی‌نفلش پلتفرمی برای کشف استعدادها، معرفی پروژه‌ها و اتصال بازیگران به فرصت‌های حرفه‌ای در صنعت سینما و تئاتر است.
            </p>
          </div>

          {navigationLinks.map((column) => (
            <div key={column.title}>
              <h3 className="mb-4 text-sm font-semibold text-[#ffffff]">{column.title}</h3>
              <ul className="space-y-2 text-sm text-[#a4a4a4]">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="transition-colors hover:text-[#ffffff]">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="mb-4 text-sm font-semibold text-[#ffffff]">ارتباط با ما</h3>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="text-[#a4a4a4] transition-colors hover:text-[#ffffff]"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-[#ffffff]">به خبرنامه سی‌نفلش بپیوندید</h3>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                type="email"
                placeholder="ایمیل شما"
                className="h-11 rounded-full border border-[#3a4c33] bg-transparent text-xs text-[#f7f7f7] placeholder:text-[#6f7f68] focus-visible:ring-[#ff7f19]"
              />
              <Button className="rounded-full bg-[#ff7f19] px-6 py-2 text-xs font-semibold text-[#0f1a0b] transition-colors hover:bg-[#ff9545]">
                ارسال
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-[#26351e] pt-6 text-xs text-[#6f7f68] sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} CineFlash. همه‌ی حقوق محفوظ است.</span>
          <span>ساخته شده با عشق برای هنرمندان.</span>
        </div>
      </Container>
    </footer>
  )
}
