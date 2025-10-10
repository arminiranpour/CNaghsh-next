import { ArrowLeft } from "lucide-react"

import Container from "@/components/layout/Container"
import Section from "@/components/layout/Section"
import { Button } from "@/components/ui/button"

const taglines = ["سینما", "آرتیستیک", "تئاتر"]

export default function Hero() {
  return (
    <Section className="relative overflow-hidden bg-[#000000] pb-20 pt-14 text-[#ffffff]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#050505] via-transparent to-[#1e3016]/30" />
      <Container className="relative">
        <div className="grid gap-12">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-[#ffffff]/40 bg-[#0f0f0f] p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)] sm:p-8 md:p-10">
            <img
              src="/cineflash/vintage-black-and-white-cinematographer-with-film-.jpg"
              alt="فیلمبردار قدیمی در حال کار"
              className="h-[320px] w-full rounded-[2rem] object-cover sm:h-[380px] md:h-[440px]"
            />

            <div className="pointer-events-none absolute inset-6 rounded-[2rem] bg-gradient-to-tr from-[#000000]/60 via-transparent to-[#ff7f19]/30" />

            <button
              type="button"
              className="absolute bottom-10 left-10 flex h-12 w-12 items-center justify-center rounded-full border border-[#ffffff]/40 bg-[#000000]/60 backdrop-blur-sm transition-colors hover:bg-[#1e3016]/70"
              aria-label="مشاهده اسلاید قبلی"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <Button
              variant="secondary"
              className="absolute bottom-10 right-10 rounded-full bg-[#ffffff] px-6 py-2 text-sm font-semibold text-[#000000] transition-colors hover:bg-[#f5f5f5]"
            >
              درباره سی‌نفلش
            </Button>
          </div>

          <div className="text-center">
            <span className="inline-flex items-center justify-center rounded-full border border-[#ff7f19]/50 bg-[#ff7f19]/15 px-4 py-2 text-xs tracking-wide text-[#ffbf70]">
              جامعه‌ی حرفه‌ای بازیگران ایران و جهان
            </span>
            <h1 className="mt-6 text-4xl font-extrabold text-[#ff7f19] sm:text-5xl md:text-6xl">سی‌نفلش</h1>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-base font-medium sm:text-lg">
              {taglines.map((tagline) => (
                <span key={tagline} className="rounded-full border border-[#ffffff]/20 px-5 py-2">
                  {tagline}
                </span>
              ))}
            </div>
            <p className="mt-6 text-sm leading-relaxed text-[#d1d1d1] sm:text-base">
              بزرگترین جامعهٔ جهانی بازیگران فیلم، تئاتر، شبکه‌های خانگی و تلویزیون. فضای حرفه‌ای برای کشف استعدادها و اتصال با فرصت‌های تازه.
            </p>
          </div>
        </div>
      </Container>
    </Section>
  )
}
