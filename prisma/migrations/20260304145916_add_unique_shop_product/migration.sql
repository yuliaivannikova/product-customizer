/*
  Warnings:

  - A unique constraint covering the columns `[shop,productId]` on the table `CustomizerConfig` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CustomizerConfig_shop_productId_key" ON "CustomizerConfig"("shop", "productId");
