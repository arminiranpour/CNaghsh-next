import Container from "@/components/layout/Container"
import Section from "@/components/layout/Section"
import { Button } from "@/components/ui/button"

const stats = [
  { value: "۶۰۰+", label: "بازیگر فعال" },
  { value: "۱۵۰+", label: "پروژه در جریان" },
  { value: "۹۸٪", label: "رضایت کارگردانان" },
]

export default function StatsBand() {
  return (
    <Section className="bg-[#ffffff] pb-20 pt-16">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 space-y-6 text-right lg:order-1">
            <span className="inline-flex items-center rounded-full bg-[#ff7f19]/10 px-4 py-1 text-xs font-semibold text-[#ff7f19]">
              ما کنار شما هستیم
            </span>
            <h2 className="text-3xl font-bold text-[#111111] sm:text-4xl">
              همه ما یک جامعه هستیم!
            </h2>
            <p className="text-base leading-relaxed text-[#4a4a4a] sm:text-lg">
              به انجمن متخصصان بازیگری بپیوندید؛ کار پیدا کنید، همکاری‌های تازه شکل دهید و در کنار هم رشد کنید. سی‌نفلش خانه‌ی امن برای قصه‌گوها و ستاره‌هاست.
            </p>

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-[#f0f0f0] bg-[#fafafa] px-6 py-4 text-center shadow-sm">
                  <dt className="text-xl font-extrabold text-[#ff7f19]">{stat.value}</dt>
                  <dd className="mt-1 text-xs text-[#7d7d7d]">{stat.label}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-4">
              <Button
                variant="outline"
                className="rounded-full border-[#ff7f19] px-8 py-3 text-sm font-semibold text-[#ff7f19] transition-colors hover:bg-[#ff7f19] hover:text-[#ffffff]"
              >
                سوال دارید؟
              </Button>
              <Button className="rounded-full bg-[#111111] px-8 py-3 text-sm font-semibold text-[#ffffff] transition-colors hover:bg-[#1e3016]">
                به سی‌نفلش بپیوندید
              </Button>
            </div>
          </div>

          <div className="relative order-1 mx-auto max-w-lg overflow-hidden rounded-[2rem] bg-[#f6f6f6] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.08)] lg:order-2">
            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-[#ff7f19]/20 via-transparent to-[#1e3016]/20" />
            <img
              src="/cineflash/3d-illustration-film-equipment-laptop-camera-reels.jpg"
              alt="تجهیزات سینمایی"
              className="relative z-10 h-full w-full rounded-[1.5rem] object-cover"
            />
          </div>
        </div>
      </Container>
    </Section>
  )
}
