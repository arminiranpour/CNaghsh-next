import { z } from "zod";

const TITLE_REQUIRED = "عنوان آگهی الزامی است.";
const TITLE_MAX = "عنوان آگهی حداکثر باید ۱۴۰ کاراکتر باشد.";
const DESCRIPTION_REQUIRED = "توضیحات آگهی الزامی است.";
const DESCRIPTION_MIN = "توضیحات باید حداقل ۳۰ کاراکتر باشد.";
const CATEGORY_REQUIRED = "دسته‌بندی آگهی الزامی است.";
const CATEGORY_MAX = "دسته‌بندی حداکثر می‌تواند ۶۴ کاراکتر باشد.";
const CITY_REQUIRED = "شهر انتخاب شده نامعتبر است.";
const CITY_MAX = "شناسه شهر حداکثر می‌تواند ۶۴ کاراکتر باشد.";
const PAY_TYPE_REQUIRED = "نوع پرداخت نامعتبر است.";
const PAY_TYPE_MAX = "نوع پرداخت حداکثر می‌تواند ۳۲ کاراکتر باشد.";
const PAY_AMOUNT_INVALID = "مبلغ پرداخت باید یک عدد صحیح غیرمنفی باشد.";
const CURRENCY_LENGTH = "کد ارز باید سه حرف باشد.";
const INTRO_VIDEO_INVALID = "شناسه ویدیوی انتخاب شده معتبر نیست.";

const jobBaseSchema = z.object({
  title: z
    .string({ required_error: TITLE_REQUIRED })
    .trim()
    .min(1, { message: TITLE_REQUIRED })
    .max(140, { message: TITLE_MAX }),
  description: z
    .string({ required_error: DESCRIPTION_REQUIRED })
    .trim()
    .min(30, { message: DESCRIPTION_MIN }),
  category: z
    .string({ required_error: CATEGORY_REQUIRED })
    .trim()
    .min(1, { message: CATEGORY_REQUIRED })
    .max(64, { message: CATEGORY_MAX }),
  cityId: z
    .string()
    .trim()
    .min(1, { message: CITY_REQUIRED })
    .max(64, { message: CITY_MAX })
    .optional(),
  payType: z
    .string()
    .trim()
    .min(1, { message: PAY_TYPE_REQUIRED })
    .max(32, { message: PAY_TYPE_MAX })
    .optional(),
  payAmount: z.coerce
    .number({ invalid_type_error: PAY_AMOUNT_INVALID })
    .int({ message: PAY_AMOUNT_INVALID })
    .nonnegative({ message: PAY_AMOUNT_INVALID })
    .optional(),
  currency: z
    .string()
    .trim()
    .length(3, { message: CURRENCY_LENGTH })
    .optional(),
  remote: z.boolean({ required_error: "وضعیت دورکاری مشخص نشده است." }),
  introVideoMediaId: z
    .string()
    .trim()
    .max(191, { message: INTRO_VIDEO_INVALID })
    .optional(),
});

export const jobCreateSchema = jobBaseSchema;
export const jobUpdateSchema = jobBaseSchema;

export type JobFormSchema = typeof jobBaseSchema;
