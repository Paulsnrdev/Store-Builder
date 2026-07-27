-- Rename enum value and columns in place (data-preserving) instead of the
-- naive drop/recreate a raw file-diff would produce, which would fail outright
-- casting the existing 'PAYSTACK' row to an enum that no longer has that value,
-- and would silently drop the paystackReference/paystackSubaccountCode data.
ALTER TYPE "PaymentMethod" RENAME VALUE 'PAYSTACK' TO 'FLUTTERWAVE';

ALTER TABLE "Store" RENAME COLUMN "paystackSubaccountCode" TO "flutterwaveSubaccountId";

ALTER TABLE "Order" RENAME COLUMN "paystackReference" TO "flutterwaveTxRef";
ALTER INDEX "Order_paystackReference_key" RENAME TO "Order_flutterwaveTxRef_key";
