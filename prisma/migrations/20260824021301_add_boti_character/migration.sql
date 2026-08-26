-- CreateTable
CREATE TABLE "BotiCharacter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'BOTI',
    "expression" TEXT NOT NULL DEFAULT 'calm',
    "mood" TEXT NOT NULL DEFAULT 'neutral',
    "bodyType" TEXT NOT NULL DEFAULT 'standard',
    "bodyColor" TEXT NOT NULL DEFAULT '#4FC3F7',
    "eyeStyle" TEXT NOT NULL DEFAULT 'round',
    "mouthStyle" TEXT NOT NULL DEFAULT 'smile',
    "lastInteractedAt" TIMESTAMP(3),
    "totalInteractions" INTEGER NOT NULL DEFAULT 0,
    "personality" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotiCharacter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BotiCharacter_userId_key" ON "BotiCharacter"("userId");

-- AddForeignKey
ALTER TABLE "BotiCharacter" ADD CONSTRAINT "BotiCharacter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
