import {
  MediaStatus,
  MediaType,
  MediaVisibility,
  PlanCycle,
  Prisma,
  PrismaClient,
  ProductType,
  TranscodeJobStatus,
} from '@prisma/client';
const prisma = new PrismaClient();

const SUBSCRIPTION_PRODUCT_NAME = 'اشتراک';
const SUBSCRIPTION_PLAN_NAME = 'ماهانه';
const SUBSCRIPTION_PRICE_AMOUNT = 5_000_000;

const DATABASE_RETRY_ATTEMPTS = 10;
const DATABASE_RETRY_DELAY_MS = 500;

async function waitForDatabase() {
  let lastError: unknown;

  for (let attempt = 1; attempt <= DATABASE_RETRY_ATTEMPTS; attempt += 1) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return;
    } catch (error) {
      lastError = error;

      if (!isRetryableDatabaseError(error) || attempt === DATABASE_RETRY_ATTEMPTS) {
        break;
      }

      const waitMs = DATABASE_RETRY_DELAY_MS * attempt;
      console.warn(
        `Database not ready (attempt ${attempt}/${DATABASE_RETRY_ATTEMPTS}). Retrying in ${waitMs}ms...`,
      );

      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  const lastErrorMessage =
    lastError instanceof Error ? lastError.message : JSON.stringify(lastError);

  throw new Error(
    `Unable to connect to the database using DATABASE_URL. Last error: ${lastErrorMessage}. ` +
      'Ensure the Postgres service is running (e.g., `pnpm dev:infra`) and credentials in `apps/web/.env` are correct.',
  );
}

function isRetryableDatabaseError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ['P1001', 'P1002', 'P1008', 'P1010'].includes(error.code);
  }

  return false;
}

const JOB_PRODUCT_NAME = 'ثبت آگهی شغلی';
const JOB_PRICE_AMOUNT = 1_500_000;

const MEDIA_SEED_USER_EMAIL = 'media-seed@example.com';

async function ensureSeedUser() {
  const existingUser = await prisma.user.findFirst();

  if (existingUser) {
    return existingUser;
  }

  return prisma.user.create({
    data: {
      email: MEDIA_SEED_USER_EMAIL,
      name: 'Media Seed User',
    },
  });
}

async function ensureSeedMediaAsset(ownerId: string) {
  const sourceKey = `uploads/originals/${ownerId}/seed-video.mp4`;

  let mediaAsset = await prisma.mediaAsset.findFirst({
    where: {
      ownerUserId: ownerId,
      sourceKey,
    },
  });

  if (!mediaAsset) {
    mediaAsset = await prisma.mediaAsset.create({
      data: {
        ownerUserId: ownerId,
        type: MediaType.video,
        status: MediaStatus.uploaded,
        visibility: MediaVisibility.private,
        sourceKey,
      },
    });
  }

  let transcodeJob = await prisma.transcodeJob.findFirst({
    where: {
      mediaAssetId: mediaAsset.id,
      attempt: 1,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  if (!transcodeJob) {
    transcodeJob = await prisma.transcodeJob.create({
      data: {
        mediaAssetId: mediaAsset.id,
        attempt: 1,
        status: TranscodeJobStatus.queued,
      },
    });
  }

  return { mediaAsset, transcodeJob };
}

async function ensureProduct(type: ProductType, name: string) {
  const existing = await prisma.product.findFirst({
    where: {
      type,
      name,
    },
  });

  if (existing) {
    if (!existing.active) {
      return prisma.product.update({
        where: { id: existing.id },
        data: { active: true },
      });
    }

    return existing;
  }

  return prisma.product.create({
    data: {
      type,
      name,
      active: true,
    },
  });
}

async function ensurePlan(productId: string, cycle: PlanCycle, name: string) {
  const existing = await prisma.plan.findFirst({
    where: {
      productId,
      cycle,
    },
  });

  if (existing) {
    const limitsIsEmpty = JSON.stringify(existing.limits ?? {}) === '{}';
    const shouldUpdate =
      !existing.active || existing.name !== name || !limitsIsEmpty;

    if (shouldUpdate) {
      return prisma.plan.update({
        where: { id: existing.id },
        data: {
          name,
          limits: {},
          active: true,
        },
      });
    }

    return existing;
  }

  return prisma.plan.create({
    data: {
      productId,
      name,
      cycle,
      limits: {},
      active: true,
    },
  });
}

async function ensurePlanPrice(planId: string, amount: number) {
  const existing = await prisma.price.findFirst({
    where: {
      planId,
      currency: 'IRR',
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  let price;

  if (existing) {
    price = await prisma.price.update({
      where: { id: existing.id },
      data: {
        amount,
        currency: 'IRR',
        active: true,
      },
    });
  } else {
    price = await prisma.price.create({
      data: {
        planId,
        amount,
        currency: 'IRR',
        active: true,
      },
    });
  }

  await prisma.price.updateMany({
    where: {
      planId,
      id: { not: price.id },
      active: true,
    },
    data: { active: false },
  });

  return price;
}

async function ensureProductPrice(productId: string, amount: number) {
  const existing = await prisma.price.findFirst({
    where: {
      productId,
      planId: null,
      currency: 'IRR',
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  let price;

  if (existing) {
    price = await prisma.price.update({
      where: { id: existing.id },
      data: {
        amount,
        currency: 'IRR',
        active: true,
      },
    });
  } else {
    price = await prisma.price.create({
      data: {
        productId,
        amount,
        currency: 'IRR',
        active: true,
      },
    });
  }

  await prisma.price.updateMany({
    where: {
      productId,
      planId: null,
      id: { not: price.id },
      active: true,
    },
    data: { active: false },
  });

  return price;
}

async function main() {
    await waitForDatabase();

  const seedUser = await ensureSeedUser();

  const subscriptionProduct = await ensureProduct(
    ProductType.SUBSCRIPTION,
    SUBSCRIPTION_PRODUCT_NAME,
  );

  const subscriptionPlan = await ensurePlan(
    subscriptionProduct.id,
    PlanCycle.MONTHLY,
    SUBSCRIPTION_PLAN_NAME,
  );

  const subscriptionPrice = await ensurePlanPrice(
    subscriptionPlan.id,
    SUBSCRIPTION_PRICE_AMOUNT,
  );

  const jobProduct = await ensureProduct(
    ProductType.JOB_POST,
    JOB_PRODUCT_NAME,
  );

  const jobPrice = await ensureProductPrice(jobProduct.id, JOB_PRICE_AMOUNT);

  const { mediaAsset, transcodeJob } = await ensureSeedMediaAsset(seedUser.id);

  console.log('Seed ensured records:');
  console.log('Subscription product:', subscriptionProduct.id);
  console.log('Subscription plan:', subscriptionPlan.id);
  console.log('Subscription price:', subscriptionPrice.id);
  console.log('Job post product:', jobProduct.id);
  console.log('Job post price:', jobPrice.id);
  console.log('Media seed user:', seedUser.id);
  console.log('Media asset:', mediaAsset.id);
  console.log('Transcode job:', transcodeJob.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
