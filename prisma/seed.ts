/**
 * Seed del banco de preguntas de AQUÍ NO HAY QUIEN VIVA.
 *
 * Fuente: el pack editorial (`src/content/anhqv/data/`) traducido por el importador, más
 * el contenido derivado de la biblia (infiltrados, cronologías, memoria del portal,
 * escenas, juntas y portero automático).
 *
 * Es idempotente y conserva el historial:
 *
 *   · los ids del pack (`Q0001`…) y de las derivadas (`D-…`) son estables, así que volver
 *     a sembrar ACTUALIZA en lugar de duplicar;
 *   · lo que ya no forma parte del banco NO se borra: se ARCHIVA. Borrarlo arrastraría por
 *     cascada las respuestas de partidas antiguas, y el historial de la gente no se toca;
 *   · se escribe por lotes dentro de transacciones: 1.000 preguntas por una conexión
 *     agrupada (Neon) no se pueden mandar de una en una.
 *
 *   npm run db:seed
 */

import { Prisma, PrismaClient } from '@prisma/client';

import { bancoANHQV } from '../src/content/anhqv/banco';
import { RESUMEN_PACK } from '../src/content/anhqv/catalogos';

const prisma = new PrismaClient();

/** Tamaño de lote: suficiente para ir rápido sin pasarse con el tamaño de la consulta. */
const LOTE = 100;

function trozos<T>(items: readonly T[], tamano: number): T[][] {
  const resultado: T[][] = [];
  for (let indice = 0; indice < items.length; indice += tamano) {
    resultado.push(items.slice(indice, indice + tamano));
  }
  return resultado;
}

async function main(): Promise<void> {
  const { registros, diagnostico } = bancoANHQV();

  const idsPrevios = new Set(
    (await prisma.question.findMany({ select: { id: true } })).map((fila) => fila.id),
  );

  let creadas = 0;
  let actualizadas = 0;

  for (const lote of trozos(registros, LOTE)) {
    await prisma.$transaction(
      lote.map((record) => {
        const data = {
          status: record.status,
          type: record.type,
          prompt: record.prompt,
          explanation: record.explanation ?? null,
          difficulty: record.difficulty,
          category: record.category,
          season: record.season ?? null,
          episode: record.episode ?? null,
          characters: record.characters,
          tags: record.tags,
          // En columnas Json opcionales, Prisma exige DbNull para escribir NULL.
          media: record.media ? (record.media as Prisma.InputJsonValue) : Prisma.DbNull,
          payload: record.payload as unknown as Prisma.InputJsonValue,
          basePoints: record.basePoints,
          timeLimitSeconds: record.timeLimitSeconds,
          sourceNote: record.sourceNote ?? null,
          verified: record.verified,
          featured: record.featured,
          spoiler: record.spoiler,
          confidence: record.confidence,
          variant: record.variant ?? null,
          factKey: record.factKey ?? null,
          needsReview: record.needsReview,
        };
        return prisma.question.upsert({
          where: { id: record.id },
          create: { id: record.id, ...data },
          update: data,
        });
      }),
    );

    for (const record of lote) {
      if (idsPrevios.has(record.id)) actualizadas += 1;
      else creadas += 1;
    }
  }

  // Estadísticas: una fila por pregunta, sin tocar los contadores existentes.
  for (const lote of trozos(registros, LOTE)) {
    await prisma.$transaction(
      lote.map((record) =>
        prisma.questionStat.upsert({
          where: { questionId: record.id },
          create: { questionId: record.id },
          update: {},
        }),
      ),
    );
  }

  // Lo que ya no está en el banco se archiva (nunca se borra: hay partidas apuntando ahí).
  const idsActuales = new Set(registros.map((record) => record.id));
  const sobrantes = [...idsPrevios].filter((id) => !idsActuales.has(id));
  let archivadas = 0;
  if (sobrantes.length > 0) {
    const resultado = await prisma.question.updateMany({
      where: { id: { in: sobrantes }, status: { not: 'ARCHIVED' } },
      data: { status: 'ARCHIVED' },
    });
    archivadas = resultado.count;
  }

  const porTipo = Object.entries(diagnostico.porTipo)
    .sort(([, a], [, b]) => b - a)
    .map(([tipo, cuantas]) => `${tipo}: ${cuantas}`)
    .join(' · ');

  console.log('');
  console.log('  AQUÍ NO HAY QUIEN VIVA — banco sembrado');
  console.log(`  ${registros.length} preguntas (${creadas} nuevas, ${actualizadas} actualizadas)`);
  if (archivadas > 0) console.log(`  ${archivadas} preguntas antiguas archivadas`);
  console.log('');
  console.log(`  Del pack editorial: ${diagnostico.total}`);
  console.log(`  Derivadas de la biblia: ${diagnostico.derivadas}`);
  console.log(`  Publicadas: ${diagnostico.publicadas} · en revisión: ${diagnostico.enRevision}`);
  console.log(`  Erratas corregidas: ${diagnostico.erratas}`);
  console.log(`  Por tipo → ${porTipo}`);
  console.log('');
  console.log(
    `  Catálogos del pack: ${RESUMEN_PACK.pruebas} pruebas · ${RESUMEN_PACK.modos} modos · ` +
      `${RESUMEN_PACK.rondas} rondas · ${RESUMEN_PACK.tarjetas} tarjetas`,
  );

  if (diagnostico.revisar.length > 0) {
    console.log('');
    console.log('  Pendientes de revisión humana (quedan en borrador, no se juegan):');
    for (const entrada of diagnostico.revisar) {
      console.log(`    · ${entrada.id} — ${entrada.motivo}`);
    }
  }
  console.log('');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
