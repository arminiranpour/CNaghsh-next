-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "number" SET DEFAULT concat('INV-', to_char(now(), 'YYYYMMDD'), '-', lpad(nextval(format('%I', 'Invoice_number_seq'))::text, 6, '0'));
-- Create the sequence if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'Invoice_number_seq'
  ) THEN
    -- IMPORTANT: quoted name to match your default expression
    CREATE SEQUENCE "Invoice_number_seq"
      START WITH 1
      INCREMENT BY 1
      MINVALUE 1
      NO MAXVALUE
      CACHE 1;
  END IF;
END
$$;

-- Optional: align the sequence to the next number after the largest existing invoice suffix
-- This looks at the last 6 digits of `Invoice.number`, e.g., INV-20251028-000123
-- If you have no invoices yet, it sets it to 1.
SELECT setval(
  '"Invoice_number_seq"',
  GREATEST(
    COALESCE((
      SELECT MAX(CAST(SUBSTRING(number FROM '\\d{6}$') AS INT))
      FROM "Invoice"
      WHERE number ~ 'INV-\d{8}-\d{6}'
    ), 0) + 1,
    1
  ),
  false
);