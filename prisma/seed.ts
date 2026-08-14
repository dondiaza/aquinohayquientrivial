/**
 * Seed del banco de preguntas.
 *
 * Idempotente: los ids son slugs estables, así que volver a ejecutarlo actualiza el
 * contenido en lugar de duplicarlo. No borra preguntas creadas desde el panel.
 *
 *   npm run db:seed
 */

import { Prisma, PrismaClient } from '@prisma/client';

import { validatedDemoRecords } from '../src/content/demo';
import { QUESTION_TYPE_META } from '../src/domain/questions/registry';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const records = validatedDemoRecords();

  let created = 0;
  let updated = 0;

  for (const record of records) {
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
    };

    const existing = await prisma.question.findUnique({ where: { id: record.id } });
    if (existing) {
      await prisma.question.update({ where: { id: record.id }, data });
      updated += 1;
    } else {
      await prisma.question.create({ data: { id: record.id, ...data } });
      created += 1;
    }

    await prisma.questionStat.upsert({
      where: { questionId: record.id },
      create: { questionId: record.id },
      update: {},
    });
  }

  const byType = Object.keys(QUESTION_TYPE_META)
    .map((type) => `${type}: ${records.filter((record) => record.type === type).length}`)
    .join(' · ');

  console.log('');
  console.log(`  Banco sembrado: ${records.length} preguntas (${created} nuevas, ${updated} actualizadas)`);
  console.log(`  Por tipo → ${byType}`);
  console.log('');
  console.log('  Aviso: TODAS las preguntas del seed son CONTENIDO DEMO (verified = false).');
  console.log('  Describen una comunidad de vecinos ficticia y no son canon de ninguna serie.');
  console.log('');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
