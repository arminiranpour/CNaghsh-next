export type BillingPlanCycle = "MONTHLY" | "QUARTERLY" | "YEARLY";

export type BillingSubscriptionStatus =
  | "active"
  | "expired"
  | "canceled"
  | "renewing";

export type BillingPaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "REFUNDED_PARTIAL";

export type BillingInvoiceStatus = "DRAFT" | "PAID" | "VOID" | "REFUNDED";

export type BillingSubscriptionPlan = {
  id: string;
  name: string;
  cycle: BillingPlanCycle;
  activePrice: { id: string; amount: number; currency: string } | null;
};

export type BillingSubscription = {
  id: string;
  status: BillingSubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  startedAt: string;
  endsAt: string;
  renewalAt: string | null;
  providerRef: string | null;
  plan: BillingSubscriptionPlan;
};

export type BillingEntitlements = {
  canPublishProfile: {
    active: boolean;
    expiresAt: string | null;
    updatedAt: string | null;
  };
};

export type BillingPayment = {
  id: string;
  amount: number;
  currency: string;
  status: BillingPaymentStatus;
  provider: string;
  providerRef: string;
  createdAt: string;
  invoice: { id: string; number: string | null } | null;
};

export type BillingInvoice = {
  id: string;
  number: string | null;
  status: BillingInvoiceStatus;
  total: number;
  currency: string;
  issuedAt: string;
  provider: string | null;
  providerRef: string | null;
  paymentStatus: BillingPaymentStatus | null;
  pdfUrl: string | null;
  planName?: string | null;
  planCycle?: BillingPlanCycle | null;
  periodStart?: string | null;
  periodEnd?: string | null;
};

export type BillingDashboardData = {
  userId: string;
  now: string;
  subscription: BillingSubscription | null;
  entitlements: BillingEntitlements;
  payments: BillingPayment[];
  invoices: BillingInvoice[];
  latestFailedPayment: BillingPayment | null;
};

export type BillingActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type BillingRenewalCheckoutResult = {
  sessionId: string;
  redirectUrl: string;
  returnUrl: string;
};

export type BillingDashboardActions = {
  setCancelAtPeriodEnd: (
    flag: boolean,
  ) => Promise<BillingActionResult<BillingDashboardData>>;
  renewSubscription: () => Promise<
    BillingActionResult<BillingRenewalCheckoutResult>
  >;
};
