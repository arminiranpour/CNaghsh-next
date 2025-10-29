-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDED';

-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "number" SET DEFAULT concat('INV-', to_char(now(), 'YYYYMMDD'), '-', lpad(nextval(format('%I', 'Invoice_number_seq'))::text, 6, '0'));
