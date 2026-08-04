-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "bankTransferAccountExpiresAt" TIMESTAMP(3),
ADD COLUMN     "bankTransferAccountNumber" TEXT,
ADD COLUMN     "bankTransferBankName" TEXT;
