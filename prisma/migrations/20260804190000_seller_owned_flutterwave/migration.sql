-- AlterTable: Store gets a public key for its own Flutterwave checkout instead
-- of a subaccount ID for split payouts through the platform's account.
ALTER TABLE "Store" DROP COLUMN "flutterwaveSubaccountId";
ALTER TABLE "Store" ADD COLUMN     "flutterwavePublicKey" TEXT;

-- AlterTable: drop the dynamic bank-transfer virtual account fields (feature removed).
ALTER TABLE "Order" DROP COLUMN "bankTransferAccountNumber";
ALTER TABLE "Order" DROP COLUMN "bankTransferBankName";
ALTER TABLE "Order" DROP COLUMN "bankTransferAccountExpiresAt";

-- AlterEnum: remove EXPIRED from OrderStatus. Postgres has no direct "DROP VALUE"
-- for enums, so recreate the type without it and swap the column over.
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus" USING ("status"::text::"OrderStatus");
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PENDING';
DROP TYPE "OrderStatus_old";
