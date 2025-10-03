"use server";

import { PlanCycle, Prisma, ProductType } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";

type PlanInput = {
  productId: string;
  name: string;
  cycle: PlanCycle;
  limits: Prisma.JsonValue;
  active: boolean;
};

type ActionResult = {
  success?: true;
  error?: string;
};

const PLANS_INDEX_PATH = "/admin/billing/plans";

const revalidatePlans = async () => {
  revalidatePath(PLANS_INDEX_PATH);
  revalidatePath("/pricing");
};

const isValidCycle = (cycle: PlanCycle) =>
  Object.values(PlanCycle).includes(cycle);

const sanitizeName = (value: string) => value.trim();

const isJsonValue = (value: Prisma.JsonValue) => value !== undefined;

export async function createPlan(values: PlanInput): Promise<ActionResult> {
  try {
    const name = sanitizeName(values.name);
    if (!name) {
      return { error: "مقدار نامعتبر" };
    }

    if (!values.productId) {
      return { error: "مقدار نامعتبر" };
    }

    if (!isValidCycle(values.cycle)) {
      return { error: "مقدار نامعتبر" };
    }

    if (!isJsonValue(values.limits)) {
      return { error: "JSON نامعتبر" };
    }

    const product = await prisma.product.findUnique({
      where: { id: values.productId },
    });

    if (!product || product.type !== ProductType.SUBSCRIPTION) {
      return { error: "مقدار نامعتبر" };
    }

    await prisma.plan.create({
      data: {
        productId: values.productId,
        name,
        cycle: values.cycle,
        limits: values.limits,
        active: values.active,
      },
    });

    await revalidatePlans();

    return { success: true };
  } catch (error) {
    console.error("createPlan", error);
    return { error: "خطایی رخ داد" };
  }
}

export async function updatePlan(
  id: string,
  values: PlanInput
): Promise<ActionResult> {
  try {
    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) {
      return { error: "موردی یافت نشد" };
    }

    const name = sanitizeName(values.name);
    if (!name) {
      return { error: "مقدار نامعتبر" };
    }

    if (!values.productId) {
      return { error: "مقدار نامعتبر" };
    }

    if (!isValidCycle(values.cycle)) {
      return { error: "مقدار نامعتبر" };
    }

    if (!isJsonValue(values.limits)) {
      return { error: "JSON نامعتبر" };
    }

    const product = await prisma.product.findUnique({
      where: { id: values.productId },
    });

    if (!product || product.type !== ProductType.SUBSCRIPTION) {
      return { error: "مقدار نامعتبر" };
    }

    await prisma.plan.update({
      where: { id },
      data: {
        productId: values.productId,
        name,
        cycle: values.cycle,
        limits: values.limits,
        active: values.active,
      },
    });

    await revalidatePlans();

    return { success: true };
  } catch (error) {
    console.error("updatePlan", error);
    return { error: "خطایی رخ داد" };
  }
}

export async function togglePlanActive(id: string): Promise<ActionResult> {
  try {
    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) {
      return { error: "موردی یافت نشد" };
    }

    await prisma.plan.update({
      where: { id },
      data: {
        active: !existing.active,
      },
    });

    await revalidatePlans();

    return { success: true };
  } catch (error) {
    console.error("togglePlanActive", error);
    return { error: "خطایی رخ داد" };
  }
}