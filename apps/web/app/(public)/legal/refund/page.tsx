import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "خط‌مشی بازپرداخت | سی‌نقش",
  description: "شرایط بازپرداخت و لغو اشتراک در محیط آزمایشی سی‌نقش.",
};

const policies: Array<{ title: string; content: string }> = [
  {
    title: "درخواست بازپرداخت",
    content:
      "در محیط آزمایشی، بازپرداخت تنها در صورت بروز خطای فنی و عدم دسترسی به خدمات پس از پرداخت انجام می‌شود. درخواست باید حداکثر تا ۷۲ ساعت پس از پرداخت ارسال گردد.",
  },
  {
    title: "لغو اشتراک",
    content:
      "لغو اشتراک از طریق داشبورد صورتحساب فعال می‌شود و از انتهای دوره جاری اعمال خواهد شد. مبالغ دوره جاری قابل استرداد نیست.",
  },
  {
    title: "تماس با پشتیبانی",
    content:
      "برای پیگیری درخواست بازپرداخت، اطلاعات پرداخت و شناسه کاربری خود را به آدرس support@example.com ارسال کنید. پاسخ‌گویی در ساعات کاری انجام می‌شود.",
  },
];

export default function RefundPolicyPage() {
  return (
    <div className="container space-y-10 py-12">
      <div className="space-y-3 text-right">
        <h1 className="text-3xl font-bold text-foreground">خط‌مشی بازپرداخت (محیط آزمایشی)</h1>
        <p className="text-sm text-muted-foreground">
          این سیاست برای شفافیت فرآیند بازپرداخت در فاز آزمایشی سی‌نقش تدوین شده است.
        </p>
      </div>
      <div className="space-y-6">
        {policies.map((item) => (
          <section key={item.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-foreground">{item.title}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.content}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
