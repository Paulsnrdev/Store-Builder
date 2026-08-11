-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "LedgerEntryReason" AS ENUM ('ORDER_PAYMENT', 'WITHDRAWAL', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "LedgerEntryStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "ledgerBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "paystackDvaAccountName" TEXT,
ADD COLUMN     "paystackDvaAccountNumber" TEXT,
ADD COLUMN     "paystackDvaBankName" TEXT;

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" "LedgerEntryType" NOT NULL,
    "reason" "LedgerEntryReason" NOT NULL,
    "status" "LedgerEntryStatus" NOT NULL DEFAULT 'COMPLETED',
    "amount" DECIMAL(10,2) NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_orderId_key" ON "LedgerEntry"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_reference_key" ON "LedgerEntry"("reference");

-- CreateIndex
CREATE INDEX "LedgerEntry_storeId_idx" ON "LedgerEntry"("storeId");

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "Order_flutterwaveTxRef_key" RENAME TO "Order_paystackReference_key";
