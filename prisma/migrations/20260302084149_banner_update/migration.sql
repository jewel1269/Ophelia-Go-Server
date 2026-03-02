/*
  Warnings:

  - You are about to drop the column `image` on the `banners` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "banners" DROP COLUMN "image",
ADD COLUMN     "images" TEXT[];
