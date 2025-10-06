import nodemailer from "nodemailer";

import { prisma } from "@/lib/prisma";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
  NEXTAUTH_URL,
} = process.env;

const DEFAULT_APP_URL = "http://localhost:3000";

function getBaseUrl(): string {
  return NEXTAUTH_URL && NEXTAUTH_URL.trim().length > 0
    ? NEXTAUTH_URL
    : DEFAULT_APP_URL;
}

export function isEmailConfigured(): boolean {
  return Boolean(
    SMTP_HOST &&
      SMTP_HOST.length > 0 &&
      SMTP_PORT &&
      SMTP_PORT.length > 0 &&
      MAIL_FROM &&
      MAIL_FROM.length > 0,
  );
}

function buildHtmlBody(content: string): string {
  const dashboardUrl = `${getBaseUrl()}/dashboard/notifications`;
  return `<!DOCTYPE html>
<html lang="fa-IR" dir="rtl">
  <head>
    <meta charSet="utf-8" />
    <title>اعلان</title>
  </head>
  <body style="margin:0;padding:24px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;padding:24px;line-height:1.8;color:#0f172a;">
      <p style="margin-top:0;margin-bottom:16px;font-size:16px;">${content}</p>
      <p style="margin:24px 0 0;font-size:13px;color:#475569;">برای مدیریت اعلان‌ها می‌توانید به <a href="${dashboardUrl}" style="color:#2563eb;text-decoration:none;">داشبورد اعلان‌ها</a> مراجعه کنید.</p>
    </div>
  </body>
</html>`;
}

function parsePort(): number {
  const parsed = Number(SMTP_PORT ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 587;
}

async function getTransport() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parsePort(),
    secure: parsePort() === 465,
    auth:
      SMTP_USER && SMTP_PASS
        ? {
            user: SMTP_USER,
            pass: SMTP_PASS,
          }
        : undefined,
  });
}

export async function sendEmail(
  userId: string,
  subject: string,
  htmlText: string,
): Promise<void> {
  const isConfigured = isEmailConfigured();

  if (!isConfigured) {
    await prisma.emailLog.create({
      data: {
        userId,
        to: "",
        subject,
        status: "FAILED",
        error: "SMTP_NOT_CONFIGURED",
      },
    });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user?.email) {
    await prisma.emailLog.create({
      data: {
        userId,
        to: "",
        subject,
        status: "FAILED",
        error: "USER_EMAIL_MISSING",
      },
    });
    return;
  }

  const transporter = await getTransport();
  const html = buildHtmlBody(htmlText);

  try {
    await transporter.sendMail({
      from: MAIL_FROM,
      to: user.email,
      subject,
      html,
    });

    await prisma.emailLog.create({
      data: {
        userId,
        to: user.email,
        subject,
        status: "SENT",
      },
    });
  } catch (error) {
    await prisma.emailLog.create({
      data: {
        userId,
        to: user.email,
        subject,
        status: "FAILED",
        error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      },
    });
  }
}
