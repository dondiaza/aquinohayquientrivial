-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuestionType" ADD VALUE 'MEMORY_GRID';
ALTER TYPE "QuestionType" ADD VALUE 'MISSING_ITEM';
ALTER TYPE "QuestionType" ADD VALUE 'DECISION';
ALTER TYPE "QuestionType" ADD VALUE 'SEQUENCE';

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "dailyKey" TEXT,
ADD COLUMN     "ghostTrail" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "origin" TEXT NOT NULL DEFAULT 'LIBRE',
ADD COLUMN     "seedLabel" TEXT;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PlayerProfile" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "displayName" TEXT,
    "arquetipo" TEXT NOT NULL DEFAULT 'presidente',
    "colorAvatar" TEXT NOT NULL DEFAULT 'verde',
    "marco" TEXT NOT NULL DEFAULT 'ninguno',
    "xp" INTEGER NOT NULL DEFAULT 0,
    "gamesFinished" INTEGER NOT NULL DEFAULT 0,
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "totalCorrect" INTEGER NOT NULL DEFAULT 0,
    "totalAnswers" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerAchievement" (
    "id" SERIAL NOT NULL,
    "profileId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "gameId" TEXT,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalBest" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "formatId" TEXT NOT NULL,
    "difficultyId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "gameId" TEXT NOT NULL,
    "trail" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalBest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyResult" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "dailyKey" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProfile_guestId_key" ON "PlayerProfile"("guestId");

-- CreateIndex
CREATE INDEX "PlayerAchievement_profileId_idx" ON "PlayerAchievement"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerAchievement_profileId_achievementId_key" ON "PlayerAchievement"("profileId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalBest_guestId_formatId_difficultyId_key" ON "PersonalBest"("guestId", "formatId", "difficultyId");

-- CreateIndex
CREATE INDEX "DailyResult_dailyKey_score_idx" ON "DailyResult"("dailyKey", "score");

-- CreateIndex
CREATE UNIQUE INDEX "DailyResult_guestId_dailyKey_key" ON "DailyResult"("guestId", "dailyKey");

-- CreateIndex
CREATE INDEX "Game_guestId_formatId_difficultyId_idx" ON "Game"("guestId", "formatId", "difficultyId");

-- CreateIndex
CREATE INDEX "Game_dailyKey_idx" ON "Game"("dailyKey");

-- CreateIndex
CREATE INDEX "Question_status_featured_idx" ON "Question"("status", "featured");

-- AddForeignKey
ALTER TABLE "PlayerProfile" ADD CONSTRAINT "PlayerProfile_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "GuestPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAchievement" ADD CONSTRAINT "PlayerAchievement_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalBest" ADD CONSTRAINT "PersonalBest_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "GuestPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyResult" ADD CONSTRAINT "DailyResult_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "GuestPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
