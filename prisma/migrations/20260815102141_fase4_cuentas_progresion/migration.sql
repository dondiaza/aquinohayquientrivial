/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "VisibilidadPerfil" AS ENUM ('TODOS', 'AMIGOS', 'NADIE');

-- CreateEnum
CREATE TYPE "EstadoAmistad" AS ENUM ('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoCuenta" AS ENUM ('ACTIVA', 'SUSPENDIDA', 'BANEADA', 'PENDIENTE_BORRADO');

-- CreateEnum
CREATE TYPE "CanalNotificacion" AS ENUM ('IN_APP', 'PUSH', 'EMAIL');

-- CreateEnum
CREATE TYPE "EstadoEnvio" AS ENUM ('PENDIENTE', 'ENVIADA', 'ENTREGADA', 'ABIERTA', 'FALLIDA', 'DESCARTADA');

-- CreateEnum
CREATE TYPE "EstadoDesafio" AS ENUM ('ABIERTO', 'COMPLETADO', 'CADUCADO', 'RECHAZADO');

-- DropForeignKey
ALTER TABLE "GuestPlayer" DROP CONSTRAINT "GuestPlayer_userId_fkey";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "UserAccount" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "estado" "EstadoCuenta" NOT NULL DEFAULT 'ACTIVA',
    "username" TEXT NOT NULL,
    "usernameChangedAt" TIMESTAMP(3),
    "friendCode" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
    "locale" TEXT NOT NULL DEFAULT 'es-ES',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleteAfter" TIMESTAMP(3),

    CONSTRAINT "UserAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "dispositivo" TEXT,
    "userAgent" TEXT,
    "ipPrefijo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "intentos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LoginToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "titulo" TEXT,
    "arquetipo" TEXT NOT NULL DEFAULT 'presidente',
    "colorAvatar" TEXT NOT NULL DEFAULT 'verde',
    "marco" TEXT NOT NULL DEFAULT 'ninguno',
    "fondo" TEXT NOT NULL DEFAULT 'ninguno',
    "xp" INTEGER NOT NULL DEFAULT 0,
    "nivel" INTEGER NOT NULL DEFAULT 1,
    "rango" TEXT NOT NULL DEFAULT 'visitante',
    "skillRating" INTEGER NOT NULL DEFAULT 1000,
    "skillPartidas" INTEGER NOT NULL DEFAULT 0,
    "partidas" INTEGER NOT NULL DEFAULT 0,
    "victorias" INTEGER NOT NULL DEFAULT 0,
    "aciertos" INTEGER NOT NULL DEFAULT 0,
    "respuestas" INTEGER NOT NULL DEFAULT 0,
    "mejorRacha" INTEGER NOT NULL DEFAULT 0,
    "categoriaFavorita" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "userId" TEXT NOT NULL,
    "perfilVisible" "VisibilidadPerfil" NOT NULL DEFAULT 'TODOS',
    "estadisticasVisibles" "VisibilidadPerfil" NOT NULL DEFAULT 'TODOS',
    "presenciaVisible" "VisibilidadPerfil" NOT NULL DEFAULT 'AMIGOS',
    "actividadVisible" "VisibilidadPerfil" NOT NULL DEFAULT 'AMIGOS',
    "quienPuedeInvitar" "VisibilidadPerfil" NOT NULL DEFAULT 'AMIGOS',
    "quienPuedeRetar" "VisibilidadPerfil" NOT NULL DEFAULT 'AMIGOS',
    "quienPuedeSolicitar" "VisibilidadPerfil" NOT NULL DEFAULT 'TODOS',
    "silencioActivo" BOOLEAN NOT NULL DEFAULT true,
    "silencioDesde" INTEGER NOT NULL DEFAULT 1380,
    "silencioHasta" INTEGER NOT NULL DEFAULT 540,
    "horaHabitual" INTEGER,
    "reduccionMovimiento" BOOLEAN NOT NULL DEFAULT false,
    "sonido" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "canal" "CanalNotificacion" NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XpTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "recortado" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Streak" (
    "userId" TEXT NOT NULL,
    "actual" INTEGER NOT NULL DEFAULT 0,
    "mejor" INTEGER NOT NULL DEFAULT 0,
    "ultimoDia" TEXT,
    "seguros" INTEGER NOT NULL DEFAULT 0,
    "segurosUsados" INTEGER NOT NULL DEFAULT 0,
    "recuperacionHasta" TIMESTAMP(3),
    "recuperacionObjetivo" INTEGER NOT NULL DEFAULT 0,
    "recuperacionHechos" INTEGER NOT NULL DEFAULT 0,
    "recuperacionRacha" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Streak_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceId" TEXT,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "destacada" BOOLEAN NOT NULL DEFAULT false,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "aId" TEXT NOT NULL,
    "bId" TEXT NOT NULL,
    "since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "juntos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FriendRequest" (
    "id" TEXT NOT NULL,
    "solicitanteId" TEXT NOT NULL,
    "destinatarioId" TEXT NOT NULL,
    "estado" "EstadoAmistad" NOT NULL DEFAULT 'PENDIENTE',
    "mensaje" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resueltaAt" TIMESTAMP(3),

    CONSTRAINT "FriendRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "bloqueadorId" TEXT NOT NULL,
    "bloqueadoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "retadorId" TEXT NOT NULL,
    "estado" "EstadoDesafio" NOT NULL DEFAULT 'ABIERTO',
    "seed" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "puntosRetador" INTEGER,
    "gameIdRetador" TEXT,
    "esGrupal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeParticipant" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "puntos" INTEGER,
    "precision" DOUBLE PRECISION,
    "gameId" TEXT,
    "jugadoAt" TIMESTAMP(3),
    "revanchaDe" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Community" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "icono" TEXT NOT NULL DEFAULT '🏢',
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityMember" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "esAdmin" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "puntosSemana" INTEGER NOT NULL DEFAULT 0,
    "puntosMes" INTEGER NOT NULL DEFAULT 0,
    "puntosTotal" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CommunityMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "empiezaAt" TIMESTAMP(3) NOT NULL,
    "terminaAt" TIMESTAMP(3) NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSeasonProgress" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "retos" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "UserSeasonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueSeason" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "liga" TEXT NOT NULL,
    "empiezaAt" TIMESTAMP(3) NOT NULL,
    "terminaAt" TIMESTAMP(3) NOT NULL,
    "cerrada" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LeagueSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueGroup" (
    "id" TEXT NOT NULL,
    "leagueSeasonId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,

    CONSTRAINT "LeagueGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueParticipant" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "puntos" INTEGER NOT NULL DEFAULT 0,
    "puntosHoy" INTEGER NOT NULL DEFAULT 0,
    "ultimoDia" TEXT,
    "posicionFinal" INTEGER,
    "resultado" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeagueParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "deepLink" TEXT NOT NULL,
    "payload" JSONB,
    "prioridad" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "dispositivo" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastOkAt" TIMESTAMP(3),
    "fallos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT,
    "userId" TEXT NOT NULL,
    "canal" "CanalNotificacion" NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "estado" "EstadoEnvio" NOT NULL DEFAULT 'PENDIENTE',
    "motivoDescarte" TEXT,
    "variante" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "deepLink" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reportanteId" TEXT NOT NULL,
    "reportadoId" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "detalle" TEXT,
    "resuelto" BOOLEAN NOT NULL DEFAULT false,
    "resueltoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAudit" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "objetivo" TEXT,
    "detalle" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAccount_email_key" ON "UserAccount"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccount_username_key" ON "UserAccount"("username");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccount_friendCode_key" ON "UserAccount"("friendCode");

-- CreateIndex
CREATE INDEX "UserAccount_estado_lastSeenAt_idx" ON "UserAccount"("estado", "lastSeenAt");

-- CreateIndex
CREATE INDEX "UserAccount_deleteAfter_idx" ON "UserAccount"("deleteAfter");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession"("tokenHash");

-- CreateIndex
CREATE INDEX "UserSession_userId_expiresAt_idx" ON "UserSession"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "LoginToken_tokenHash_key" ON "LoginToken"("tokenHash");

-- CreateIndex
CREATE INDEX "LoginToken_email_createdAt_idx" ON "LoginToken"("email", "createdAt");

-- CreateIndex
CREATE INDEX "LoginToken_expiresAt_idx" ON "LoginToken"("expiresAt");

-- CreateIndex
CREATE INDEX "UserProfile_xp_idx" ON "UserProfile"("xp");

-- CreateIndex
CREATE INDEX "UserProfile_skillRating_idx" ON "UserProfile"("skillRating");

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_categoria_canal_key" ON "NotificationPreference"("userId", "categoria", "canal");

-- CreateIndex
CREATE INDEX "XpTransaction_userId_createdAt_idx" ON "XpTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "XpTransaction_userId_motivo_createdAt_idx" ON "XpTransaction"("userId", "motivo", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "XpTransaction_userId_motivo_sourceId_key" ON "XpTransaction"("userId", "motivo", "sourceId");

-- CreateIndex
CREATE INDEX "UserAchievement_userId_unlockedAt_idx" ON "UserAchievement"("userId", "unlockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");

-- CreateIndex
CREATE INDEX "UserBadge_userId_destacada_idx" ON "UserBadge"("userId", "destacada");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");

-- CreateIndex
CREATE INDEX "Friendship_aId_idx" ON "Friendship"("aId");

-- CreateIndex
CREATE INDEX "Friendship_bId_idx" ON "Friendship"("bId");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_aId_bId_key" ON "Friendship"("aId", "bId");

-- CreateIndex
CREATE INDEX "FriendRequest_destinatarioId_estado_idx" ON "FriendRequest"("destinatarioId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "FriendRequest_solicitanteId_destinatarioId_key" ON "FriendRequest"("solicitanteId", "destinatarioId");

-- CreateIndex
CREATE INDEX "Block_bloqueadoId_idx" ON "Block"("bloqueadoId");

-- CreateIndex
CREATE UNIQUE INDEX "Block_bloqueadorId_bloqueadoId_key" ON "Block"("bloqueadorId", "bloqueadoId");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_etiqueta_key" ON "Challenge"("etiqueta");

-- CreateIndex
CREATE INDEX "Challenge_retadorId_estado_idx" ON "Challenge"("retadorId", "estado");

-- CreateIndex
CREATE INDEX "Challenge_expiresAt_idx" ON "Challenge"("expiresAt");

-- CreateIndex
CREATE INDEX "ChallengeParticipant_userId_jugadoAt_idx" ON "ChallengeParticipant"("userId", "jugadoAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeParticipant_challengeId_userId_key" ON "ChallengeParticipant"("challengeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Community_codigo_key" ON "Community"("codigo");

-- CreateIndex
CREATE INDEX "Community_codigo_idx" ON "Community"("codigo");

-- CreateIndex
CREATE INDEX "CommunityMember_communityId_puntosSemana_idx" ON "CommunityMember"("communityId", "puntosSemana");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityMember_communityId_userId_key" ON "CommunityMember"("communityId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Season_slug_key" ON "Season"("slug");

-- CreateIndex
CREATE INDEX "Season_activa_terminaAt_idx" ON "Season"("activa", "terminaAt");

-- CreateIndex
CREATE INDEX "UserSeasonProgress_seasonId_xp_idx" ON "UserSeasonProgress"("seasonId", "xp");

-- CreateIndex
CREATE UNIQUE INDEX "UserSeasonProgress_seasonId_userId_key" ON "UserSeasonProgress"("seasonId", "userId");

-- CreateIndex
CREATE INDEX "LeagueSeason_terminaAt_cerrada_idx" ON "LeagueSeason"("terminaAt", "cerrada");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueSeason_seasonId_liga_key" ON "LeagueSeason"("seasonId", "liga");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueGroup_leagueSeasonId_numero_key" ON "LeagueGroup"("leagueSeasonId", "numero");

-- CreateIndex
CREATE INDEX "LeagueParticipant_groupId_puntos_idx" ON "LeagueParticipant"("groupId", "puntos");

-- CreateIndex
CREATE INDEX "LeagueParticipant_userId_idx" ON "LeagueParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueParticipant_groupId_userId_key" ON "LeagueParticipant"("groupId", "userId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_expiresAt_idx" ON "Notification"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "NotificationDelivery_userId_createdAt_idx" ON "NotificationDelivery"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_tipo_estado_createdAt_idx" ON "NotificationDelivery"("tipo", "estado", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_userId_createdAt_idx" ON "ActivityEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Report_resuelto_createdAt_idx" ON "Report"("resuelto", "createdAt");

-- CreateIndex
CREATE INDEX "Report_reportadoId_idx" ON "Report"("reportadoId");

-- CreateIndex
CREATE INDEX "AdminAudit_createdAt_idx" ON "AdminAudit"("createdAt");

-- AddForeignKey
ALTER TABLE "GuestPlayer" ADD CONSTRAINT "GuestPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserSettings"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpTransaction" ADD CONSTRAINT "XpTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Streak" ADD CONSTRAINT "Streak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_aId_fkey" FOREIGN KEY ("aId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_bId_fkey" FOREIGN KEY ("bId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_bloqueadorId_fkey" FOREIGN KEY ("bloqueadorId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_bloqueadoId_fkey" FOREIGN KEY ("bloqueadoId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_retadorId_fkey" FOREIGN KEY ("retadorId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeParticipant" ADD CONSTRAINT "ChallengeParticipant_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeParticipant" ADD CONSTRAINT "ChallengeParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSeasonProgress" ADD CONSTRAINT "UserSeasonProgress_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSeasonProgress" ADD CONSTRAINT "UserSeasonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueSeason" ADD CONSTRAINT "LeagueSeason_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueGroup" ADD CONSTRAINT "LeagueGroup_leagueSeasonId_fkey" FOREIGN KEY ("leagueSeasonId") REFERENCES "LeagueSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueParticipant" ADD CONSTRAINT "LeagueParticipant_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "LeagueGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueParticipant" ADD CONSTRAINT "LeagueParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportanteId_fkey" FOREIGN KEY ("reportanteId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportadoId_fkey" FOREIGN KEY ("reportadoId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
