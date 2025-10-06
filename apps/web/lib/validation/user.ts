import { z } from "zod";

export const nameSchema = z
  .string({ required_error: "لطفاً نام را وارد کنید." })
  .trim()
  .min(1, { message: "لطفاً نام را وارد کنید." })
  .max(191, { message: "نام نباید بیش از ۱۹۱ کاراکتر باشد." });

export const passwordChangeSchema = z
  .object({
    currentPassword: z
      .string({ required_error: "لطفاً رمز عبور فعلی را وارد کنید." })
      .min(1, { message: "لطفاً رمز عبور فعلی را وارد کنید." }),
    newPassword: z
      .string({ required_error: "رمز عبور باید حداقل ۸ کاراکتر باشد." })
      .min(8, { message: "رمز عبور باید حداقل ۸ کاراکتر باشد." }),
    confirmNewPassword: z
      .string({ required_error: "رمز عبور باید حداقل ۸ کاراکتر باشد." })
      .min(8, { message: "رمز عبور باید حداقل ۸ کاراکتر باشد." }),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "تأیید رمز عبور مطابق نیست.",
    path: ["confirmNewPassword"],
  });

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
