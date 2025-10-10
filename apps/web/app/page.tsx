import Hero from "@/components/blocks/home/Hero"
import FeaturedStrip from "@/components/blocks/home/FeaturedStrip"
import HowItWorks from "@/components/blocks/home/HowItWorks"
import StatsBand from "@/components/blocks/home/StatsBand"
import Footer from "@/components/blocks/home/Footer"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#000000] font-sans">
      <Hero />
      <FeaturedStrip />
      <HowItWorks />
      <StatsBand />
      <Footer />
    </main>
  )
}
