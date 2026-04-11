-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "limitPerUser" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "userId" TEXT;
