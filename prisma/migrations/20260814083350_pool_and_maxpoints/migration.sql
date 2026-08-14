-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "poolIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
