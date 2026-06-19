import Link from "next/link";

import { prisma } from "@/lib/db";
import { formatJalaliDate } from "@/lib/datetime/jalali";
import { formatRials } from "@/lib/money";
import { challengeStatusLabels } from "@/lib/challenges/constants";

import { ChallengeActions } from "./_components/challenge-actions";

export default async function AdminChallengesPage() {
  const challenges = await prisma.challenge.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      priceIrr: true,
      startDate: true,
      endDate: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">مدیریت چالش‌ها</h1>
          <p className="text-sm text-muted-foreground">
            ایجاد، انتشار و مدیریت ثبت‌نام‌ها و آثار ارسالی کاربران.
          </p>
        </div>
        <Link className="text-primary underline-offset-4 hover:underline" href="/admin/challenges/new">
          ایجاد چالش
        </Link>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-background">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-right">
            <tr>
              <th className="px-4 py-3 font-medium">عنوان</th>
              <th className="px-4 py-3 font-medium">وضعیت</th>
              <th className="px-4 py-3 font-medium">قیمت</th>
              <th className="px-4 py-3 font-medium">بازه زمانی</th>
              <th className="px-4 py-3 font-medium">تاریخ ایجاد</th>
              <th className="px-4 py-3 font-medium">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {challenges.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={6}>
                  هنوز چالشی ایجاد نشده است.
                </td>
              </tr>
            ) : (
              challenges.map((challenge) => (
                <tr key={challenge.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/challenges/${challenge.id}/edit`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {challenge.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{challengeStatusLabels[challenge.status]}</td>
                  <td className="px-4 py-3">
                    {challenge.priceIrr > 0 ? formatRials(challenge.priceIrr) : "رایگان"}
                  </td>
                  <td className="px-4 py-3">
                    {formatJalaliDate(challenge.startDate)} تا {formatJalaliDate(challenge.endDate)}
                  </td>
                  <td className="px-4 py-3">{formatJalaliDate(challenge.createdAt)}</td>
                  <td className="px-4 py-3">
                    <ChallengeActions challengeId={challenge.id} status={challenge.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
