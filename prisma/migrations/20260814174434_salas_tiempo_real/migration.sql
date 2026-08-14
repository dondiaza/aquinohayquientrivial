-- CreateEnum
CREATE TYPE "RoomPhase" AS ENUM ('LOBBY', 'COUNTDOWN', 'ROUND_INTRO', 'QUESTION', 'LOCKED', 'REVEAL', 'SCORE', 'ROUND_RESULTS', 'FINAL_BET', 'GAME_RESULTS', 'CLOSED');

-- CreateEnum
CREATE TYPE "RoomPrivacy" AS ENUM ('PRIVADA', 'PROTEGIDA', 'PUBLICA');

-- CreateEnum
CREATE TYPE "RoomTeamMode" AS ENUM ('NINGUNO', 'COMPARTIDO', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "RoomLateJoin" AS ENUM ('CERRADO', 'ESPECTADOR', 'PRIMERA_RONDA', 'ABIERTO');

-- CreateEnum
CREATE TYPE "RoomRole" AS ENUM ('HOST', 'PLAYER', 'SPECTATOR');

-- CreateEnum
CREATE TYPE "RoomMemberStatus" AS ENUM ('ACTIVE', 'RECONNECTING', 'AWAY', 'KICKED', 'LEFT');

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "hostToken" TEXT NOT NULL,
    "phase" "RoomPhase" NOT NULL DEFAULT 'LOBBY',
    "privacy" "RoomPrivacy" NOT NULL DEFAULT 'PRIVADA',
    "teamMode" "RoomTeamMode" NOT NULL DEFAULT 'NINGUNO',
    "lateJoin" "RoomLateJoin" NOT NULL DEFAULT 'PRIMERA_RONDA',
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "autoPilot" BOOLEAN NOT NULL DEFAULT true,
    "leaderboardEvery" INTEGER NOT NULL DEFAULT 3,
    "reactionsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxPlayers" INTEGER NOT NULL DEFAULT 24,
    "config" JSONB NOT NULL,
    "seed" TEXT NOT NULL,
    "poolIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "state" JSONB NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "hostSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomPlayer" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" "RoomRole" NOT NULL DEFAULT 'PLAYER',
    "status" "RoomMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "nickname" TEXT NOT NULL,
    "arquetipo" TEXT NOT NULL DEFAULT 'presidente',
    "colorAvatar" TEXT NOT NULL DEFAULT 'verde',
    "teamId" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "answered" INTEGER NOT NULL DEFAULT 0,
    "totalResponseMs" INTEGER NOT NULL DEFAULT 0,
    "powerUpsUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "joinScore" INTEGER NOT NULL DEFAULT 0,
    "joinedAtIndex" INTEGER NOT NULL DEFAULT 0,
    "guestId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomTeam" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RoomTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomAnswer" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionIndex" INTEGER NOT NULL,
    "roundId" TEXT NOT NULL,
    "opId" TEXT NOT NULL,
    "answered" BOOLEAN NOT NULL DEFAULT true,
    "correct" BOOLEAN NOT NULL DEFAULT false,
    "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "responseMs" INTEGER NOT NULL DEFAULT 0,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "basePoints" INTEGER NOT NULL DEFAULT 0,
    "timeBonus" INTEGER NOT NULL DEFAULT 0,
    "streakBonus" INTEGER NOT NULL DEFAULT 0,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "streakAfter" INTEGER NOT NULL DEFAULT 0,
    "wager" INTEGER,
    "powerUpsUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "submitted" JSONB,
    "texto" TEXT,
    "votes" INTEGER NOT NULL DEFAULT 0,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomEvent" (
    "id" BIGSERIAL NOT NULL,
    "roomId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'ALL',
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomReaction" (
    "id" BIGSERIAL NOT NULL,
    "roomId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_code_key" ON "Room"("code");

-- CreateIndex
CREATE INDEX "Room_phase_expiresAt_idx" ON "Room"("phase", "expiresAt");

-- CreateIndex
CREATE INDEX "Room_expiresAt_idx" ON "Room"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RoomPlayer_token_key" ON "RoomPlayer"("token");

-- CreateIndex
CREATE INDEX "RoomPlayer_roomId_status_idx" ON "RoomPlayer"("roomId", "status");

-- CreateIndex
CREATE INDEX "RoomPlayer_roomId_score_idx" ON "RoomPlayer"("roomId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "RoomPlayer_roomId_nickname_key" ON "RoomPlayer"("roomId", "nickname");

-- CreateIndex
CREATE INDEX "RoomTeam_roomId_idx" ON "RoomTeam"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomTeam_roomId_slot_key" ON "RoomTeam"("roomId", "slot");

-- CreateIndex
CREATE INDEX "RoomAnswer_roomId_questionIndex_idx" ON "RoomAnswer"("roomId", "questionIndex");

-- CreateIndex
CREATE UNIQUE INDEX "RoomAnswer_roomId_playerId_questionIndex_key" ON "RoomAnswer"("roomId", "playerId", "questionIndex");

-- CreateIndex
CREATE UNIQUE INDEX "RoomAnswer_roomId_playerId_opId_key" ON "RoomAnswer"("roomId", "playerId", "opId");

-- CreateIndex
CREATE INDEX "RoomEvent_roomId_seq_idx" ON "RoomEvent"("roomId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "RoomEvent_roomId_seq_key" ON "RoomEvent"("roomId", "seq");

-- CreateIndex
CREATE INDEX "RoomReaction_roomId_at_idx" ON "RoomReaction"("roomId", "at");

-- AddForeignKey
ALTER TABLE "RoomPlayer" ADD CONSTRAINT "RoomPlayer_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomPlayer" ADD CONSTRAINT "RoomPlayer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "RoomTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomTeam" ADD CONSTRAINT "RoomTeam_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomAnswer" ADD CONSTRAINT "RoomAnswer_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomAnswer" ADD CONSTRAINT "RoomAnswer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "RoomPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomEvent" ADD CONSTRAINT "RoomEvent_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomReaction" ADD CONSTRAINT "RoomReaction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "RoomPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
