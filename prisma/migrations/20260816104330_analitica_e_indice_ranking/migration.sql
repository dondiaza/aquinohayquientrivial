-- CreateTable
CREATE TABLE "AnalyticsCount" (
    "dia" TEXT NOT NULL,
    "evento" TEXT NOT NULL,
    "veces" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsCount_pkey" PRIMARY KEY ("dia","evento")
);

-- CreateIndex
CREATE INDEX "AnalyticsCount_dia_idx" ON "AnalyticsCount"("dia");

-- CreateIndex
CREATE INDEX "XpTransaction_createdAt_userId_idx" ON "XpTransaction"("createdAt", "userId");
