/*
  Warnings:

  - Made the column `productId` on table `product_variants` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "product_variants" ALTER COLUMN "productId" SET NOT NULL;
