import type { Subscription } from "@prisma/client";

export type BillingEventType =
  | "SUBSCRIPTION_ACTIVATED"
  | "SUBSCRIPTION_RESTARTED"
  | "SUBSCRIPTION_RENEWED"
  | "SUBSCRIPTION_EXPIRED"
  | "SUBSCRIPTION_CANCEL_AT_PERIOD_END_SET"
  | "SUBSCRIPTION_CANCEL_AT_PERIOD_END_CLEARED"
  | "SUBSCRIPTION_ADMIN_CANCELLED"
  | "SUBSCRIPTION_ADMIN_CANCEL_AT_PERIOD_END"
  | "SUBSCRIPTION_ADMIN_ENDS_ADJUSTED"
  | "SUBSCRIPTION_ADMIN_ENTITLEMENTS_SYNCED"
  | "PAYMENT_ADMIN_REFUNDED"
  | "PAYMENT_ADMIN_MARKED_FAILED"
  | "INVOICE_ADMIN_VOIDED"
  | "INVOICE_ADMIN_RESYNCED"
  | "ENTITLEMENT_ADMIN_REVOKED"
  | "ENTITLEMENT_ADMIN_EXTENDED"
  | "ENTITLEMENT_ADMIN_REBUILT"
  | "WEBHOOK_ADMIN_REPLAYED"
  | "BILLING_EXPORT_GENERATED";

export type BillingEvent = {
  type: BillingEventType;
  userId: string;
  subscriptionId: string;
  planId: string;
  at: Date;
  subscription?: Pick<
    Subscription,
    "status" | "startedAt" | "endsAt" | "renewalAt" | "cancelAtPeriodEnd"
  >;
};

export type BillingEventHandler = (event: BillingEvent) => void | Promise<void>;

const listeners: Record<BillingEventType, Set<BillingEventHandler>> = {
  SUBSCRIPTION_ACTIVATED: new Set(),
  SUBSCRIPTION_RESTARTED: new Set(),
  SUBSCRIPTION_RENEWED: new Set(),
  SUBSCRIPTION_EXPIRED: new Set(),
  SUBSCRIPTION_CANCEL_AT_PERIOD_END_SET: new Set(),
  SUBSCRIPTION_CANCEL_AT_PERIOD_END_CLEARED: new Set(),
  SUBSCRIPTION_ADMIN_CANCELLED: new Set(),
  SUBSCRIPTION_ADMIN_CANCEL_AT_PERIOD_END: new Set(),
  SUBSCRIPTION_ADMIN_ENDS_ADJUSTED: new Set(),
  SUBSCRIPTION_ADMIN_ENTITLEMENTS_SYNCED: new Set(),
  PAYMENT_ADMIN_REFUNDED: new Set(),
  PAYMENT_ADMIN_MARKED_FAILED: new Set(),
  INVOICE_ADMIN_VOIDED: new Set(),
  INVOICE_ADMIN_RESYNCED: new Set(),
  ENTITLEMENT_ADMIN_REVOKED: new Set(),
  ENTITLEMENT_ADMIN_EXTENDED: new Set(),
  ENTITLEMENT_ADMIN_REBUILT: new Set(),
  WEBHOOK_ADMIN_REPLAYED: new Set(),
  BILLING_EXPORT_GENERATED: new Set(),
};

export const on = (eventType: BillingEventType, handler: BillingEventHandler) => {
  listeners[eventType].add(handler);
  return () => {
    listeners[eventType].delete(handler);
  };
};

export const emit = async (event: BillingEvent) => {
  const handlers = Array.from(listeners[event.type]);

  for (const handler of handlers) {
    try {
      await handler(event);
    } catch (error) {
      console.error("billing:event", event.type, error);
    }
  }
};
