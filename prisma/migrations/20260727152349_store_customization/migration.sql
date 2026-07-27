-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "announcementEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "announcementText" TEXT,
ADD COLUMN     "socialLinks" JSONB;

