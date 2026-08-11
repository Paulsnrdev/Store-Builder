-- CreateEnum
CREATE TYPE "SettlementPreference" AS ENUM ('LEDGER', 'INSTANT_PAYOUT');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "paystackDvaAccountNumber" TEXT,
ADD COLUMN     "paystackDvaBankName" TEXT,
ADD COLUMN     "paystackDvaCustomerCode" TEXT;

-- AlterTable
ALTER TABLE "Store" DROP COLUMN "paystackDvaAccountName",
DROP COLUMN "paystackDvaAccountNumber",
DROP COLUMN "paystackDvaBankName",
ADD COLUMN     "settlementPreference" "SettlementPreference" NOT NULL DEFAULT 'LEDGER';
