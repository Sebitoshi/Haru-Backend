-- CreateEnum
CREATE TYPE "CollectibleType" AS ENUM ('badge', 'plant', 'object', 'postcard', 'special');

-- CreateEnum
CREATE TYPE "CollectibleRarity" AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');

-- CreateEnum
CREATE TYPE "CollectibleSource" AS ENUM ('quest', 'achievement', 'streak', 'level', 'event', 'purchase');

-- CreateTable
CREATE TABLE "Collectible" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "CollectibleType" NOT NULL,
    "rarity" "CollectibleRarity" NOT NULL DEFAULT 'common',
    "imageUrl" TEXT,
    "requirement" JSONB NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "coinsReward" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isLimited" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Collectible_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCollectible" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collectibleId" TEXT NOT NULL,
    "source" "CollectibleSource" NOT NULL DEFAULT 'quest',
    "seen" BOOLEAN NOT NULL DEFAULT false,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCollectible_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Collectible_code_key" ON "Collectible"("code");

-- CreateIndex
CREATE INDEX "Collectible_type_idx" ON "Collectible"("type");

-- CreateIndex
CREATE INDEX "Collectible_rarity_idx" ON "Collectible"("rarity");

-- CreateIndex
CREATE INDEX "Collectible_code_idx" ON "Collectible"("code");

-- CreateIndex
CREATE INDEX "UserCollectible_userId_idx" ON "UserCollectible"("userId");

-- CreateIndex
CREATE INDEX "UserCollectible_collectibleId_idx" ON "UserCollectible"("collectibleId");

-- CreateIndex
CREATE INDEX "UserCollectible_unlockedAt_idx" ON "UserCollectible"("unlockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserCollectible_userId_collectibleId_key" ON "UserCollectible"("userId", "collectibleId");

-- AddForeignKey
ALTER TABLE "UserCollectible" ADD CONSTRAINT "UserCollectible_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCollectible" ADD CONSTRAINT "UserCollectible_collectibleId_fkey" FOREIGN KEY ("collectibleId") REFERENCES "Collectible"("id") ON DELETE CASCADE ON UPDATE CASCADE;
