#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient, Prisma } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));

const TASKS = {
  "billing:webhooks": async () => {
    await runVitest();
    return runBillingWebhooks();
  },
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
