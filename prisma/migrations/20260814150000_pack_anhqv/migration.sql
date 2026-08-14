-- Pack editorial ANHQV: familia de respuesta escrita y metadatos de contenido.
--
-- `ALTER TYPE ... ADD VALUE` va primero y el valor NO se usa en esta misma migración:
-- PostgreSQL solo permite usar un valor de enum nuevo cuando la transacción que lo creó
-- ya ha terminado.
ALTER TYPE "QuestionType" ADD VALUE 'SHORT_ANSWER';

-- Metadatos que trae el pack y que la selección de preguntas necesita como columnas
-- reales (se filtra por ellos en cada pregunta de cada partida).
ALTER TABLE "Question" ADD COLUMN "spoiler" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "Question" ADD COLUMN "confidence" TEXT NOT NULL DEFAULT 'high';
ALTER TABLE "Question" ADD COLUMN "variant" TEXT;
ALTER TABLE "Question" ADD COLUMN "factKey" TEXT;
ALTER TABLE "Question" ADD COLUMN "needsReview" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Question_status_spoiler_idx" ON "Question"("status", "spoiler");
CREATE INDEX "Question_factKey_idx" ON "Question"("factKey");
CREATE INDEX "Question_needsReview_idx" ON "Question"("needsReview");
