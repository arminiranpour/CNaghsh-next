import { PrismaClient } from "@prisma/client";
import { sendEmail, type EmailContent } from "@/lib/notifications/email";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { id: "u_test" },
    update: {},
    create: { id: "u_test", email: "test@example.com", role: "USER" },
  });

  const content: EmailContent = {
    subject: "Smoke: رسید پرداخت آماده است",
    preheader: "این یک ایمیل تستی از MailHog است",
    headline: "رسید پرداخت",
    tone: "success",
    paragraphs: [
      "این یک تست است تا ببینیم ایمیل‌ها ارسال می‌شوند.",
      "اگر این را می‌بینید، SMTP و قالب HTML اوکی است.",
    ],
    keyValues: [
      { label: "شماره فاکتور", value: "INV-1001" },
      { label: "مبلغ", value: "123,456 ریال" },
    ],
    primaryAction: {
      label: "دانلود رسید",
      href: `${process.env.BASE_URL}/api/invoices/inv_test/pdf`,
    },
    footerNote: "ایمیل‌های حیاتی را می‌توانید از داشبورد مدیریت کنید.",
  };

  const res = await sendEmail({ userId: "u_test", content });
  console.log("sendEmail =>", res);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
