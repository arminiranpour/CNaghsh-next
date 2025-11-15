# Phase 8 – Admin Media Moderation

## Overview
The `/admin/media` dashboard allows operations staff to review every uploaded media asset. The page enforces admin-only access and surfaces moderation state, processing progress, and visibility for both videos and images. From this screen, admins can filter, inspect details, and trigger remediation actions without leaving the workflow.

## Filters & Listing
* **Status** – آپلود شده، در حال پردازش، آماده، ناموفق.
* **Type** – ویدیو یا تصویر.
* **Moderation** – در انتظار بررسی، تایید شده، رد شده.
* **User search** – جستجو بر اساس ایمیل یا شناسه مالک.

Results are ordered by `createdAt` (latest first) with cursor-based pagination. Each row shows type, processing status, moderation badge, visibility, owner info, duration/resolution, size, and the latest error if present.

## Row Actions
Use the سه‌نقطه menu or the detail view to run server-side admin actions:

| Action | Behavior |
| --- | --- |
| صف مجدد ترنسکد | ایجاد تلاش جدید در صف BullMQ و تغییر وضعیت به processing. |
| رد کردن | ثبت `moderationStatus = rejected` به همراه دلیل و خصوصی کردن رسانه. |
| تغییر نمایش | جابه‌جایی بین عمومی/خصوصی. وقتی رسانه عمومی می‌شود، به‌صورت خودکار `approved` می‌گردد. |
| حذف | حذف ردیف MediaAsset، کارهای ترنسکد مرتبط و تلاش برای پاکسازی فایل‌های S3. |

## Detail Panel
Selecting **جزئیات** opens a modal with:

* وضعیت پردازش، moderation، و نمایش به همراه زمان‌بندی بررسی و نام ادمین.
* مشخصات فنی (مدت، رزولوشن، کدک، بیت‌ریت، حجم) و کلیدهای ذخیره‌سازی.
* آخرین `TranscodeJob` شامل وضعیت، تلاش، زمان شروع/پایان و لاگ‌ها.
* فرم «دلیل رد کردن» برای ثبت یا ویرایش توضیح.
* دکمه‌های اقدام سریع (صف مجدد، تایید، رد، تغییر نمایش، حذف).

## Moderation Lifecycle
1. بارگذاری جدید → `moderationStatus = pending` و `visibility = private`.
2. تغییر نمایش به عمومی → سیستم `moderationStatus` را به `approved` تنظیم می‌کند و برچسب بررسی را با ادمین ثبت می‌نماید.
3. رد کردن → وضعیت به `rejected`، دلیل ذخیره می‌شود، تاریخ/ادمین بررسی ثبت و رسانه خصوصی می‌گردد.
4. حذف → تمام داده‌ها و خروجی‌های پردازش پاک می‌شود.

## Metrics Endpoint & Script
* **GET `/api/admin/media/metrics`** – بازگشت آمار کلی (تعداد ویدیوها/تصاویر، آماده، ناموفق، موارد در انتظار بررسی) و روند ۷ روز اخیر (آپلودها، آماده، ناموفق).
* **Script** – `pnpm --filter @app/web admin:media-metrics` مستقیماً Prisma را اجرا می‌کند، پاسخ را لاگ و ساختار را اعتبارسنجی می‌نماید.

این مرحله ابزارهای لازم برای پایش روزانه و رسیدگی سریع به مشکلات پردازش یا تصمیم‌های moderation را فراهم می‌کند.
