import type { CSSProperties } from "react"

import Container from "@/components/layout/Container"
import Section from "@/components/layout/Section"
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
    alt: "بازیگر کودک دختر",
    imageClassName: "opacity-70",
  },
  {
    title: "بازیگران کودک و نوجوان پسر",
    src: "/cineflash/child-and-teen-boy-actors-icon-illustration.jpg",
    alt: "بازیگر کودک پسر",
    imageClassName: "opacity-70",
  },
  {
    title: "بازیگران پرنفلش حامی",
    src: "/cineflash/female-supporting-actress-icon-orange.jpg",
    alt: "بازیگران نقش حامی",
    highlight: true,
    style: {
      filter: "invert(48%) sepia(79%) saturate(2476%) hue-rotate(346deg) brightness(104%) contrast(97%)",
    },
  },
  {
    title: "بازیگران پرنفلش اول",
    src: "/cineflash/male-principal-actor-icon-illustration.jpg",
    alt: "بازیگران نقش اصلی",
    imageClassName: "opacity-70",
  },
]

export default function FeaturedStrip() {
  return (
    <Section className="bg-[#f3f3f3] pb-16 pt-12">
      <Container>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <Card
              key={category.title}
              className="flex h-full flex-col items-center justify-center gap-4 rounded-3xl border-none bg-[#ffffff] p-8 text-center shadow-[0_16px_50px_rgba(0,0,0,0.08)] transition-transform hover:-translate-y-2"
            >
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#f8f8f8]">
                <img
                  src={category.src}
                  alt={category.alt}
                  className={`h-20 w-20 object-contain ${category.imageClassName ?? ""}`.trim()}
                  style={category.style}
                />
              </div>
              <p
                className={`text-sm font-medium ${
                  category.highlight ? "text-[#ff7f19]" : "text-[#1f1f1f]"
                }`}
              >
                {category.title}
              </p>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  )
}
