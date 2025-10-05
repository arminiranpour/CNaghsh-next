import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createInMemoryRateLimiter } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/prisma";

const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "نام باید حداقل یک کاراکتر باشد.")
    .max(191, "نام بیش از حد طولانی است.")
    .optional(),
  email: z
    .string({ required_error: "ایمیل الزامی است." })
    .trim()
    .toLowerCase()
    .email("ایمیل نامعتبر است."),
  password: z
    .string({ required_error: "رمز عبور الزامی است." })
    .min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد."),
});

const signupLimiter = createInMemoryRateLimiter({
  max: 5,
  windowMs: 60_000,
  namespace: "signup",
});

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json(
      { message: "درخواست نامعتبر است." },
      { status: 400 }
    );
  }

  const parsed = signupSchema.safeParse(payload);

  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? "اطلاعات ارسالی نامعتبر است.";
    return NextResponse.json({ message }, { status: 400 });
  }

  const { name, email, password } = parsed.data;

  const allowed = signupLimiter.hit(email);

  if (!allowed) {
    return NextResponse.json(
      { message: "تعداد درخواست‌ها زیاد است. لطفاً بعداً تلاش کنید." },
      { status: 429 }
    );
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: "USER",
      },
      select: {
        id: true,
        email: true,
      },
    });

    signupLimiter.reset(email);

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { message: "این ایمیل قبلاً ثبت شده است." },
          { status: 409 }
        );
      }
    }

    console.error("Signup failed", error);
    return NextResponse.json(
      { message: "خطا در ایجاد حساب. لطفاً بعداً تلاش کنید." },
      { status: 500 }
    );
  }
}
