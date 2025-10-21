import { ProductType } from "@prisma/client";

import { prisma } from "../prisma";
import {
  activateOrStart,
  getSubscription,
  renew,
} from "./subscriptionService";

type ApplyPaymentArgs = {
  paymentId: string;
};

export const applyPaymentToSubscription = async ({
  paymentId,
}: ApplyPaymentArgs) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      session: {
        include: {
          price: {
            include: {
              plan: {
                include: { product: true },
              },
              product: true,
            },
          },
        },
      },
    },
  });

  if (!payment || !payment.session?.price) {
    return { applied: false, reason: "PAYMENT_NOT_FOUND" as const };
  }

  const price = payment.session.price;
  const plan = price.plan;

  if (!plan || plan.product?.type !== ProductType.SUBSCRIPTION) {
    return { applied: false, reason: "NOT_SUBSCRIPTION" as const };
  }

  const subscription = await getSubscription(payment.userId);

  if (!subscription) {
    await activateOrStart({
      userId: payment.userId,
      planId: plan.id,
      providerRef: payment.providerRef,
    });
    return { applied: true, action: "activated" as const };
  }

  await renew({ userId: payment.userId, providerRef: payment.providerRef });
  return { applied: true, action: "renewed" as const };
};
