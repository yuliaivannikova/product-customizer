-- CreateTable
CREATE TABLE "CustomizerConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "CustomizerField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "configId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "placeholder" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT,
    CONSTRAINT "CustomizerField_configId_fkey" FOREIGN KEY ("configId") REFERENCES "CustomizerConfig" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
