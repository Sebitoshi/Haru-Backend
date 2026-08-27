-- CreateEnum
CREATE TYPE "TrustLevel" AS ENUM ('new_user', 'trustworthy', 'very_trustworthy', 'excellent');

-- CreateTable
CREATE TABLE "UserTrust" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" "TrustLevel" NOT NULL DEFAULT 'new_user',
    "score" INTEGER NOT NULL DEFAULT 50,
    "totalAccepted" INTEGER NOT NULL DEFAULT 0,
    "totalRejected" INTEGER NOT NULL DEFAULT 0,
    "totalReports" INTEGER NOT NULL DEFAULT 0,
    "fraudAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastEvaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTrust_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "impact" INTEGER NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserTrust_userId_key" ON "UserTrust"("userId");

-- CreateIndex
CREATE INDEX "UserTrust_userId_idx" ON "UserTrust"("userId");

-- CreateIndex
CREATE INDEX "UserTrust_level_idx" ON "UserTrust"("level");

-- CreateIndex
CREATE INDEX "UserTrust_score_idx" ON "UserTrust"("score");

-- CreateIndex
CREATE INDEX "TrustEvent_userId_idx" ON "TrustEvent"("userId");

-- CreateIndex
CREATE INDEX "TrustEvent_type_idx" ON "TrustEvent"("type");

-- CreateIndex
CREATE INDEX "TrustEvent_createdAt_idx" ON "TrustEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "UserTrust" ADD CONSTRAINT "UserTrust_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustEvent" ADD CONSTRAINT "TrustEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserTrust"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
