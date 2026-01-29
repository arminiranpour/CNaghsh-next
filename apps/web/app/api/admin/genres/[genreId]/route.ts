import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/admin";
import { NO_STORE_HEADERS } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type GenreUpdatePayload = {
  slug: string;
  nameEn: string;
  nameFa: string;
};

type GenreMutationResponse =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Partial<Record<keyof GenreUpdatePayload, string>> };

const idSchema = z.string().cuid();

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { genreId: string } },
): Promise<NextResponse<GenreMutationResponse>> {
  await requireAdminSession();

  const id = idSchema.safeParse(params.genreId);
  if (!id.success) {
    return NextResponse.json(
      { ok: false, error: "شناسه نامعتبر است." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  let payload: GenreUpdatePayload;
  try {
    payload = (await request.json()) as GenreUpdatePayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "درخواست نامعتبر است." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const parsed = genreSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof GenreUpdatePayload, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key as keyof GenreUpdatePayload]) {
        fieldErrors[key as keyof GenreUpdatePayload] = issue.message;
      }
    }
    return NextResponse.json(
      { ok: false, error: "لطفاً خطاهای فرم را برطرف کنید.", fieldErrors },
      { status: 422, headers: NO_STORE_HEADERS },
    );
  }

  const existing = await prisma.genre.findUnique({ where: { id: id.data } });
  if (!existing) {
    return NextResponse.json(
      { ok: false, error: "ژانر یافت نشد." },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  const slug = parsed.data.slug.toLowerCase();
  if (slug !== existing.slug) {
    const slugExists = await prisma.genre.findUnique({ where: { slug } });
    if (slugExists) {
      return NextResponse.json(
        {
          ok: false,
          error: "شناسه تکراری است.",
          fieldErrors: { slug: "شناسه تکراری است." },
        },
        { status: 409, headers: NO_STORE_HEADERS },
      );
    }
  }

  const updated = await prisma.genre.update({
    where: { id: id.data },
    data: {
      slug,
      nameEn: parsed.data.nameEn.trim(),
      nameFa: parsed.data.nameFa.trim(),
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: updated.id }, { headers: NO_STORE_HEADERS });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { genreId: string } },
): Promise<NextResponse<GenreMutationResponse>> {
  await requireAdminSession();

  const id = idSchema.safeParse(params.genreId);
  if (!id.success) {
    return NextResponse.json(
      { ok: false, error: "شناسه نامعتبر است." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const genre = await prisma.genre.findUnique({
    where: { id: id.data },
    select: { id: true },
  });

  if (!genre) {
    return NextResponse.json(
      { ok: false, error: "ژانر یافت نشد." },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  const inUse = await prisma.movie.findFirst({
    where: { genres: { some: { id: id.data } } },
    select: { id: true },
  });

  if (inUse) {
    return NextResponse.json(
      { ok: false, error: "این ژانر به فیلم‌ها متصل است." },
      { status: 409, headers: NO_STORE_HEADERS },
    );
  }

  await prisma.genre.delete({ where: { id: id.data } });

  return NextResponse.json({ ok: true, id: id.data }, { headers: NO_STORE_HEADERS });
}
