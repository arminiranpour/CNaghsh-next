import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

type SearchParams = Record<string, string | string[] | undefined>;

const getSessionId = (searchParams?: SearchParams) => {
  const raw = searchParams?.sessionId;
  if (Array.isArray(raw)) {
    return raw[0] ?? null;
  }
  return typeof raw === "string" ? raw : null;
};

export default async function ChallengePaymentResultPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const sessionId = getSessionId(searchParams);

  if (!sessionId) {
    return (
      <div className="mx-auto max-w-xl" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle>شناسه پرداخت یافت نشد</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            اطلاعات پرداخت معتبر نیست.
          </CardContent>
        </Card>
      </div>
    );
  }

  const authSession = await getServerAuthSession();
  const userId = authSession?.user?.id ?? null;

  if (!userId) {
    return (
      <div className="mx-auto max-w-xl" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle>ورود موردنیاز است</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            برای مشاهده وضعیت پرداخت وارد شوید.
          </CardContent>
        </Card>
      </div>
    );
  }

  const session = await prisma.checkoutSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      userId: true,
      purchaseType: true,
      challengeId: true,
    },
  });

  if (!session || session.purchaseType !== "challenge_participation" || !session.challengeId) {
    return (
      <div className="mx-auto max-w-xl" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle>پرداخت پیدا نشد</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            امکان یافتن این پرداخت وجود ندارد.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (session.userId !== userId) {
    return (
      <div className="mx-auto max-w-xl" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle>اجازه دسترسی ندارید</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            این پرداخت متعلق به حساب شما نیست.
          </CardContent>
        </Card>
      </div>
    );
  }

  const challengeUrl = `/challenges/${session.challengeId}`;

  if (session.status === "SUCCESS") {
    redirect(challengeUrl);
  }

  const title =
    session.status === "PENDING" || session.status === "STARTED"
      ? "در انتظار تأیید"
      : "پرداخت ناموفق";
  const description =
    session.status === "PENDING" || session.status === "STARTED"
      ? "وضعیت پرداخت هنوز مشخص نشده است. لطفاً کمی بعد دوباره بررسی کنید."
      : "پرداخت شما ناموفق بود. در صورت نیاز دوباره تلاش کنید.";

  return (
    <div className="mx-auto max-w-xl" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>{description}</p>
          <Button asChild>
            <Link href={challengeUrl}>بازگشت به صفحه چالش</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
