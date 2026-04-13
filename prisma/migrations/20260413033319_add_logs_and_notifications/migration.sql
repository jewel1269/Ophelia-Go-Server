/*
  Warnings:

  - You are about to drop the column `details` on the `activity_logs` table. All the data in the column will be lost.
  - Added the required column `message` to the `activity_logs` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LogType" AS ENUM ('INFO', 'WARNING', 'DANGEROUS');

-- CreateEnum
CREATE TYPE "LogSource" AS ENUM ('SYSTEM', 'API', 'AUTH', 'ORDER', 'PAYMENT', 'ADMIN', 'FIREWALL', 'EDR');

-- CreateEnum
CREATE TYPE "AdminNotifType" AS ENUM ('DANGEROUS', 'ORDER', 'SYSTEM', 'INFO');

-- AlterTable
ALTER TABLE "activity_logs" DROP COLUMN "details",
ADD COLUMN     "message" TEXT NOT NULL,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "source" "LogSource" NOT NULL DEFAULT 'API',
ADD COLUMN     "type" "LogType" NOT NULL DEFAULT 'INFO',
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "admin_notifications" (
    "id" TEXT NOT NULL,
    "type" "AdminNotifType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_notifications_isRead_createdAt_idx" ON "admin_notifications"("isRead", "createdAt");

-- CreateIndex
CREATE INDEX "activity_logs_type_createdAt_idx" ON "activity_logs"("type", "createdAt");

-- CreateIndex
CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");

-- CreateIndex
CREATE INDEX "activity_logs_source_idx" ON "activity_logs"("source");
