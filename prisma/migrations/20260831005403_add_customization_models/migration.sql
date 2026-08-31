-- CreateEnum
CREATE TYPE "EquipSlot" AS ENUM ('body', 'color', 'clothing', 'head', 'eyes', 'accessories', 'expression', 'effect', 'theme', 'title', 'frame');

-- AlterTable
ALTER TABLE "UserShopPurchase" ADD COLUMN     "equipped" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UserEquipped" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slot" "EquipSlot" NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemImage" TEXT,
    "equippedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEquipped_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserEquipped_userId_idx" ON "UserEquipped"("userId");

-- CreateIndex
CREATE INDEX "UserEquipped_slot_idx" ON "UserEquipped"("slot");

-- CreateIndex
CREATE UNIQUE INDEX "UserEquipped_userId_slot_key" ON "UserEquipped"("userId", "slot");

-- AddForeignKey
ALTER TABLE "UserEquipped" ADD CONSTRAINT "UserEquipped_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
