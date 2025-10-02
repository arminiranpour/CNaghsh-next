import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient() as PrismaClient & {
  product: any;
  plan: any;
  price: any;
};

const ProductType = {
  SUBSCRIPTION: 'SUBSCRIPTION',
  JOB_POST: 'JOB_POST',
} as const;

const PlanCycle = {
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  YEARLY: 'YEARLY',
} as const;
async function main() {
  const subscriptionProductId = 'product_subscription_default';
  const subscriptionPlanId = 'plan_subscription_monthly_default';
  const subscriptionPriceId = 'price_subscription_monthly_default';
  const jobProductId = 'product_job_post_default';
  const jobPriceId = 'price_job_post_default';

  await prisma.product.upsert({
    where: { id: subscriptionProductId },
    update: {
      name: 'اشتراک',
      active: true,
    },
    create: {
      id: subscriptionProductId,
      type: ProductType.SUBSCRIPTION,
      name: 'اشتراک',
      active: true,
    },
  });

  await prisma.plan.upsert({
    where: { id: subscriptionPlanId },
    update: {
      productId: subscriptionProductId,
      name: 'اشتراک ماهانه',
      cycle: PlanCycle.MONTHLY,
      limits: {},
      active: true,
    },
    create: {
      id: subscriptionPlanId,
      productId: subscriptionProductId,
      name: 'اشتراک ماهانه',
      cycle: PlanCycle.MONTHLY,
      limits: {},
      active: true,
    },
  });

  await prisma.price.upsert({
    where: { id: subscriptionPriceId },
    update: {
      planId: subscriptionPlanId,
      currency: 'IRR',
      amount: 5_000_000,
      active: true,
    },
    create: {
      id: subscriptionPriceId,
      planId: subscriptionPlanId,
      currency: 'IRR',
      amount: 5_000_000,
      active: true,
    },
  });

  await prisma.product.upsert({
    where: { id: jobProductId },
    update: {
      name: 'ثبت آگهی شغلی',
      active: true,
    },
    create: {
      id: jobProductId,
      type: ProductType.JOB_POST,
      name: 'ثبت آگهی شغلی',
      active: true,
    },
  });

  await prisma.price.upsert({
    where: { id: jobPriceId },
    update: {
      productId: jobProductId,
      currency: 'IRR',
      amount: 1_500_000,
      active: true,
    },
    create: {
      id: jobPriceId,
      productId: jobProductId,
      currency: 'IRR',
      amount: 1_500_000,
      active: true,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });