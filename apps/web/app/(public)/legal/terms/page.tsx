import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "شرایط استفاده | سی‌نقش",
  description:
    "قوانین استفاده از خدمات سی‌نقش شامل اشتراک‌ها، انتشار فراخوان و حفظ حریم خصوصی کاربران.",
};

const sections: Array<{ title: string; body: string[] }> = [
  {
    title: "۱. حساب کاربری",
    body: [
      "مسئولیت حفاظت از اطلاعات ورود بر عهده کاربر است.",
      "هر حساب تنها برای استفاده فرد یا سازمان ثبت‌کننده مجاز است و انتقال آن بدون هماهنگی ممنوع است.",
    ],
  },
  {
    title: "۲. اشتراک و پرداخت",
    body: [
      "هزینه اشتراک براساس دوره انتخابی (ماهانه یا سالانه) محاسبه می‌شود.",
      "در محیط آزمایشی، تغییر پلن از دوره بعدی اعمال می‌شود و مبلغ پرداختی قابل انتقال به دوره جاری نیست.",
    ],
  },
  {
    title: "۳. انتشار محتوا",
    body: [
      "کاربر مسئول صحت اطلاعات فراخوان و رعایت حقوق مالکیت معنوی است.",
      "سی‌نقش حق ویرایش یا حذف محتوای مغایر با سیاست‌های پلتفرم را برای خود محفوظ می‌دارد.",
    ],
  },
  {
    title: "۴. پشتیبانی و تغییرات",
    body: [
      "پشتیبانی از طریق ایمیل support@example.com در دسترس است.",
      "سی‌نقش می‌تواند شرایط استفاده را به‌روزرسانی کند. اطلاع‌رسانی از طریق صفحه سیاست‌ها انجام می‌شود.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="container space-y-10 py-12">
      <div className="space-y-3 text-right">
        <h1 className="text-3xl font-bold text-foreground">شرایط استفاده</h1>
        <p className="text-sm text-muted-foreground">
          مطالعه این بخش به شما کمک می‌کند از حقوق و مسئولیت‌های خود هنگام استفاده از سی‌نقش آگاه شوید.
        </p>
      </div>
      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
            <ul className="mt-3 list-disc space-y-2 pr-5 text-sm leading-7 text-muted-foreground">
              {section.body.map((paragraph) => (
                <li key={paragraph}>{paragraph}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
