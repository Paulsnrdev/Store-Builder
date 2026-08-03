-- AlterEnum
ALTER TYPE "BillingInterval" ADD VALUE 'BIANNUAL';

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "productLimit" INTEGER,
ADD COLUMN     "flutterwaveMonthlyPlanId" TEXT,
ADD COLUMN     "flutterwaveBiannualPlanId" TEXT,
ADD COLUMN     "flutterwaveAnnualPlanId" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "flutterwaveCustomerId" TEXT;

-- CreateTable
CREATE TABLE "SubscriptionPayment" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "txRef" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPayment_txRef_key" ON "SubscriptionPayment"("txRef");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_subscriptionId_idx" ON "SubscriptionPayment"("subscriptionId");

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
