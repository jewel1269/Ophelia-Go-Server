/*
  Warnings:

  - You are about to drop the column `zipCode` on the `addresses` table. All the data in the column will be lost.
  - Added the required column `name` to the `addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `upazila` to the `addresses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "addresses" DROP COLUMN "zipCode",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL,
ADD COLUMN     "upazila" TEXT NOT NULL;
