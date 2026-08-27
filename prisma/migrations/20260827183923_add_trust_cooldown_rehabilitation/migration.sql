-- AlterTable
ALTER TABLE "UserTrust" ADD COLUMN     "cooldownUntil" TIMESTAMP(3),
ADD COLUMN     "lastFraudAt" TIMESTAMP(3),
ADD COLUMN     "rehabilitatedAt" TIMESTAMP(3),
ADD COLUMN     "scoreBeforeFraud" INTEGER;
