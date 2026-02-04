"use client";

import Link from "next/link";

const numberFormatter = new Intl.NumberFormat("fa-IR", { useGrouping: false });

const formatDays = (value: number) => numberFormatter.format(Math.max(0, value));

type PaymentRow = {
  date: string;
  title: string;
  status: string;
};

type SubscriptionPaneProps = {
  daysLeft: number;
  payments: PaymentRow[];
};

export function SubscriptionPane({ daysLeft, payments }: SubscriptionPaneProps) {
  const normalizedDays = Number.isFinite(daysLeft) ? Math.max(0, Math.round(daysLeft)) : 0;

  return (
    <section
      aria-label="وضعیت اشتراک"
      className="absolute left-[273px] top-[315px] h-[595px] w-[748px] rounded-[20px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.10)]"
      dir="rtl"
    >
      <div className="flex h-full flex-col px-[44px] pt-[28px] text-right">
        <h2 className="text-[30px] font-bold text-black">وضعیت اشتراک</h2>

        <div className="mt-10 flex items-start justify-between gap-[52px]">
          <div className="flex-1">
            <h3 className="text-[18px] font-bold text-black">گزارش پرداخت</h3>
            <div className="mt-4">
              <div className="grid grid-cols-[120px_140px_140px] gap-2 items-center border-b border-[#BDBDBD] pb-2 text-[12px] font-semibold text-[#6B6B6B]">
                <div>تاریخ</div>
                <div>عنوان</div>
                <div>وضعیت پرداخت</div>
              </div>

              {payments.length === 0 ? (
                <div className="py-4 text-[12px] text-[#8B8B8B]">
                  پرداختی ثبت نشده است.
                </div>
              ) : (
                <div className="text-[12px] text-[#5C5A5A]">
                  {payments.map((payment, index) => (
                    <div
                      key={`${payment.date}-${payment.title}-${index}`}
                      className="grid grid-cols-[140px_1fr_140px] items-center border-b border-[#D7D7D7] py-3"
                    >
                      <div>{payment.date}</div>
                      <div className="truncate">{payment.title}</div>
                      <div>{payment.status}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex h-[176px] w-[210px] flex-col items-center justify-between rounded-[13px] bg-[#FF7F19] px-3 py-4 text-white">
            <div className="flex items-baseline gap-1">
              <span className="text-[50px] font-bold">{formatDays(normalizedDays)}</span>
              <span className="text-[40px] font-semibold">روز</span>
            </div>
            <p className="text-center text-[12px]">از اشتراک شما باقی مانده است.</p>
            <Link
              href="/pricing"
              className="flex h-[30px] w-[130px] items-center justify-center rounded-[6px] bg-white text-[12px] font-bold text-[#FF7F19]"
            >
              تمدید اشتراک
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
