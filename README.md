# Web App Setup

This application uses Prisma with a PostgreSQL database connection.

## Database configuration

Create a `.env` file in `apps/web` (or export the variable in your shell) with the following content, adjusting the connection string if needed:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/casting"
```

After setting the environment variable you can run the Prisma commands:

```bash
pnpm --filter @app/web prisma migrate dev -n init
pnpm --filter @app/web prisma generate
```

## Admin Billing CRUD

- مسیرهای مدیریت: `/admin/billing/products`، `/admin/billing/plans` و `/admin/billing/prices` در محیط وب در دسترس هستند.
- قوانین لینک قیمت: قیمت اشتراکی باید به یک پلن متصل شود (planId) و قیمت خرید تکی فقط به محصولی از نوع `JOB_POST` متصل می‌شود. دقیقاً یکی از `planId` یا `productId` باید مقدار داشته باشد.
- تمام مبالغ برحسب ریال (IRR) نگهداری و نمایش داده می‌شوند و ارز قابل تغییر نیست.
- حذف انجام نمی‌شود؛ برای خارج کردن یک قلم از دسترس، وضعیت «فعال» را غیرفعال کنید.

### چک‌لیست تست دستی

1. یک محصول اشتراک (مثلاً «اشتراک») بسازید.
2. زیر آن محصول یک پلن (چرخه ماهانه با `limits = {}`) ایجاد کنید.
3. برای آن پلن یک قیمت با مبلغ ۵٬۰۰۰٬۰۰۰ ریال ثبت کنید.
4. یک محصول `JOB_POST` (مثلاً «ثبت آگهی») بسازید.
5. برای آن محصول قیمت ۱٬۵۰۰٬۰۰۰ ریالی بسازید.
6. صفحه `/pricing` را باز کنید و نمایش صحیح مبالغ ریالی را بررسی کنید.
7. یک قیمت را غیرفعال کنید و مطمئن شوید از صفحه قیمت‌گذاری حذف می‌شود.
8. نام/مبلغ پلن یا قیمت را ویرایش کنید و تأثیر آن را در `/pricing` ببینید.