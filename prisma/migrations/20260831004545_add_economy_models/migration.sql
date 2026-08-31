-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('quest_completed', 'badge_unlocked', 'collectible_unlocked', 'level_up', 'streak_milestone', 'daily_bonus', 'admin_grant', 'refund', 'shop_purchase', 'streak_protection', 'gifting', 'admin_deduction', 'welcome_bonus');

-- CreateEnum
CREATE TYPE "ShopItemCategory" AS ENUM ('protection', 'cosmetic', 'decoration', 'special');

-- CreateEnum
CREATE TYPE "ShopItemRarity" AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopItem" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ShopItemCategory" NOT NULL,
    "rarity" "ShopItemRarity" NOT NULL DEFAULT 'common',
    "price" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "effect" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isLimited" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "maxPerUser" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserShopPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalCost" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserShopPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShopItem_code_key" ON "ShopItem"("code");

-- CreateIndex
CREATE INDEX "ShopItem_category_idx" ON "ShopItem"("category");

-- CreateIndex
CREATE INDEX "ShopItem_rarity_idx" ON "ShopItem"("rarity");

-- CreateIndex
CREATE INDEX "ShopItem_code_idx" ON "ShopItem"("code");

-- CreateIndex
CREATE INDEX "UserShopPurchase_userId_idx" ON "UserShopPurchase"("userId");

-- CreateIndex
CREATE INDEX "UserShopPurchase_itemId_idx" ON "UserShopPurchase"("itemId");

-- CreateIndex
CREATE INDEX "UserShopPurchase_createdAt_idx" ON "UserShopPurchase"("createdAt");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserShopPurchase" ADD CONSTRAINT "UserShopPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserShopPurchase" ADD CONSTRAINT "UserShopPurchase_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ShopItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
