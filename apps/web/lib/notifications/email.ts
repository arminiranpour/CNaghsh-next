import nodemailer, { type SentMessageInfo, type Transporter } from "nodemailer";

import { prisma } from "@/lib/prisma";
import { buildAbsoluteUrl } from "@/lib/url";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
  NEXTAUTH_URL,
  BASE_URL,
  PUBLIC_BASE_URL,
} = process.env;

export type EmailTone = "success" | "warning" | "error" | "neutral";

export type EmailAction = {
  label: string;
  href: string;
};

export type EmailKeyValue = {
  label: string;
  value: string;
};

export type EmailContent = {
  subject: string;
  preheader?: string;
  headline: string;
  tone?: EmailTone;
  paragraphs: string[];
  keyValues?: EmailKeyValue[];
  primaryAction?: EmailAction;
  secondaryActions?: EmailAction[];
  footerNote?: string;
  manageLink?: string;
  supportLink?: string;
};

type SendEmailOptions = {
  userId?: string;
  to?: string;
  content: EmailContent;
};

function getBaseUrl(): string {
  const candidate =
    (BASE_URL && BASE_URL.trim().length > 0 && BASE_URL.trim()) ||
    (NEXTAUTH_URL && NEXTAUTH_URL.trim().length > 0 && NEXTAUTH_URL.trim()) ||
    (PUBLIC_BASE_URL && PUBLIC_BASE_URL.trim().length > 0 && PUBLIC_BASE_URL.trim());

  if (!candidate) {
    throw new Error(
      "[email] BASE_URL (or NEXTAUTH_URL/PUBLIC_BASE_URL) must be configured to build absolute links.",
    );
  }

  const parsed = new URL(candidate);
  return parsed.origin;
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parsePort(): number {
  const parsed = Number(SMTP_PORT ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 587;
}

async function getTransport(): Promise<Transporter<SentMessageInfo>> {
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

function toneToColor(tone: EmailTone | undefined): { background: string; border: string } {
  switch (tone) {
    case "success":
      return { background: "#047857", border: "#064e3b" };
    case "warning":
      return { background: "#b45309", border: "#92400e" };
    case "error":
      return { background: "#b91c1c", border: "#7f1d1d" };
    default:
      return { background: "#0f172a", border: "#1e293b" };
  }
}

function renderKeyValues(items: EmailKeyValue[] | undefined): string {
  if (!items || items.length === 0) {
    return "";
  }

  const rows = items
    .map((item) => {
      return `
        <tr>
          <td style="padding:8px 12px;font-size:13px;color:#0f172a;font-weight:600;white-space:nowrap;">${escapeHtml(
            item.label,
          )}</td>
          <td style="padding:8px 12px;font-size:13px;color:#0f172a;">${escapeHtml(item.value)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:12px;background:#f8fafc;border-radius:12px;overflow:hidden;">
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderActions(primary: EmailAction | undefined, secondary: EmailAction[] | undefined): string {
  const primaryButton = primary
    ? `<a href="${primary.href}" style="display:inline-block;padding:12px 24px;border-radius:9999px;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">${escapeHtml(primary.label)}</a>`
    : "";

  const secondaryButtons = secondary
    ? secondary
        .map(
          (action) =>
            `<a href="${action.href}" style="display:inline-block;padding:10px 20px;border-radius:9999px;border:1px solid #2563eb;color:#2563eb;text-decoration:none;font-size:13px;font-weight:500;margin-inline-start:8px;margin-block-start:8px;">${escapeHtml(
              action.label,
            )}</a>`,
        )
        .join("")
    : "";

  if (!primaryButton && !secondaryButtons) {
    return "";
  }

  return `
    <div style="margin-top:24px;display:flex;flex-wrap:wrap;gap:12px;justify-content:flex-start;">
      ${primaryButton}
      ${secondaryButtons}
    </div>
  `;
}

export function renderEmail(content: EmailContent): string {
  const baseUrl = getBaseUrl();
  const logoUrl = buildAbsoluteUrl("/logo.svg");
  const supportLink = content.supportLink ?? "mailto:support@cnaghsh.com";
  const manageLink = content.manageLink ?? `${baseUrl}/dashboard/notifications`;
  const paragraphs = content.paragraphs
    .map((paragraph) => `<p style="margin:0 0 16px;font-size:14px;color:#0f172a;line-height:1.9;">${escapeHtml(paragraph)}</p>`)
    .join("");
  const keyValues = renderKeyValues(content.keyValues);
  const actions = renderActions(content.primaryAction, content.secondaryActions);
  const footerNote = content.footerNote
    ? `<p style="margin:16px 0 0;font-size:12px;color:#475569;line-height:1.8;">${escapeHtml(content.footerNote)}</p>`
    : "";
  const tone = toneToColor(content.tone);

  return `<!DOCTYPE html>
<html lang="fa-IR" dir="rtl">
  <head>
    <meta charSet="utf-8" />
    <title>${escapeHtml(content.subject)}</title>
    <meta name="color-scheme" content="light only" />
    <style>
      @font-face {
        font-family: 'Vazirmatn';
        font-style: normal;
        font-weight: 400;
        font-display: swap;
        src: local('Vazirmatn'), local('Vazirmatn-Regular');
      }
    </style>
  </head>
  <body style="margin:0;background-color:#f1f5f9;padding:24px 12px;font-family:'Vazirmatn','Segoe UI',Tahoma,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f8fafc;opacity:0;">${
      content.preheader ? escapeHtml(content.preheader) : ""
    }</div>
    <table role="presentation" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;">
      <tbody>
        <tr>
          <td style="padding:24px 28px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <div style="display:flex;align-items:center;gap:12px;">
                <img src="${logoUrl}" alt="لوگوی کستینگ نگارش" style="height:40px;width:40px;border-radius:12px;border:1px solid #e2e8f0;background:#ffffff;object-fit:contain;" />
                <div>
                  <p style="margin:0;font-weight:700;color:#0f172a;font-size:16px;">کستینگ نگارش</p>
                  <a href="${supportLink}" style="font-size:12px;color:#2563eb;text-decoration:none;">پشتیبانی</a>
                </div>
              </div>
            </div>
            <div style="margin-top:24px;padding:20px;border-radius:16px;background:${tone.background};border:1px solid ${tone.border};color:#ffffff;">
              <h1 style="margin:0;font-size:20px;line-height:1.6;font-weight:700;">${escapeHtml(content.headline)}</h1>
            </div>
            <div style="margin-top:24px;">
              ${paragraphs}
              ${keyValues}
              ${actions}
              ${footerNote}
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 28px;">
            <p style="margin:0 0 12px;font-size:12px;color:#475569;line-height:1.9;">
              برای مدیریت اعلان‌ها می‌توانید از لینک زیر استفاده کنید:
              <a href="${manageLink}" style="color:#2563eb;text-decoration:none;">مدیریت اعلان‌ها</a>
            </p>
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.9;">
              آدرس شرکت: تهران، خیابان آزادی، مرکز نوآوری نگارش — قوانین و سیاست‌ها در <a href="${baseUrl}/policies" style="color:#2563eb;text-decoration:none;">این لینک</a> در دسترس است.
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`;
}

export async function sendEmail({ userId, to, content }: SendEmailOptions): Promise<{
  ok: boolean;
  messageId?: string;
  error?: string;
}> {
  const configured = isEmailConfigured();

  if (!configured) {
    if (userId) {
      await prisma.emailLog.create({
        data: {
          userId,
          to: to ?? "",
          subject: content.subject,
          status: "FAILED",
          error: "SMTP_NOT_CONFIGURED",
        },
      });
    }

    return { ok: false, error: "SMTP_NOT_CONFIGURED" };
  }

  let recipient = to ?? null;

  if (!recipient && userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    recipient = user?.email ?? null;
  }

  if (!recipient) {
    if (userId) {
      await prisma.emailLog.create({
        data: {
          userId,
          to: "",
          subject: content.subject,
          status: "FAILED",
          error: "USER_EMAIL_MISSING",
        },
      });
    }

    return { ok: false, error: "RECIPIENT_NOT_FOUND" };
  }

  const transporter = await getTransport();
  const html = renderEmail(content);

  try {
    const info: SentMessageInfo = await transporter.sendMail({
      from: MAIL_FROM,
      to: recipient,
      subject: content.subject,
      html,
    });

    if (userId) {
      await prisma.emailLog.create({
        data: {
          userId,
          to: recipient,
          subject: content.subject,
          status: "SENT",
        },
      });
    }

    return { ok: true, messageId: info.messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    if (userId) {
      await prisma.emailLog.create({
        data: {
          userId,
          to: recipient,
          subject: content.subject,
          status: "FAILED",
          error: message,
        },
      });
    }

    return { ok: false, error: message };
  }
}
