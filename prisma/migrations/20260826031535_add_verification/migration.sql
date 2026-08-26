-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'analyzing', 'verified', 'rejected', 'needs_review');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('photo', 'video', 'audio', 'text', 'location');

-- CreateTable
CREATE TABLE "QuestVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "userQuestId" TEXT NOT NULL,
    "evidenceType" "EvidenceType" NOT NULL,
    "evidenceUrl" TEXT,
    "evidenceText" TEXT,
    "location" JSONB,
    "status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "aiAnalysis" JSONB,
    "rejectionReason" TEXT,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "reviewerId" TEXT,
    "reviewNote" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestVerification_userId_idx" ON "QuestVerification"("userId");

-- CreateIndex
CREATE INDEX "QuestVerification_questId_idx" ON "QuestVerification"("questId");

-- CreateIndex
CREATE INDEX "QuestVerification_userQuestId_idx" ON "QuestVerification"("userQuestId");

-- CreateIndex
CREATE INDEX "QuestVerification_status_idx" ON "QuestVerification"("status");

-- AddForeignKey
ALTER TABLE "QuestVerification" ADD CONSTRAINT "QuestVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestVerification" ADD CONSTRAINT "QuestVerification_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestVerification" ADD CONSTRAINT "QuestVerification_userQuestId_fkey" FOREIGN KEY ("userQuestId") REFERENCES "UserQuest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
