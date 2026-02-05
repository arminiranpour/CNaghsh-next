export type SemesterPricingInput = {
  tuitionAmountIrr: number;
  lumpSumDiscountAmountIrr: number;
  installmentPlanEnabled: boolean;
  installmentCount: number | null;
};

export type SemesterPricing = {
  tuitionAmountIrr: number;
  lumpSum: {
    base: number;
    discount: number;
    total: number;
  };
  installments: {
    count: number;
    amountPerInstallment: number;
    lastInstallmentAmount: number;
  } | null;
};

export function getLumpSumPayableAmount(pricing: SemesterPricing): number {
  const discount = Math.trunc(pricing.lumpSum.discount);
  if (Number.isFinite(discount) && discount > 0) {
    return discount;
  }
  return pricing.lumpSum.total;
}

export function computeSemesterPricing(semester: SemesterPricingInput): SemesterPricing {
  const base = Math.max(0, Math.trunc(semester.tuitionAmountIrr));
  const discount = Math.min(
    base,
    Math.max(0, Math.trunc(semester.lumpSumDiscountAmountIrr))
  );
  const total = Math.max(0, base - discount);
  let installments: SemesterPricing["installments"] = null;

  if (semester.installmentPlanEnabled && semester.installmentCount) {
    const count = Math.max(2, Math.trunc(semester.installmentCount));
    const amountPerInstallment = Math.floor(base / count);
    const remainder = base - amountPerInstallment * count;
    const lastInstallmentAmount = amountPerInstallment + remainder;
    installments = {
      count,
      amountPerInstallment,
      lastInstallmentAmount,
    };
  }

  return {
    tuitionAmountIrr: base,
    lumpSum: {
      base,
      discount,
      total,
    },
    installments,
  };
}
