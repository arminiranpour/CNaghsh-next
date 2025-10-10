import type { CSSProperties } from "react"

import { Card } from "@/components/ui/card"

type Category = {
  title: string
  src: string
  alt: string
  imageClassName?: string
  highlight?: boolean
  style?: CSSProperties
}

const categories: Category[] = [
  {
    title: "بازیگران کودک و نوجوان دختر",
    src: "/cineflash/child-and-teen-actors-icon-illustration.jpg",
    alt: "Child actors",
    imageClassName: "opacity-60",
  },
  {
    title: "بازیگران کودک و نوجوان پسر",
    src: "/cineflash/child-and-teen-boy-actors-icon-illustration.jpg",
    alt: "Child actors",
    imageClassName: "opacity-60",
  },
  {
    title: "بازیگران پرنفلش حامی",
    src: "/cineflash/female-supporting-actress-icon-orange.jpg",
    alt: "Supporting actors",
    highlight: true,
    style: {
      filter: "invert(48%) sepia(79%) saturate(2476%) hue-rotate(346deg) brightness(104%) contrast(97%)",
    },
  },
  {
    title: "بازیگران پرنفلش اول",
    src: "/cineflash/male-principal-actor-icon-illustration.jpg",
    alt: "Principal actors",
    imageClassName: "opacity-60",
  },
]
export default function FeaturedStrip() {
  return (
        <section className="bg-[#e5e5e5] px-6 py-16 md:px-12 lg:px-24">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <Card
              key={category.title}
              className="flex flex-col items-center justify-center rounded-3xl bg-[#d9d9d9] p-8 shadow-lg transition-transform hover:scale-105"
            >
              <div className="mb-4 h-24 w-24">
                <img
                  src={category.src}
                  alt={category.alt}
                  className={`h-full w-full object-contain ${category.imageClassName ?? ""}`.trim()}
                  style={category.style}
                />
              </div>
              <p
                className={`text-center text-sm ${
                  category.highlight ? "font-semibold text-[#ff7f19]" : "text-[#000000]"
                }`}
              >
                {category.title}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
