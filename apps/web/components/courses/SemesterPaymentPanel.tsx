"use client";

import { useState } from "react";

import { CourseIntroVideoPreview } from "@/components/courses/CourseIntroVideoPreview";
import { formatIrr } from "@/lib/courses/format";
import { getLumpSumPayableAmount, type SemesterPricing } from "@/lib/courses/pricing";
import { cn } from "@/lib/utils";
import { iransansMedium, iransansBold } from "@/app/fonts";

type SemesterPaymentPanelProps = {
  semesterTitle: string;
  pricing: SemesterPricing;
  enrollAction: (formData: FormData) => void | Promise<void>;
  introVideo?: {
    mediaId?: string | null;
    videoUrl: string | null;
    posterUrl: string | null;
  } | null;
};

export function SemesterPaymentPanel({
  semesterTitle,
  pricing,
  enrollAction,
  introVideo,
}: SemesterPaymentPanelProps) {
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<"lumpsum" | "installments">(
    "lumpsum"
  );
  const [discountCode, setDiscountCode] = useState("");

  const introVideoUrl = introVideo?.videoUrl ?? null;
  const introVideoPosterUrl = introVideo?.posterUrl ?? null;

  const hasIntroVideo = Boolean(introVideoUrl || introVideoPosterUrl);
  const lumpSumPayable = getLumpSumPayableAmount(pricing);
  const hasLumpSumDiscount = lumpSumPayable < pricing.lumpSum.base;

  return (
    <form action={enrollAction}>
      <div className={`${iransansMedium.className} w-full max-w-[448px] rounded-[23px] bg-white p-[19px]`}>
      {/* Intro Video */}
      {hasIntroVideo ? (
        <div className="mb-[17px] overflow-hidden rounded-[19px]">
          <CourseIntroVideoPreview
            mediaId={introVideo?.mediaId}
            title={semesterTitle}
            videoUrl={introVideoUrl}
            posterUrl={introVideoPosterUrl}
          />
        </div>
      ) : null}

      {/* Total Amount */}
      <div className="mb-[7px]">
        <p className="text-left text-[22px] font-bold leading-[34px] text-[#FF7F19]">
          {formatIrr(lumpSumPayable).replace(" ریال", "")}
        </p>
      </div>

      {/* Payment Method Selection */}
      <div className="mb-[19px]">
        <p className="mb-[10px] text-right text-[13px] font-normal leading-[20px] text-black">
          شیوه پرداختت رو انتخاب کن:
        </p>

        <div className="space-y-[5px] ">
          {/* Lump Sum Option */}
          <button
            type="button"
            onClick={() => setSelectedPaymentMode("lumpsum")}
            className={cn(
              "w-full rounded-[12px] border-[0.5px] p-2 pl-4 transition",
              selectedPaymentMode === "lumpsum"
                ? "border-[#FF7F19] bg-[#FFEAD9]"
                : "border-[#808080] bg-[#F6F6F6]"
            )}
          >
            <div className="flex items-center justify-between gap-3">
                          {/* Right side - Title */}
            <div className="flex flex-1 items-center text-right">
              <p
                className={cn(
                  `${iransansBold.className} text-[15px] font-bold leading-[23px]`,
                  selectedPaymentMode === "lumpsum" ? "text-[#FF7F19]" : "text-black"
                )}
              >
                پرداخت به صورت یک جا
              </p>
            </div>


              {/* Left side - Prices */}
              <div className="flex flex-col items-start">
                {hasLumpSumDiscount ? (
                  <div className="space-y-1">
                    <p className={`${iransansBold.className} text-left text-[19px] font-normal leading-[30px] text-[#7A7A7A] line-through`}>
                      {formatIrr(pricing.lumpSum.base).replace(" ریال", "")}
                    </p>
                    <p
                      className={cn(
                        "text-left text-[19px] font-bold leading-[30px]",
                        selectedPaymentMode === "lumpsum" ? "text-[#FF7F19]" : "text-black"
                      )}
                    >
                      {formatIrr(lumpSumPayable).replace(" ریال", "")}
                    </p>
                  </div>
                ) : (
                  <p
                    className={cn(
                      "text-left text-[19px] font-bold leading-[30px]",
                      selectedPaymentMode === "lumpsum" ? "text-[#FF7F19]" : "text-black"
                    )}
                  >
                    {formatIrr(lumpSumPayable).replace(" ریال", "")}
                  </p>
                )}
              </div>

 
            </div>
          </button>

          {/* Installments Option */}
          {pricing.installments ? (
            <button
              type="button"
              onClick={() => setSelectedPaymentMode("installments")}
              className={cn(
                "w-full rounded-[12px] border-[0.5px] p-4 transition",
                selectedPaymentMode === "installments"
                  ? "border-[#FF7F19] bg-[#FFEAD9]"
                  : "border-[#808080] bg-[#F6F6F6]"
              )}
            >
              <div className="flex items-start justify-between gap-4">


                {/* Right side - Title and installment info */}
                <div className="flex-1 text-right">
                  <p
                    className={cn(
                      `${iransansBold.className} mb-1 text-[15px] font-bold leading-[23px]`,
                      selectedPaymentMode === "installments" ? "text-[#FF7F19]" : "text-black"
                    )}
                  >
                    پرداخت به صورت اقساطی
                  </p>
                  <p className="text-[8.5px] font-normal leading-[13px] text-[#808080]">
                    پرداخت در {pricing.installments.count} قسط ماهیانه
                  </p>
                </div>
                                {/* Left side - Price and payment text */}
                <div className="flex flex-col items-end">
                  <p className={`${iransansBold.className} text-left text-[19px] font-bold leading-[30px] text-[#FF7F19]`}>
                    {formatIrr(pricing.installments.amountPerInstallment).replace(" ریال", "")}
                  </p>
                  <p className="mt-1 text-left text-[8.5px] font-normal leading-[13px] text-[#808080]">
                    پرداخت هنگام ثبت نام
                  </p>
                </div>
              </div>
            </button>
          ) : null}
        </div>
      </div>

      {/* Discount Code */}
      <div className="mb-[19px]">
<div className="flex items-center justify-between rounded-[31px] bg-[#ECECEC]">
  <input
    type="text"
    value={discountCode}
    onChange={(e) => setDiscountCode(e.target.value)}
    placeholder="کد تخفیف داری؟"
    className="flex-1 rounded-[31px] bg-transparent px-4 py-3 text-right text-[13px] font-normal leading-[20px] text-[#B6B6B6] placeholder:text-[#B6B6B6] focus:outline-none"
  />

  <button
    type="button"
    className="h-[44px] rounded-[31px] bg-black px-6 text-[16px] font-bold leading-[25px] text-white"
  >
    اعمال
  </button>
</div>

      </div>

      <input type="hidden" name="paymentMode" value={selectedPaymentMode} />

      {/* Payment Button */}
      <div className="flex justify-center">
        <button
          type="submit"
          className="h-[44px] rounded-[39px] bg-[#FF7F19] px-12 text-[20px] font-bold leading-[31px] text-white transition hover:opacity-90"
        >
          پرداخت
        </button>
      </div>
    </div>
    </form>
  );
}
