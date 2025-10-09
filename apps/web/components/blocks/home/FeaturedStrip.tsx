import Container from "@/components/layout/Container"

export default function FeaturedStrip() {
  return (
    <Container className="py-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">گزیده‌ها</h2>
        <a className="text-sm underline" href="/profiles">
          مشاهده همه
        </a>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <article className="rounded-2xl border p-4 h-40" />
        <article className="rounded-2xl border p-4 h-40" />
        <article className="rounded-2xl border p-4 h-40" />
      </div>
    </Container>
  )
}
