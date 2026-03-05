/*
  Warnings:

  - You are about to drop the column `backgoundImage` on the `categories` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "categories" DROP COLUMN "backgoundImage",
ADD COLUMN     "backgroundImage" TEXT;
