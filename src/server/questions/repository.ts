/**
 * Repositorio del banco de preguntas: el ÚNICO sitio que traduce entre filas de
 * Postgres y el modelo de dominio, siempre validando con Zod.
 *
 * La base de datos es flexible (payload JSON); el dominio es estricto. Si una fila
 * está corrupta, `toQuestionRecord` lanza y se trata como error explícito en lugar de
 * colarse hasta la UI.
 */

import { Prisma, type Question as QuestionRow, type QuestionStat } from '@prisma/client';

import { prisma } from '../db';
import { assembleQuestion, questionRecordSchema, type QuestionInput, type QuestionRecord } from '@/domain/questions/schemas';
import type { Question, QuestionStatus, QuestionType } from '@/domain/questions/types';

export type QuestionWithStat = QuestionRow & { stat: QuestionStat | null };

export function toQuestionRecord(row: QuestionRow): QuestionRecord {
  return questionRecordSchema.parse({
    id: row.id,
    status: row.status,
    type: row.type,
    prompt: row.prompt,
    explanation: row.explanation ?? undefined,
    difficulty: row.difficulty,
    category: row.category,
    season: row.season ?? undefined,
    episode: row.episode ?? undefined,
    characters: row.characters,
    tags: row.tags,
    media: row.media ?? undefined,
    payload: row.payload,
    basePoints: row.basePoints,
    timeLimitSeconds: row.timeLimitSeconds,
    sourceNote: row.sourceNote ?? undefined,
    verified: row.verified,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function toQuestion(row: QuestionRow): Question {
  return assembleQuestion(toQuestionRecord(row));
}

/**
 * Datos de escritura a partir de una entrada ya validada.
 * Ojo: en una columna Json OPCIONAL, Prisma exige `Prisma.DbNull` para escribir NULL
 * (`null` significaría "no toques este campo").
 */
function toRowData(input: QuestionInput) {
  return {
    status: input.status,
    type: input.type,
    prompt: input.prompt,
    explanation: input.explanation ?? null,
    difficulty: input.difficulty,
    category: input.category,
    season: input.season ?? null,
    episode: input.episode ?? null,
    characters: input.characters,
    tags: input.tags,
    media: input.media ? (input.media as Prisma.InputJsonValue) : Prisma.DbNull,
    payload: input.payload as unknown as Prisma.InputJsonValue,
    basePoints: input.basePoints,
    timeLimitSeconds: input.timeLimitSeconds,
    sourceNote: input.sourceNote ?? null,
    verified: input.verified,
  };
}

// ── Consultas ───────────────────────────────────────────────────────────────────

export type QuestionFilters = {
  search?: string;
  type?: QuestionType;
  category?: string;
  status?: QuestionStatus;
  season?: number;
  verified?: boolean;
  difficultyMin?: number;
  difficultyMax?: number;
  page?: number;
  pageSize?: number;
};

export const DEFAULT_PAGE_SIZE = 20;

function toWhere(filters: QuestionFilters): Prisma.QuestionWhereInput {
  const where: Prisma.QuestionWhereInput = {};
  if (filters.type) where.type = filters.type;
  if (filters.category) where.category = filters.category;
  if (filters.status) where.status = filters.status;
  if (filters.season) where.season = filters.season;
  if (filters.verified !== undefined) where.verified = filters.verified;
  if (filters.difficultyMin !== undefined || filters.difficultyMax !== undefined) {
    where.difficulty = {
      ...(filters.difficultyMin !== undefined ? { gte: filters.difficultyMin } : {}),
      ...(filters.difficultyMax !== undefined ? { lte: filters.difficultyMax } : {}),
    };
  }
  if (filters.search) {
    where.OR = [
      { prompt: { contains: filters.search, mode: 'insensitive' } },
      { explanation: { contains: filters.search, mode: 'insensitive' } },
      { tags: { has: filters.search.toLowerCase() } },
      { characters: { has: filters.search } },
    ];
  }
  return where;
}

export type QuestionListEntry = {
  question: Question;
  stat: {
    timesShown: number;
    timesAnswered: number;
    timesCorrect: number;
    timesAbandoned: number;
    successRate: number | null;
    averageResponseMs: number | null;
    estimatedDifficulty: number | null;
  };
};

function toStatView(stat: QuestionStat | null): QuestionListEntry['stat'] {
  if (!stat) {
    return {
      timesShown: 0,
      timesAnswered: 0,
      timesCorrect: 0,
      timesAbandoned: 0,
      successRate: null,
      averageResponseMs: null,
      estimatedDifficulty: null,
    };
  }
  return {
    timesShown: stat.timesShown,
    timesAnswered: stat.timesAnswered,
    timesCorrect: stat.timesCorrect,
    timesAbandoned: stat.timesAbandoned,
    successRate:
      stat.timesAnswered > 0 ? Math.round((stat.timesCorrect / stat.timesAnswered) * 1000) / 10 : null,
    averageResponseMs:
      stat.timesAnswered > 0 ? Math.round(stat.totalResponseMs / stat.timesAnswered) : null,
    estimatedDifficulty: stat.estimatedDifficulty,
  };
}

export async function listQuestions(filters: QuestionFilters): Promise<{
  entries: QuestionListEntry[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, filters.pageSize ?? DEFAULT_PAGE_SIZE));
  const where = toWhere(filters);

  const [rows, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: { stat: true },
      orderBy: [{ updatedAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.question.count({ where }),
  ]);

  return {
    entries: rows.map((row) => ({ question: toQuestion(row), stat: toStatView(row.stat) })),
    total,
    page,
    pageSize,
  };
}

export async function getQuestion(id: string): Promise<QuestionListEntry | null> {
  const row = await prisma.question.findUnique({ where: { id }, include: { stat: true } });
  if (!row) return null;
  return { question: toQuestion(row), stat: toStatView(row.stat) };
}

export async function countQuestions(): Promise<{
  total: number;
  active: number;
  verified: number;
  byType: Record<string, number>;
}> {
  const [total, active, verified, grouped] = await Promise.all([
    prisma.question.count(),
    prisma.question.count({ where: { status: 'ACTIVE' } }),
    prisma.question.count({ where: { verified: true } }),
    prisma.question.groupBy({ by: ['type'], _count: { _all: true } }),
  ]);

  const byType: Record<string, number> = {};
  for (const entry of grouped) byType[entry.type] = entry._count._all;

  return { total, active, verified, byType };
}

// ── Escritura ───────────────────────────────────────────────────────────────────

export async function createQuestion(input: QuestionInput): Promise<Question> {
  const row = await prisma.question.create({
    data: { ...toRowData(input), stat: { create: {} } },
  });
  return toQuestion(row);
}

export async function updateQuestion(id: string, input: QuestionInput): Promise<Question> {
  const row = await prisma.question.update({ where: { id }, data: toRowData(input) });
  return toQuestion(row);
}

export async function setQuestionStatus(id: string, status: QuestionStatus): Promise<Question> {
  const row = await prisma.question.update({ where: { id }, data: { status } });
  return toQuestion(row);
}

export async function duplicateQuestion(id: string): Promise<Question | null> {
  const source = await prisma.question.findUnique({ where: { id } });
  if (!source) return null;

  const row = await prisma.question.create({
    data: {
      status: 'DRAFT',
      type: source.type,
      prompt: `${source.prompt} (copia)`,
      explanation: source.explanation,
      difficulty: source.difficulty,
      category: source.category,
      season: source.season,
      episode: source.episode,
      characters: source.characters,
      tags: source.tags,
      media: source.media === null ? Prisma.DbNull : (source.media as Prisma.InputJsonValue),
      payload: source.payload as Prisma.InputJsonValue,
      basePoints: source.basePoints,
      timeLimitSeconds: source.timeLimitSeconds,
      sourceNote: source.sourceNote,
      verified: false,
      stat: { create: {} },
    },
  });
  return toQuestion(row);
}

export async function deleteQuestion(id: string): Promise<void> {
  await prisma.question.delete({ where: { id } });
}

// ── Banco disponible para jugar ─────────────────────────────────────────────────

/**
 * Preguntas ACTIVE candidatas para una partida.
 *
 * Nota de escala: con un banco pequeño (cientos) traerlo entero es lo más simple y
 * rápido. Si el banco creciera a decenas de miles, aquí es donde habría que muestrear
 * en SQL (`ORDER BY random() LIMIT n` por tipo/dificultad) en vez de en memoria.
 */
export async function loadPlayableQuestions(options?: {
  categories?: string[];
  types?: QuestionType[];
  limit?: number;
}): Promise<Question[]> {
  const rows = await prisma.question.findMany({
    where: {
      status: 'ACTIVE',
      ...(options?.categories?.length ? { category: { in: options.categories } } : {}),
      ...(options?.types?.length ? { type: { in: options.types } } : {}),
    },
    ...(options?.limit ? { take: options.limit } : {}),
  });
  return rows.map(toQuestion);
}
