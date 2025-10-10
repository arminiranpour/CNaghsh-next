import { ArrowLeft, ArrowRight } from "lucide-react"

import Container from "@/components/layout/Container"
import Section from "@/components/layout/Section"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

type ActorCard = {
  src: string
  alt: string
  name: string
  age: string
  highlight?: boolean
}

const actors: ActorCard[] = [
  {
    src: "/cineflash/professional-headshot-male-actor.jpg",
    alt: "پرتره بازیگر",
    name: "نام و نام خانوادگی",
    age: "سن ۳۲ سال",
  },
  {
    src: "/cineflash/professional-headshot-male-actor-smiling.jpg",
    alt: "پرتره بازیگر",
    name: "نام و نام خانوادگی",
    age: "سن ۳۲ سال",
  },
  {
    src: "/cineflash/professional-headshot-male-actor-business-casual.jpg",
    alt: "پرتره بازیگر",
    name: "نام و نام خانوادگی",
    age: "سن ۳۲ سال",
    highlight: true,
  },
  {
    src: "/cineflash/professional-headshot-male-actor-confident.jpg",
    alt: "پرتره بازیگر",
    name: "نام و نام خانوادگی",
    age: "سن ۳۲ سال",
  },
  {
    src: "/cineflash/professional-headshot-male-actor-friendly.jpg",
    alt: "پرتره بازیگر",
    name: "نام و نام خانوادگی",
    age: "سن ۳۲ سال",
  },
  {
    src: "/cineflash/professional-headshot-male-actor-casual.jpg",
    alt: "پرتره بازیگر",
    name: "نام و نام خانوادگی",
    age: "سن ۳۲ سال",
  },
]

export default function HowItWorks() {
  return (
    <Section className="bg-[#f3f3f3] pb-16">
      <Container>
        <div className="flex flex-wrap items-center justify-between gap-4 pb-8">
          <div className="text-right">
            <p className="text-xs text-[#7d7d7d]">منتخب این هفته</p>
            <h2 className="text-2xl font-bold text-[#ff7f19] sm:text-3xl">بازیگران برتر سی‌نفلش</h2>
          </div>
          <Button
            variant="outline"
            className="rounded-full border-[#ff7f19] px-6 py-2 text-sm font-semibold text-[#ff7f19] transition-colors hover:bg-[#ff7f19] hover:text-[#ffffff]"
          >
            جست‌وجوی پیشرفته
          </Button>
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="اسکرول به راست"
            className="absolute -left-6 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#111111]/20 bg-[#ffffff] text-[#111111] shadow-lg transition-all hover:bg-[#ff7f19] hover:text-[#ffffff] lg:flex"
          >
            <ArrowRight className="h-5 w-5" />
          </button>

          <div className="flex gap-4 overflow-x-auto pb-6 pl-1 pr-1 scrollbar-hide">
            {actors.map((actor) => (
              <Card
                key={`${actor.src}-${actor.name}`}
                className={`flex h-full min-w-[200px] flex-shrink-0 flex-col rounded-3xl border-none bg-[#ffffff] p-4 shadow-[0_15px_35px_rgba(0,0,0,0.1)] transition-transform hover:-translate-y-1 ${
                  actor.highlight ? "min-w-[220px] border border-[#ff7f19]/60 shadow-[0_25px_40px_rgba(255,127,25,0.25)]" : ""
                }`}
              >
                <div className={`relative mb-4 overflow-hidden rounded-[1.5rem] ${actor.highlight ? "h-[230px]" : "h-[210px]"}`}>
                  <img
                    src={actor.src}
                    alt={actor.alt}
                    className="h-full w-full object-cover"
                  />
                  {actor.highlight ? (
                    <span className="absolute right-3 top-3 rounded-full bg-[#ff7f19] px-4 py-1 text-xs font-semibold text-[#ffffff] shadow-lg">
                      برگزیده
                    </span>
                  ) : null}
                </div>
                <h3 className="text-center text-sm font-semibold text-[#1a1a1a]">{actor.name}</h3>
                <p className="text-center text-xs text-[#7d7d7d]">{actor.age}</p>
              </Card>
            ))}
          </div>

          <button
            type="button"
            aria-label="اسکرول به چپ"
            className="absolute -right-6 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#111111]/20 bg-[#ffffff] text-[#111111] shadow-lg transition-all hover:bg-[#ff7f19] hover:text-[#ffffff] lg:flex"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
      </Container>
    </Section>
  )
}
