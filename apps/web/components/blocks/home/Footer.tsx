import { Instagram, Send } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function Footer() {
  return (
    <footer className="bg-[#1e3016] px-6 py-12 text-[#ffffff] md:px-12 lg:px-24">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col items-start">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffffff]">
                <span className="text-lg font-bold text-[#1e3016]">CN</span>
              </div>
              <div>
                <p className="text-sm font-bold">CNAGHSH</p>
                <p className="text-xs text-[#979797]">ART GROUP</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold">سی‌نفلش</h3>
            <ul className="space-y-2 text-sm text-[#979797]">
              <li>
                <a href="#" className="transition-colors hover:text-[#ffffff]">
                  خانه
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-[#ffffff]">
                  درباره سی‌نفلش
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold">پروفایل</h3>
            <ul className="space-y-2 text-sm text-[#979797]">
              <li>
                <a href="#" className="transition-colors hover:text-[#ffffff]">
                  ثبت نام
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-[#ffffff]">
                  ورود اعضاء
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-[#ffffff]">
                  تکمیل پروفایل
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold">ارتباط با ما</h3>
            <div className="flex gap-4">
              <a href="#" className="text-[#979797] transition-colors hover:text-[#ffffff]">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-[#979797] transition-colors hover:text-[#ffffff]">
                <Send className="h-5 w-5" />
              </a>
              <a href="#" className="text-[#979797] transition-colors hover:text-[#ffffff]">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold">به خبرنامه سی‌نفلش بپیوندید</h3>
            <div className="flex gap-2">
              <Button size="sm" className="rounded-full bg-[#979797] px-4 py-2 text-xs text-[#ffffff] transition-colors hover:bg-[#969696]">
                ارسال
              </Button>
              <input
                type="email"
                placeholder="ایمیل شما"
                className="flex-1 rounded-full bg-[#ffffff]/10 px-4 py-2 text-xs text-[#ffffff] placeholder:text-[#979797] focus:outline-none focus:ring-2 focus:ring-[#ff7f19]"
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}