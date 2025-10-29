# SEO راهنما

این پروژه شامل تنظیمات پایه برای سئو است. اجزای کلیدی در مسیر `apps/web` به شکل زیر قرار دارند:

- **robots.txt**: در `app/robots.ts` تولید می‌شود و از متغیر `PUBLIC_BASE_URL` برای تعیین دامنه، و همین‌طور مسیر نقشه‌سایت استفاده می‌کند.
- **نقشه‌های سایت**: فایل شاخص در `app/sitemap.ts` و نقشه‌های جزئی در `app/(public)/sitemap-static.ts`، `app/(public)/profiles/sitemap.ts` و `app/(public)/jobs/sitemap.ts` قرار دارند. نقشه‌های پویا به‌صورت استریم دوستانه با Prisma داده‌ها را دریافت می‌کنند و تنها آیتم‌های تایید‌شده را نمایش می‌دهند.
- **JSON-LD**: کامپوننت `JsonLd` در `components/seo/JsonLd.tsx` قرار دارد و ژنراتورهای داده ساختاریافته در `lib/seo/jsonld.ts` پیاده‌سازی شده‌اند. این توابع برای صفحات فهرست، جزئیات پروفایل و جزئیات آگهی استفاده می‌شوند.
- **ثابت‌های سئو**: نام سایت، لوگو و توضیح پایه در `lib/seo/constants.ts` تعریف شده‌اند.

## اجرای اسکریپت‌ها و تست‌ها

1. **راه‌اندازی توسعه**
   ```bash
   pnpm -w dev
   ```

2. **بررسی robots و sitemap**
   - `http://localhost:3000/robots.txt`
   - `http://localhost:3000/sitemap.xml`
   - `http://localhost:3000/profiles/sitemap.xml`
   - `http://localhost:3000/jobs/sitemap.xml`

3. **تایید JSON-LD روی صفحات**
   صفحات `/profiles`, `/jobs`, یک پروفایل نمونه و یک آگهی نمونه را در مرورگر باز کنید و وجود اسکریپت `application/ld+json` را بررسی کنید.

4. **اجرای تست‌های واحد JSON-LD و متادیتا**
   ```bash
   pnpm -F @app/web test --run apps/web/lib/seo/__tests__/jsonld.test.ts
   pnpm -F @app/web test --run apps/web/app/__tests__/metadata-routes.test.ts
   ```

5. **اجرای اسکریپت‌های دودکشی**
   ```bash
   pnpm -F @app/web run seo:smoke:profiles
   pnpm -F @app/web run seo:smoke:jobs
   ```

6. **گزارش Lighthouse**
   ```bash
   pnpm -F @app/web run seo:baseline
   ```

پس از استقرار، استفاده از ابزار [Rich Result Test](https://search.google.com/test/rich-results) برای بررسی JSON-LD پیشنهاد می‌شود.
