import { Button } from "@/components/ui/button"

export default function StatsBand() {

  return (
    <section className="bg-[#e5e5e5] px-6 py-16 md:px-12 lg:px-24">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:gap-12">
          <div className="flex-1">
            <img
              src="/cineflash/3d-illustration-film-equipment-laptop-camera-reels.jpg"
              alt="Film equipment illustration"
              className="mx-auto h-auto w-full max-w-md"
            />
          </div>

          <div className="flex-1 text-right">
            <h2 className="mb-6 text-3xl font-bold text-[#ff7f19] md:text-4xl">همه ما یک جامعه هستیم!</h2>
            <p className="mb-8 text-base leading-relaxed text-[#000000] md:text-lg">
              به انجمن متخصصان بازیگری بپیوندید. کار پیدا کنید، همکاری کنید و از یکدیگر حمایت کنید. همه در یک مکان.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button
                variant="outline"
                className="rounded-full border-2 border-[#ff7f19] bg-transparent px-8 py-3 text-[#ff7f19] transition-colors hover:bg-[#ff7f19] hover:text-[#ffffff]"
              >
                سوال دارید؟
              </Button>
              <Button className="rounded-full bg-[#ffffff] px-8 py-3 text-[#000000] transition-colors hover:bg-[#dfdfdf]">
                به سی‌نفلش بپیوندید
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
