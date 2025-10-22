#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import { PrismaClient, Prisma } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));

const requireTs = createRequire(import.meta.url);
requireTs("ts-node/register/transpile-only");

const TASKS = {
  "billing:webhooks": async () => {
    await runVitest();
    return runBillingWebhooks();
  },
  "billing:lifecycle": async () => runBillingLifecycle(),
  "billing:entitlements": async () => runBillingEntitlements(),
};

const prisma = new PrismaClient();

async function runVitest() {
  await execCommand("pnpm", ["exec", "vitest", "run", "lib/billing/__tests__/webhooks.test.ts"], {
    cwd: join(__dirname, ".."),
  });
}

async function runBillingWebhooks() {
  const admin = await ensureAdmin();
  await cleanupHarnessArtifacts();
  const { session, price } = await ensureSession(admin.id);

  const payload = {
    sessionId: session.id,
    authority: "HARNESS-AUTH",
    ref_id: "HARNESS-REF",
    status: "OK",
    amount: price.amount,
  };

  const first = await simulateWebhook({
    provider: session.provider,
    sessionId: session.id,
    externalId: payload.authority,
    providerRef: payload.ref_id,
    status: "PAID",
    amount: price.amount,
    currency: price.currency,
    payload,
  });

  const second = await simulateWebhook({
    provider: session.provider,
    sessionId: session.id,
    externalId: payload.authority,
    providerRef: payload.ref_id,
    status: "PAID",
    amount: price.amount,
    currency: price.currency,
    payload,
  });

  const report = {
    first,
    second,
    counts: await collectCounts(session.provider),
  };

  await writeReport("billing-webhooks", report);
  return report;
}

async function runBillingLifecycle() {
  const {
    activateOrStart,
    renew,
    setCancelAtPeriodEnd,
    markExpired,
    getSubscription,
  } = await import("../lib/billing/subscriptionService.ts");

  const fixtures = await ensureLifecycleFixtures();
  await prisma.subscription.deleteMany({ where: { userId: fixtures.user.id } });

  const steps = [];
  const recordStep = (step, subscription) => {
    steps.push({
      step,
      status: subscription.status,
      startedAt: subscription.startedAt.toISOString(),
      endsAt: subscription.endsAt.toISOString(),
      renewalAt: subscription.renewalAt
        ? subscription.renewalAt.toISOString()
        : null,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    });
  };

  recordStep(
    "activate",
    await activateOrStart({
      userId: fixtures.user.id,
      planId: fixtures.plan.id,
      providerRef: "HARNESS-LIFE-1",
    }),
  );

  recordStep(
    "renew-1",
    await renew({
      userId: fixtures.user.id,
      providerRef: "HARNESS-LIFE-2",
    }),
  );

  recordStep(
    "renew-2",
    await renew({
      userId: fixtures.user.id,
      providerRef: "HARNESS-LIFE-3",
    }),
  );

  recordStep(
    "cancel-set",
    await setCancelAtPeriodEnd({ userId: fixtures.user.id, flag: true }),
  );

  recordStep(
    "cancel-clear",
    await setCancelAtPeriodEnd({ userId: fixtures.user.id, flag: false }),
  );

  recordStep(
    "expired",
    await markExpired({ userId: fixtures.user.id, reason: "period_end" }),
  );

  const latest = await getSubscription(fixtures.user.id);

  const endsAtSequence = steps.map((step) => Date.parse(step.endsAt));
  const endsAtMonotonic = endsAtSequence.every(
    (value, index, array) => index === 0 || value >= array[index - 1],
  );
  const renewalMatchesEndsAt = steps.every(
    (step) => !step.renewalAt || step.renewalAt === step.endsAt,
  );

  const report = {
    userId: fixtures.user.id,
    planId: fixtures.plan.id,
    steps,
    checks: {
      endsAtMonotonic,
      renewalMatchesEndsAt,
      finalStatus: latest?.status ?? null,
    },
  };

  await writeReport("billing-lifecycle", report);
  return report;
}

async function runBillingEntitlements() {
  const fixtures = await ensureEntitlementHarnessFixtures();

  const first = await runManualScriptAndReadSummary();
  assertSummaryShape(first.summary);
  if (!first.summary.ok) {
    throw new Error("Initial entitlement sync failed");
  }

  const entitlementCount = await prisma.userEntitlement.count({
    where: { userId: fixtures.user.id, key: "CAN_PUBLISH_PROFILE" },
  });
  if (entitlementCount !== 1) {
    throw new Error("Expected a single entitlement after initial sync");
  }

  await prisma.subscription.update({
    where: { userId: fixtures.user.id },
    data: {
      endsAt: new Date(Date.now() - 5 * 60 * 1000),
      status: "active",
    },
  });

  await prisma.profile.update({
    where: { userId: fixtures.user.id },
    data: {
      visibility: "PUBLIC",
      publishedAt: new Date(),
    },
    select: { id: true },

  });

  const second = await runManualScriptAndReadSummary();
  assertSummaryShape(second.summary);
  if (!second.summary.ok) {
    throw new Error("Follow-up entitlement sync failed");
  }

  const expiredDelta = second.summary.expiredMarked - first.summary.expiredMarked;
  if (expiredDelta < 1) {
    throw new Error("Expected expired subscriptions to be marked on second run");
  }

  const revokedDelta =
    second.summary.entitlementsRevoked - first.summary.entitlementsRevoked;
  if (revokedDelta < 1) {
    throw new Error("Expected entitlement revocation on second run");
  }

  const entitlement = await prisma.userEntitlement.findFirst({
    where: { userId: fixtures.user.id, key: "CAN_PUBLISH_PROFILE" },
  });
  if (!entitlement) {
    throw new Error("Entitlement missing after second sync");
  }
  if (!entitlement.expiresAt || entitlement.expiresAt > new Date()) {
    throw new Error("Entitlement should be expired after revocation");
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: fixtures.user.id },
    select: { visibility: true },
  });
  if (!profile || profile.visibility !== "PRIVATE") {
    throw new Error("Profile should be private after entitlement loss");
  }

  const report = {
    userId: fixtures.user.id,
    firstRun: { summary: first.summary, reportPath: first.path },
    secondRun: { summary: second.summary, reportPath: second.path },
    checks: {
      expiredDelta,
      revokedDelta,
      profileVisibility: profile.visibility,
    },
  };

  await writeReport("billing-entitlements", report);
  return report;
}

async function ensureLifecycleFixtures() {
  const email = "qa-lifecycle-user@example.test";
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      role: "USER",
    },
  });

  const product = await prisma.product.upsert({
    where: { id: "qa-lifecycle-product" },
    update: { name: "QA Lifecycle Product" },
    create: {
      id: "qa-lifecycle-product",
      type: "SUBSCRIPTION",
      name: "QA Lifecycle Product",
    },
  });

  const plan = await prisma.plan.upsert({
    where: { id: "qa-lifecycle-plan" },
    update: {
      productId: product.id,
      cycle: "MONTHLY",
    },
    create: {
      id: "qa-lifecycle-plan",
      productId: product.id,
      name: "QA Lifecycle Plan",
      cycle: "MONTHLY",
      limits: {},
    },
  });

  return { user, plan };
}

async function ensureEntitlementHarnessFixtures() {
  const email = `qa-entitlements-${Date.now()}@example.test`;
  const user = await prisma.user.create({
    data: {
      email,
      role: "USER",
    },
  });

  const product = await prisma.product.upsert({
    where: { id: "qa-entitlements-product" },
    update: { name: "QA Entitlements Product" },
    create: {
      id: "qa-entitlements-product",
      type: "SUBSCRIPTION",
      name: "QA Entitlements Product",
    },
  });

  const plan = await prisma.plan.upsert({
    where: { id: "qa-entitlements-plan" },
    update: {
      productId: product.id,
      cycle: "MONTHLY",
    },
    create: {
      id: "qa-entitlements-plan",
      productId: product.id,
      name: "QA Entitlements Plan",
      cycle: "MONTHLY",
      limits: {},
    },
  });

  await prisma.subscription.create({
    data: {
      userId: user.id,
      planId: plan.id,
      status: "active",
      startedAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
    },
  });

  await prisma.profile.create({
    data: {
      userId: user.id,
      visibility: "PUBLIC",
      publishedAt: new Date(),
      moderationStatus: "APPROVED",
    },
    select: { id: true },
  });

  return { user, plan };
}

async function runManualScriptAndReadSummary() {
  const baseDir = join(
    __dirname,
    "../..",
    "reports",
    "sprint-verification",
  );

  const before = await listReportDirectories(baseDir);

  await execCommand(
    "pnpm",
    ["--filter", "@app/web", "tsx", "scripts/check-subscriptions.ts"],
    {
      cwd: join(__dirname, ".."),
    },
  );

  const after = await listReportDirectories(baseDir);
  const candidates = after.filter((dir) => !before.includes(dir));
  const target = (candidates.length > 0 ? candidates : after).sort().at(-1);

  if (!target) {
    throw new Error("Unable to locate entitlement report output");
  }

  const reportPath = join(baseDir, target, "billing-entitlements.json");
  const raw = await readFile(reportPath, "utf8");
  const summary = JSON.parse(raw);

  return { summary, path: reportPath };
}

async function listReportDirectories(baseDir) {
  try {
    const entries = await readdir(baseDir, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch (error) {
    if ((error && error.code) === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function assertSummaryShape(summary) {
  const numericKeys = [
    "usersChecked",
    "expiredMarked",
    "entitlementsGranted",
    "entitlementsRevoked",
    "profilesUnpublished",
  ];

  if (summary.ok !== true) {
    throw new Error("Sync result did not report ok=true");
  }

  for (const key of numericKeys) {
    if (typeof summary[key] !== "number") {
      throw new Error(`Sync summary missing numeric field: ${key}`);
    }
  }
}

async function ensureAdmin() {
  const adminEmail = "qa-webhook-admin@example.test";
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      email: adminEmail,
      role: "ADMIN",
    },
  });
  return admin;
}

async function ensureSession(userId) {
  const sessionId = "qa-webhook-session";
  const product = await prisma.product.upsert({
    where: { id: "qa-webhook-product" },
    update: {},
    create: {
      id: "qa-webhook-product",
      type: "SUBSCRIPTION",
      name: "QA Webhook Product",
    },
  });

  const plan = await prisma.plan.upsert({
    where: { id: "qa-webhook-plan" },
    update: {},
    create: {
      id: "qa-webhook-plan",
      productId: product.id,
      name: "QA",
      cycle: "MONTHLY",
      limits: {},
    },
  });

  const price = await prisma.price.upsert({
    where: { id: "qa-webhook-price" },
    update: {
      planId: plan.id,
      amount: 9990,
    },
    create: {
      id: "qa-webhook-price",
      planId: plan.id,
      amount: 9990,
      currency: "IRR",
    },
  });

  const session = await prisma.checkoutSession.upsert({
    where: { id: sessionId },
    update: {
      userId,
      provider: "zarinpal",
      priceId: price.id,
      status: "STARTED",
      redirectUrl: "",
      returnUrl: "",
      providerInitPayload: {},
      providerCallbackPayload: {},
    },
    create: {
      id: sessionId,
      userId,
      provider: "zarinpal",
      priceId: price.id,
      status: "STARTED",
      redirectUrl: "",
      returnUrl: "",
      providerInitPayload: {},
    },
  });

  return { session, price };
}

async function cleanupHarnessArtifacts() {
  await prisma.paymentWebhookLog.deleteMany({ where: { externalId: "HARNESS-AUTH" } });
  await prisma.invoice.deleteMany({ where: { providerRef: "HARNESS-REF" } });
  await prisma.payment.deleteMany({ where: { providerRef: "HARNESS-REF" } });
}

async function simulateWebhook({
  provider,
  sessionId,
  externalId,
  providerRef,
  status,
  amount,
  currency,
  payload,
}) {
  try {
    await prisma.paymentWebhookLog.create({
      data: {
        provider,
        externalId,
        payload,
        status: "received",
      },
    });
  } catch (error) {
    if (isUnique(error)) {
      return { idempotent: true };
    }
    throw error;
  }

  const paymentStatus = mapPaymentStatus(status);

  const result = await prisma.$transaction(async (tx) => {
    const session = await tx.checkoutSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const payment = await tx.payment.upsert({
      where: {
        provider_providerRef: {
          provider,
          providerRef,
        },
      },
      create: {
        provider,
        providerRef,
        status: paymentStatus,
        amount,
        currency,
        userId: session.userId,
        checkoutSessionId: sessionId,
      },
      update: {
        status: paymentStatus,
        amount,
        currency,
        userId: session.userId,
        checkoutSessionId: sessionId,
      },
    });

    let invoiceId = null;
    if (status === "PAID") {
      const existingInvoice = await tx.invoice.findUnique({
        where: { paymentId: payment.id },
      });
      if (existingInvoice) {
        invoiceId = existingInvoice.id;
      } else {
        const invoice = await tx.invoice.create({
          data: {
            paymentId: payment.id,
            userId: session.userId,
            total: amount,
            currency,
            status: "PAID",
            type: "SALE",
            providerRef,
          },
        });
        invoiceId = invoice.id;
      }
    }

    await tx.paymentWebhookLog.updateMany({
      where: { provider, externalId },
      data: {
        status: "handled",
        handledAt: new Date(),
        paymentId: payment.id,
      },
    });

    await tx.checkoutSession.update({
      where: { id: sessionId },
      data: {
        status: status === "PAID" ? "SUCCESS" : status === "PENDING" ? "PENDING" : "FAILED",
        providerCallbackPayload: payload,
      },
    });

    return { paymentId: payment.id, invoiceId };
  });

  return { idempotent: false, ...result };
}

const STATUS_MAP = new Map([
  ["PAID", "PAID"],
  ["PENDING", "PENDING"],
  ["REFUNDED", "REFUNDED"],
]);

function mapPaymentStatus(status) {
  return STATUS_MAP.get(status) ?? "FAILED";
}

async function collectCounts(provider) {
  const [payments, invoices, logs] = await Promise.all([
    prisma.payment.count({ where: { provider, providerRef: "HARNESS-REF" } }),
    prisma.invoice.count({ where: { providerRef: "HARNESS-REF" } }),
    prisma.paymentWebhookLog.count({ where: { provider, externalId: "HARNESS-AUTH" } }),
  ]);
  return { payments, invoices, logs };
}

async function writeReport(name, data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseDir = join(__dirname, "../..", "reports", "sprint-verification", timestamp);
  await mkdir(baseDir, { recursive: true });
  const file = join(baseDir, `${name}.json`);
  await writeFile(file, JSON.stringify(data, null, 2), "utf8");
  console.log(`Report written to ${file}`);
}

function isUnique(error) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function execCommand(command, args, options = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      ...options,
    });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
      }
    });
    child.on("error", reject);
  });
}

function parseArgs(argv) {
  const args = { only: null, list: false };
  for (const raw of argv) {
    if (raw === "--list") {
      args.list = true;
    } else if (raw.startsWith("--only=")) {
      args.only = raw.slice("--only=".length);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.list) {
    Object.keys(TASKS).forEach((name) => console.log(name));
    return;
  }

  const targets = args.only ? args.only.split(",") : Object.keys(TASKS);
  for (const name of targets) {
    const task = TASKS[name];
    if (!task) {
      console.error(`Unknown task: ${name}`);
      process.exitCode = 1;
      continue;
    }
    try {
      await task();
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
