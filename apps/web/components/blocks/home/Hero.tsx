import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function Hero() {
  return (
    <section className="relative bg-[#000000] px-6 py-12 md:px-12 lg:px-24">
      <div className="mx-auto max-w-7xl">
        <div className="relative rounded-[2.5rem] border-4 border-[#ffffff] p-8 md:p-12">
          <img
            src="/cineflash/vintage-black-and-white-cinematographer-with-film-.jpg"
            alt="Vintage cinematographer"
            className="h-[400px] w-full rounded-2xl object-cover md:h-[500px]"
          />

          <button
            type="button"
            className="absolute bottom-8 left-8 flex h-12 w-12 items-center justify-center rounded-full bg-[#ffffff]/10 backdrop-blur-sm transition-colors hover:bg-[#ffffff]/20"
          >
            <ArrowLeft className="h-6 w-6 text-[#ffffff]" />
          </button>

          <Button
            variant="secondary"
            className="absolute bottom-8 right-8 rounded-full bg-[#ffffff] px-6 py-2 text-sm text-[#000000] transition-colors hover:bg-[#e5e5e5]"
          >
            درباره سی‌نفلش
          </Button>
        </div>

        <div className="mt-8 text-center">
          <h1 className="text-5xl font-bold text-[#ff7f19] md:text-6xl lg:text-7xl">سی‌نفلش</h1>
          <div className="mt-4 flex items-center justify-center gap-4 text-lg text-[#ffffff] md:text-xl">
            <span>سینما</span>
            <span>آرتیستیک</span>
            <span>تئاتر</span>
          </div>
                    <p className="mt-6 text-sm text-[#ffffff] md:text-base">
            بزرگترین جامعهٔ جهانی بازیگران فیلم، تئاتر، شبکه‌های خانگی، تلویزیون
          </p>
        </div>
      </div>
    </section>
  )
}
