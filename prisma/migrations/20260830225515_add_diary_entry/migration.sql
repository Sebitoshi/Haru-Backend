-- CreateEnum
CREATE TYPE "DiaryMood" AS ENUM ('amazing', 'happy', 'calm', 'tired', 'reflective');

-- CreateTable
CREATE TABLE "DiaryEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questId" TEXT,
    "userQuestId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "photoUrl" TEXT,
    "location" JSONB,
    "mood" "DiaryMood",
    "category" TEXT,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "coinsEarned" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "sharedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiaryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiaryEntry_userId_idx" ON "DiaryEntry"("userId");

-- CreateIndex
CREATE INDEX "DiaryEntry_category_idx" ON "DiaryEntry"("category");

-- CreateIndex
CREATE INDEX "DiaryEntry_createdAt_idx" ON "DiaryEntry"("createdAt");

-- CreateIndex
CREATE INDEX "DiaryEntry_isFavorite_idx" ON "DiaryEntry"("isFavorite");

-- CreateIndex
CREATE INDEX "DiaryEntry_mood_idx" ON "DiaryEntry"("mood");

-- AddForeignKey
ALTER TABLE "DiaryEntry" ADD CONSTRAINT "DiaryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
