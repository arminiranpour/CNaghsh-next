import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/admin";
import { NO_STORE_HEADERS } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type GenreItem = {
  id: string;
  slug: string;
  nameEn: string;
  nameFa: string;
};

type GenreListResponse = {
  items: GenreItem[];
};

type GenreCreatePayload = {
  slug: string;
  nameEn: string;
  nameFa: string;
};

type GenreMutationResponse =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Partial<Record<keyof GenreCreatePayload, string>> };

const slugSchema = z
  .string()
  .trim()
  .min(1, "شناسه الزامی است.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "شناسه باید انگلیسی و خط تیره باشد.");

const genreSchema = z.object({
  slug: slugSchema,
  nameEn: z.string().trim().min(1, "نام انگلیسی الزامی است."),
  nameFa: z.string().trim().min(1, "نام فارسی الزامی است."),
});

export async function GET(): Promise<NextResponse<GenreListResponse>> {
  await requireAdminSession();

  const items = await prisma.genre.findMany({
    orderBy: { nameFa: "asc" },
    select: {
      id: true,
      slug: true,
      nameEn: true,
      nameFa: true,
    },
  });

  return NextResponse.json({ items }, { headers: NO_STORE_HEADERS });
}

export async function POST(request: NextRequest): Promise<NextResponse<GenreMutationResponse>> {
  await requireAdminSession();

  let payload: GenreCreatePayload;
  try {
    payload = (await request.json()) as GenreCreatePayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "درخواست نامعتبر است." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const parsed = genreSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof GenreCreatePayload, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key as keyof GenreCreatePayload]) {
        fieldErrors[key as keyof GenreCreatePayload] = issue.message;
      }
    }
    return NextResponse.json(
      { ok: false, error: "لطفاً خطاهای فرم را برطرف کنید.", fieldErrors },
      { status: 422, headers: NO_STORE_HEADERS },
    );
  }

  const slug = parsed.data.slug.toLowerCase();
  const existing = await prisma.genre.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      {
        ok: false,
        error: "شناسه تکراری است.",
        fieldErrors: { slug: "شناسه تکراری است." },
      },
      { status: 409, headers: NO_STORE_HEADERS },
    );
  }

  const genre = await prisma.genre.create({
    data: {
      slug,
      nameEn: parsed.data.nameEn.trim(),
      nameFa: parsed.data.nameFa.trim(),
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: genre.id }, { headers: NO_STORE_HEADERS });
}
