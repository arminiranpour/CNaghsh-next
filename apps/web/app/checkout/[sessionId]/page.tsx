import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { runDevPaymentSyncForSession } from "@/lib/billing/devPaymentSync";
import { prisma } from "@/lib/prisma";

import { GatewayRedirect } from "./redirect-client";
import type { CheckoutSessionResponse } from "./types";
import { fetchCheckoutSession } from "./utils";
import { StatusIcon } from "./status-icon";

export const dynamic = "force-dynamic";

const statusMessages: Record<CheckoutSessionResponse["status"], string> = {
  STARTED: "در حال انتقال به درگاه پرداخت…",
  PENDING: "در حال انتقال به درگاه پرداخت…",
  SUCCESS: "پرداخت با موفقیت انجام شد",
  FAILED: "پرداخت ناموفق بود",
};

const statusDescriptions: Record<CheckoutSessionResponse["status"], string> = {
  STARTED:
    "لطفاً چند لحظه صبر کنید. در صورت عدم انتقال خودکار از لینک زیر استفاده کنید.",
  PENDING:
    "لطفاً چند لحظه صبر کنید. در صورت عدم انتقال خودکار از لینک زیر استفاده کنید.",
  SUCCESS: "دسترسی حساب شما بروز شد. می‌توانید وضعیت حساب خود را بررسی کنید.",
  FAILED: "پرداخت تکمیل نشد. می‌توانید دوباره تلاش کنید یا بعداً بازگردید.",
};

export default async function CheckoutStatusPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const sessionId = params.sessionId;
  const sessionResult = await fetchCheckoutSession(sessionId);

  if (!sessionResult) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center py-16">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle>نشست یافت نشد</CardTitle>
            <CardDescription>
              نشست پرداخت مورد نظر شما وجود ندارد یا منقضی شده است.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if ("error" in sessionResult) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center py-16">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle>خطا در دریافت وضعیت</CardTitle>
            <CardDescription>{sessionResult.error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/pricing">بازگشت به قیمت‌گذاری</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const session = sessionResult;

  let qaUserId: string | null = null;
  if (session.status === "SUCCESS") {
    await runDevPaymentSyncForSession(sessionId);

    const dbSession = await prisma.checkoutSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });
    qaUserId = dbSession?.userId ?? null;
  }

  const isPending = session.status === "STARTED" || session.status === "PENDING";

  return (
    <div className="container flex min-h-[60vh] items-center justify-center py-16">
      <Card className="w-full max-w-xl text-center">
        <CardHeader className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            <StatusIcon status={session.status} />
            <CardTitle className="text-2xl font-bold">
              {statusMessages[session.status]}
            </CardTitle>
            <CardDescription className="text-base">
              {statusDescriptions[session.status]}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isPending && session.redirectUrl && (
            <div className="space-y-3">
              <GatewayRedirect redirectUrl={session.redirectUrl} />
              <p className="text-sm text-muted-foreground">
                اگر پس از چند ثانیه به‌صورت خودکار هدایت نشدید، از لینک زیر استفاده کنید.
              </p>
              <Button asChild>
                <a href={session.redirectUrl} rel="noopener noreferrer">
                  رفتن به درگاه
                </a>
              </Button>
            </div>
          )}

          {session.status === "SUCCESS" && (
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              {qaUserId && (
                <Button asChild variant="outline">
                  <Link
                    href={`/api/billing/entitlements?userId=${qaUserId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    مشاهده وضعیت انتشار پروفایل
                  </Link>
                </Button>
              )}
              <Button asChild>
                <Link href="/pricing">بازگشت به قیمت‌گذاری</Link>
              </Button>
            </div>
          )}

          {session.status === "FAILED" && (
            <div className="flex justify-center">
              <Button asChild>
                <Link href="/pricing">تلاش مجدد</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}