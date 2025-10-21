import type { Subscription } from "@prisma/client";

export type BillingEventType =
  | "SUBSCRIPTION_ACTIVATED"
  | "SUBSCRIPTION_RESTARTED"
  | "SUBSCRIPTION_RENEWED"
  | "SUBSCRIPTION_EXPIRED"
  | "SUBSCRIPTION_CANCEL_AT_PERIOD_END_SET"
  | "SUBSCRIPTION_CANCEL_AT_PERIOD_END_CLEARED";

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
