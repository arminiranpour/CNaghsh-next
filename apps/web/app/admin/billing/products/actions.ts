"use server";

import { ProductType } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";

type ProductInput = {
  name: string;
  type: ProductType;
  active: boolean;
};

type ActionResult = {
  success?: true;
  error?: string;
};

const PRODUCTS_INDEX_PATH = "/admin/billing/products";

const isValidProductType = (type: ProductType) =>
  Object.values(ProductType).includes(type);

const sanitizeName = (value: string) => value.trim();

const revalidateProducts = async () => {
  revalidatePath(PRODUCTS_INDEX_PATH);
  revalidatePath("/pricing");
};

export async function createProduct(values: ProductInput): Promise<ActionResult> {
  try {
    const name = sanitizeName(values.name);
    if (!name) {
      return { error: "مقدار نامعتبر" };
    }

    if (!isValidProductType(values.type)) {
      return { error: "مقدار نامعتبر" };
    }

    await prisma.product.create({
      data: {
        name,
        type: values.type,
        active: values.active,
      },
    });

    await revalidateProducts();

    return { success: true };
  } catch (error) {
    console.error("createProduct", error);
    return { error: "خطایی رخ داد" };
  }
}

export async function updateProduct(
  id: string,
  values: ProductInput
): Promise<ActionResult> {
  try {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return { error: "موردی یافت نشد" };
    }

    const name = sanitizeName(values.name);
    if (!name) {
      return { error: "مقدار نامعتبر" };
    }

    if (!isValidProductType(values.type)) {
      return { error: "مقدار نامعتبر" };
    }

    await prisma.product.update({
      where: { id },
      data: {
        name,
        type: values.type,
        active: values.active,
      },
    });

    await revalidateProducts();

    return { success: true };
  } catch (error) {
    console.error("updateProduct", error);
    return { error: "خطایی رخ داد" };
  }
}

export async function toggleProductActive(id: string): Promise<ActionResult> {
  try {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return { error: "موردی یافت نشد" };
    }

    await prisma.product.update({
      where: { id },
      data: {
        active: !existing.active,
      },
    });

    await revalidateProducts();

    return { success: true };
  } catch (error) {
    console.error("toggleProductActive", error);
    return { error: "خطایی رخ داد" };
  }
}