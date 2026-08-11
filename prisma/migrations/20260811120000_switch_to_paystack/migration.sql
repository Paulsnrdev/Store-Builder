-- Switching payment providers from Flutterwave to Paystack.

-- AlterTable: Store's seller-supplied checkout key.
ALTER TABLE "Store" RENAME COLUMN "flutterwavePublicKey" TO "paystackPublicKey";
-- A Flutterwave key is meaningless (and would silently break checkout) under Paystack's
-- SDK, so clear it rather than carry it forward — sellers re-enter a real Paystack key.
UPDATE "Store" SET "paystackPublicKey" = NULL WHERE "paystackPublicKey" IS NOT NULL;

-- AlterTable: Order's payment reference. Kept as historical data for orders already
-- paid under Flutterwave — this is just a receipt reference, not a live credential.
ALTER TABLE "Order" RENAME COLUMN "flutterwaveTxRef" TO "paystackReference";

-- AlterEnum: Postgres supports renaming an enum value in place (unlike removing one),
-- so existing rows just relabel from FLUTTERWAVE to PAYSTACK with no data loss.
ALTER TYPE "PaymentMethod" RENAME VALUE 'FLUTTERWAVE' TO 'PAYSTACK';

-- AlterTable: Plan's provider-specific recurring-billing plan codes. A Flutterwave plan
-- ID isn't a valid Paystack plan code, so clear these — they're lazily recreated the
-- next time a seller subscribes at that cycle (see getOrCreatePaystackPlanCode).
ALTER TABLE "Plan" RENAME COLUMN "flutterwaveMonthlyPlanId" TO "paystackMonthlyPlanCode";
ALTER TABLE "Plan" RENAME COLUMN "flutterwaveBiannualPlanId" TO "paystackBiannualPlanCode";
ALTER TABLE "Plan" RENAME COLUMN "flutterwaveAnnualPlanId" TO "paystackAnnualPlanCode";
UPDATE "Plan" SET
  "paystackMonthlyPlanCode" = NULL,
  "paystackBiannualPlanCode" = NULL,
  "paystackAnnualPlanCode" = NULL
WHERE "paystackMonthlyPlanCode" IS NOT NULL
   OR "paystackBiannualPlanCode" IS NOT NULL
   OR "paystackAnnualPlanCode" IS NOT NULL;

-- AlterTable: Subscription's provider customer ID, used to match renewal webhooks. A
-- Flutterwave customer ID won't match anything under Paystack, so clear it — it's
-- recaptured on the seller's next successful charge.
ALTER TABLE "Subscription" RENAME COLUMN "flutterwaveCustomerId" TO "paystackCustomerCode";
UPDATE "Subscription" SET "paystackCustomerCode" = NULL WHERE "paystackCustomerCode" IS NOT NULL;
