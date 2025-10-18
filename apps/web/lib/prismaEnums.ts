export const Provider = {
  zarinpal: "zarinpal",
  idpay: "idpay",
  nextpay: "nextpay",
} as const;

export type Provider = (typeof Provider)[keyof typeof Provider];

export const CheckoutStatus = {
  STARTED: "STARTED",
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;

export type CheckoutStatus = (typeof CheckoutStatus)[keyof typeof CheckoutStatus];

export const PaymentStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const InvoiceStatus = {
  OPEN: "OPEN",
  PAID: "PAID",
  VOID: "VOID",
} as const;

export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];