import { ArrowLeft, ArrowRight } from "lucide-react"

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
    alt: "Actor",
    name: "نام و نام خانوادگی",
    age: "سن ۳۲ سال",
  },
  {
    src: "/cineflash/professional-headshot-male-actor-smiling.jpg",
    alt: "Actor",
    name: "نام و نام خانوادگی",
    age: "سن ۳۲ سال",
  },
  {
    src: "/cineflash/professional-headshot-male-actor-business-casual.jpg",
    alt: "Actor",
    name: "نام و نام خانوادگی",
    age: "سن ۳۲ سال",
    highlight: true,
  },
  {
    src: "/cineflash/professional-headshot-male-actor-confident.jpg",
    alt: "Actor",
    name: "نام و نام خانوادگی",
    age: "سن ۳۲ سال",
  },
  {
    src: "/cineflash/professional-headshot-male-actor-friendly.jpg",
    alt: "Actor",
    name: "نام و نام خانوادگی",
    age: "سن ۳۲ سال",
  },
  {
    src: "/cineflash/professional-headshot-male-actor-casual.jpg",
    alt: "Actor",
    name: "دکی",
    age: "سن ۳۲ سال",
  },
]

export default function HowItWorks() {
  return (
    <section className="bg-[#e5e5e5] px-6 pb-16 md:px-12 lg:px-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <Button
            variant="outline"
            className="rounded-full border-2 border-[#ff7f19] bg-transparent px-6 py-2 text-sm text-[#ff7f19] transition-colors hover:bg-[#ff7f19] hover:text-[#ffffff]"
          >
            جست و جوی پیشرفته
          </Button>
          <h2 className="text-2xl font-bold text-[#ff7f19] md:text-3xl">بازیگران برتر سی‌نفلش</h2>
        </div>

        <div className="relative">
          <button
            type="button"
            className="absolute -left-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#000000] text-[#ffffff] shadow-lg transition-colors hover:bg-[#1e3016]"
          >
            <ArrowRight className="h-6 w-6" />
          </button>

          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {actors.map((actor) => (
              <Card
                key={`${actor.src}-${actor.name}`}
                className={`min-w-[200px] flex-shrink-0 rounded-3xl bg-[#ffffff] p-4 shadow-lg ${
                  actor.highlight ? "min-w-[220px] border-4 border-[#ff7f19] shadow-xl" : ""
                }`}
              >
                <div className={`relative mb-3 ${actor.highlight ? "h-[220px]" : "h-[200px]"}`}>
                  <img
                    src={actor.src}
                    alt={actor.alt}
                    className="h-full w-full rounded-2xl object-cover"
                  />
                  <span className="absolute left-2 top-2 rounded-full bg-[#ff7f19] px-3 py-1 text-xs text-[#ffffff]">
                    برگزیده
                  </span>
                </div>
                <h3 className="text-center text-sm font-semibold text-[#000000]">{actor.name}</h3>
                <p className="text-center text-xs text-[#979797]">{actor.age}</p>
              </Card>
            ))}
          </div>

          <button
            type="button"
            className="absolute -right-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#000000] text-[#ffffff] shadow-lg transition-colors hover:bg-[#1e3016]"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
        </div>
      </div>
    </section>
  )
}
