-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cart_storeId_phone_key" ON "Cart"("storeId", "phone");

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

