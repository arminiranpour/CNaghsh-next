import Section from "@/components/layout/Section"
import Container from "@/components/layout/Container"

const steps = [
  { t: "ثبت‌نام", d: "ساخت حساب کاربری و ورود" },
  { t: "ایجاد پروفایل", d: "اطلاعات و نمونه کارها" },
  { t: "درخواست فرصت", d: "یافتن و ارسال درخواست" }
]

export default function HowItWorks() {
  return (
    <Section className="bg-muted/30 border-y">
      <Container>
        <h2 className="text-xl font-semibold mb-6">چطور کار می‌کند؟</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {steps.map((s, i) => (
            <div key={i} className="rounded-2xl border p-4">
              <div className="text-3xl font-bold mb-2">{i + 1}</div>
              <div className="font-medium">{s.t}</div>
              <div className="text-sm text-muted-foreground">{s.d}</div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  )
}
