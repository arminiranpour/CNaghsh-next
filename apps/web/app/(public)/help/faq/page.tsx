import type { Metadata } from "next";

const faqs: Array<{ question: string; answer: string }> = [
  {
    question: "چگونه می‌توانم اشتراک خود را تمدید کنم؟",
    answer:
      "از بخش قیمت‌گذاری یا داشبورد صورتحساب می‌توانید گزینه «تمدید اکنون» را انتخاب کنید. پس از پرداخت موفق، دوره اشتراک به‌صورت خودکار تمدید می‌شود.",
  },
  {
    question: "آیا می‌توانم پلن خود را در طول دوره تغییر بدهم؟",
    answer:
      "تغییر پلن در محیط آزمایشی از دوره بعدی اعمال می‌شود. پس از تکمیل پرداخت، پلن جدید از شروع چرخه بعدی فعال خواهد شد.",
  },
  {
    question: "برای خرید آگهی تک چه شرایطی دارد؟",
    answer:
      "با انتخاب گزینه خرید تکی می‌توانید بدون اشتراک، یک آگهی شغلی منتشر کنید. پرداخت به‌صورت آنلاین و با درگاه امن زرین‌پال انجام می‌شود.",
  },
  {
    question: "در صورت بروز خطا در پرداخت چه کار باید کرد؟",
    answer:
      "در صورت عدم موفقیت پرداخت، می‌توانید مجدداً تلاش کنید یا با پشتیبانی سی‌نقش از طریق ایمیل support@example.com تماس بگیرید.",
  },
];

export const metadata: Metadata = {
  title: "سؤالات متداول | سی‌نقش",
  description: "پاسخ به پرسش‌های پرتکرار درباره اشتراک‌ها و پرداخت در سی‌نقش.",
};

export default function FaqPage() {
  return (
    <div className="container space-y-10 py-12">
      <div className="space-y-3 text-right">
        <h1 className="text-3xl font-bold text-foreground">سؤالات متداول</h1>
        <p className="text-sm text-muted-foreground">
          پاسخ کوتاه به سوالات پرتکرار درباره اشتراک، پرداخت و مدیریت آگهی در سی‌نقش.
        </p>
      </div>
      <dl className="space-y-6">
        {faqs.map((item) => (
          <div key={item.question} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <dt className="text-lg font-semibold text-foreground">{item.question}</dt>
            <dd className="mt-3 text-sm leading-7 text-muted-foreground">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
