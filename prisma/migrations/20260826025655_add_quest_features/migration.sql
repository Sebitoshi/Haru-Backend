-- AlterTable
ALTER TABLE "Quest" ADD COLUMN     "minLevel" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "totalSteps" INTEGER,
ADD COLUMN     "weeklyReset" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UserQuest" ADD COLUMN     "progress" JSONB;
