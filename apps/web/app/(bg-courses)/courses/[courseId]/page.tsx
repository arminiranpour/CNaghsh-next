import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { CourseInfoPanel } from "@/components/courses/CourseInfoPanel";
import { CoursePaymentReport, type CoursePaymentReportRow } from "@/components/courses/CoursePaymentReport";
import { CourseSemestersPanel } from "@/components/courses/CourseSemestersPanel";
import { getServerAuthSession } from "@/lib/auth/session";
import { formatIrr } from "@/lib/courses/format";
import { fetchPublicCourseById } from "@/lib/courses/public/queries";
import { prisma } from "@/lib/db";
import { formatJalaliDate } from "@/lib/datetime/jalali";

const paymentStatusLabels: Record<string, string> = {
  PAID: "پرداخت‌شده",
  PENDING: "در انتظار",
  FAILED: "ناموفق",
  REFUNDED: "بازپرداخت‌شده",
  REFUNDED_PARTIAL: "بازپرداخت جزئی",
};

type PaymentReportRow = CoursePaymentReportRow & {
  sortDate: Date | null;
};

const formatAmountLabel = (amount: number) => {
  const formatted = formatIrr(amount).replace(" ریال", "");
  return `${formatted} تومان`;
};

const buildPaymentTitle = (input: {
  semesterTitle?: string | null;
  courseTitle?: string | null;
  paymentMode?: string | null;
  installmentIndex?: number | null;
}) => {
  const semesterLabel = input.semesterTitle ?? input.courseTitle ?? "دوره";
  if (input.paymentMode === "installments" && input.installmentIndex) {
    return `قسط ${input.installmentIndex} ترم ${semesterLabel}`;
  }
  return `ترم ${semesterLabel}`;
};

const buildInstallmentTitle = (input: {
  semesterTitle?: string | null;
  courseTitle?: string | null;
  installmentIndex: number;
}) => {
  const semesterLabel = input.semesterTitle ?? input.courseTitle ?? "دوره";
  return `قسط ${input.installmentIndex} ترم ${semesterLabel}`;
};

export default async function CourseDetailPage({
  params,
}: {
  params: { courseId: string };
}) {
  const session = await getServerAuthSession();
  const userId = session?.user?.id ?? null;
  const course = await fetchPublicCourseById(params.courseId, userId);

  if (!course) {
    notFound();
  }

  let paymentReportRows: CoursePaymentReportRow[] = [];

  if (userId) {
    const [payments, installments] = await Promise.all([
      prisma.payment.findMany({
        where: {
          userId,
          session: {
            purchaseType: "course_semester",
            courseId: course.id,
          },
        },
        select: {
          id: true,
          status: true,
          amount: true,
          createdAt: true,
          session: {
            select: {
              paymentMode: true,
              installmentIndex: true,
              semester: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      }),
      prisma.coursePaymentInstallment.findMany({
        where: {
          status: { in: ["due", "failed"] },
          enrollment: {
            userId,
            semester: {
              courseId: course.id,
            },
          },
        },
        select: {
          id: true,
          index: true,
          amountIrr: true,
          dueAt: true,
          enrollment: {
            select: {
              semester: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const paymentRows: PaymentReportRow[] = payments.map((payment) => ({
      sortDate: payment.createdAt,
      dateLabel: formatJalaliDate(payment.createdAt),
      title: buildPaymentTitle({
        semesterTitle: payment.session.semester?.title ?? null,
        courseTitle: course.title,
        paymentMode: payment.session.paymentMode ?? null,
        installmentIndex: payment.session.installmentIndex ?? null,
      }),
      amountLabel: formatAmountLabel(payment.amount),
      statusLabel: paymentStatusLabels[payment.status] ?? payment.status,
    }));

    const installmentRows: PaymentReportRow[] = installments.map((installment) => ({
      sortDate: installment.dueAt ?? null,
      dateLabel: formatJalaliDate(installment.dueAt),
      title: buildInstallmentTitle({
        semesterTitle: installment.enrollment.semester?.title ?? null,
        courseTitle: course.title,
        installmentIndex: installment.index,
      }),
      amountLabel: formatAmountLabel(installment.amountIrr),
      statusLabel: "در انتظار پرداخت",
    }));

    const combined = [...paymentRows, ...installmentRows];
    combined.sort((a, b) => {
      if (a.sortDate && b.sortDate) {
        return b.sortDate.getTime() - a.sortDate.getTime();
      }
      if (a.sortDate) {
        return -1;
      }
      if (b.sortDate) {
        return 1;
      }
      return 0;
    });

    paymentReportRows = combined.map(({ sortDate, ...row }) => row);
  }

  return (
    <div className="relative min-h-screen" dir="rtl">
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10">
        <div className="flex justify-begin mb-4">
          <Link href="/courses" className="inline-block">
            <Image
              src="/images/back-button.png"
              alt="Back"
              width={50}
              height={50}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            />
          </Link>
        </div>
        <div className="grid gap-2 lg:grid-cols-11" data-no-transparent>
          <div className="lg:col-span-6 overflow-auto">
            <CourseInfoPanel course={course} />
            {paymentReportRows.length > 0 ? (
              <CoursePaymentReport rows={paymentReportRows} />
            ) : null}
          </div>
          {/* Compact mode: h-[650px] with density="compact" */}
          <div className="h-[580px] min-h-0 lg:col-span-4">
            <CourseSemestersPanel course={course} density="compact" />
          </div>
          {/* Normal mode example (commented out):
          <div className="h-[800px] min-h-0 lg:col-span-5">
            <CourseSemestersPanel course={course} density="normal" />
          </div>
          */}
        </div>
      </div>
    </div>
  );
}
