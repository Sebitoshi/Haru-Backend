-- CreateEnum
CREATE TYPE "QuestCategory" AS ENUM ('nature', 'creativity', 'kindness', 'learning', 'movement', 'social', 'photography', 'relaxation', 'adventure');

-- CreateEnum
CREATE TYPE "QuestDifficulty" AS ENUM ('easy', 'normal', 'hard', 'special');

-- CreateEnum
CREATE TYPE "UserQuestStatus" AS ENUM ('available', 'accepted', 'in_progress', 'completed', 'failed', 'skipped');

-- CreateEnum
CREATE TYPE "QuestType" AS ENUM ('daily', 'weekly', 'regular', 'special', 'ai_generated', 'surprise');

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "QuestCategory" NOT NULL,
    "difficulty" "QuestDifficulty" NOT NULL DEFAULT 'normal',
    "duration" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "coinsReward" INTEGER NOT NULL,
    "requirements" JSONB,
    "type" "QuestType" NOT NULL DEFAULT 'regular',
    "isAIGenerated" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxCompletions" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserQuest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "status" "UserQuestStatus" NOT NULL DEFAULT 'available',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserQuest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserQuest_userId_idx" ON "UserQuest"("userId");

-- CreateIndex
CREATE INDEX "UserQuest_questId_idx" ON "UserQuest"("questId");

-- CreateIndex
CREATE INDEX "UserQuest_status_idx" ON "UserQuest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "UserQuest_userId_questId_key" ON "UserQuest"("userId", "questId");

-- AddForeignKey
ALTER TABLE "UserQuest" ADD CONSTRAINT "UserQuest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuest" ADD CONSTRAINT "UserQuest_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
