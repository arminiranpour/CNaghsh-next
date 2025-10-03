import { createProduct } from "../actions";
import { ProductForm } from "../product-form";

export default function NewProductPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">ایجاد محصول</h2>
        <p className="text-sm text-muted-foreground">
          یک محصول جدید برای استفاده در پلن‌ها یا قیمت‌های تکی بسازید.
        </p>
      </div>
      <ProductForm action={createProduct} submitLabel="ذخیره" />
    </div>
  );
}