import Container from "@/components/layout/Container"

export default function StatsBand() {
  const stats = [
    { k: "پروفایل فعال", v: "2,480+" },
    { k: "فرصت‌های تایید شده", v: "310+" },
    { k: "کارفرمایان", v: "120+" }
  ]
  return (
    <div className="bg-background">
      <Container className="py-8 grid grid-cols-3 gap-4 text-center">
        {stats.map((s, i) => (
          <div key={i} className="rounded-2xl border p-4">
            <div className="text-2xl font-bold">{s.v}</div>
            <div className="text-xs text-muted-foreground">{s.k}</div>
          </div>
        ))}
      </Container>
    </div>
  )
}
