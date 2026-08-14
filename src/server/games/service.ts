/**
 * Servicio de partidas: crear, registrar respuestas y cerrar.
 *
 * Reparto de responsabilidades en Fase 1:
 *
 *   · El motor (cliente) decide y puntúa; el servidor REGISTRA cada respuesta con su
 *     desglose y actualiza la analítica del banco.
 *   · El RESUMEN FINAL lo recalcula el servidor a partir de las respuestas persistidas
 *     (`buildSummary`), no se acepta un resumen enviado por el cliente. Es la misma
 *     función pura que usa el motor, así que los números coinciden.
 *
 * En Fase 3 este servicio pasa a ejecutar `applyAction` él mismo y a emitir los eventos;
 * los contratos (src/domain/engine/wire.ts) y el modelo de datos no cambian.
 */

import type { Prisma } from '@prisma/client';

import { prisma } from '../db';
import { ensureGuestPlayer } from '../guest';
import { loadPlayableQuestions, toQuestion } from '../questions/repository';
import { estimateDifficulty } from '@/domain/questions/analytics';
import { buildSummary, type GameSummary } from '@/domain/results/summary';
import { gameConfigSchema } from '@/domain/engine/config';
import { getGameFormat, totalQuestions } from '@/domain/rounds/formats';
import { newSeed, shuffle, createRng } from '@/domain/rng';
import { CATEGORY_MIX } from '@/domain/questions/categories';
import { POWER_UP_IDS, type PowerUpId } from '@/domain/powerups/powerups';
import { QUESTION_TYPES, type Question, type QuestionType } from '@/domain/questions/types';
import { answerSubmissionSchema } from '@/domain/engine/wire';
import type { FinishGameRequest, ReportAnswerRequest } from '@/domain/engine/wire';
import { obtenerFantasma, registrarFinDePartida, type ResultadoProgresion } from '../players/service';
import type { GameSetup } from '@/domain/engine/config';
import type {
  AnsweredQuestion,
  GameConfig,
  GameOrigin,
  GhostRun,
  RoundProgress,
} from '@/domain/engine/state';

/** Cuántas preguntas de reserva se envían por cada una que se va a jugar. */
const POOL_OVERSHOOT = 2.2;
/** Preguntas de OTRAS categorías que van en el pool para que la relajación tenga material. */
const OTHER_CATEGORY_RESERVE = 24;

export type CreatedGame = {
  gameId: string;
  config: GameConfig;
  /** Banco reducido con el que jugará el motor en el cliente. */
  pool: Question[];
};

export type GameForPlay = {
  gameId: string;
  config: GameConfig;
  pool: Question[];
  status: 'IN_PROGRESS' | 'FINISHED' | 'ABANDONED';
  /** Récord anterior con el que competir (modo fantasma). */
  ghost: GhostRun | null;
};

/**
 * Construye el pool de la partida: suficiente para todas las rondas, con reserva por
 * tipo, y una pequeña reserva de otras categorías. Se mezcla con la semilla de la
 * partida para que dos partidas seguidas no vean el mismo subconjunto.
 */
export function buildGamePool(all: readonly Question[], config: GameConfig): Question[] {
  const format = getGameFormat(config.formatId);
  const rng = createRng(config.seed, 9999);

  const needByType = new Map<QuestionType, number>();
  for (const round of format.rounds) {
    const types = round.allowedTypes.length > 0 ? round.allowedTypes : QUESTION_TYPES;
    for (const type of types) {
      needByType.set(type, (needByType.get(type) ?? 0) + round.questionCount);
    }
  }

  const inCategory =
    config.category === CATEGORY_MIX
      ? [...all]
      : all.filter((question) => question.category === config.category);
  const outOfCategory =
    config.category === CATEGORY_MIX
      ? []
      : all.filter((question) => question.category !== config.category);

  const picked = new Map<string, Question>();

  for (const [type, need] of needByType) {
    const target = Math.ceil(need * POOL_OVERSHOOT);
    const candidates = shuffle(
      inCategory.filter((question) => question.type === type),
      rng,
    );
    for (const question of candidates.slice(0, target)) picked.set(question.id, question);

    // Si la categoría no da de sí, se completa con otras categorías (la selección del
    // motor lo registrará como filtro relajado).
    if (candidates.length < need) {
      const extra = shuffle(
        outOfCategory.filter((question) => question.type === type),
        rng,
      ).slice(0, need - candidates.length + 2);
      for (const question of extra) picked.set(question.id, question);
    }
  }

  for (const question of shuffle(outOfCategory, rng).slice(0, OTHER_CATEGORY_RESERVE)) {
    picked.set(question.id, question);
  }

  return [...picked.values()];
}

export type OpcionesPartida = {
  /** Semilla fija (reto del día o desafío compartido). Si falta, se genera una. */
  seed?: string;
  origin?: GameOrigin;
  seedLabel?: string;
  dailyKey?: string;
};

export async function createSoloGame(
  setup: GameSetup,
  guestPublicId: string,
  opciones: OpcionesPartida = {},
): Promise<CreatedGame> {
  const guestId = await ensureGuestPlayer(guestPublicId, setup.playerName);
  const all = await loadPlayableQuestions();

  const seed = opciones.seed ?? newSeed({ random: () => Math.random(), now: () => Date.now() });
  const config: GameConfig = {
    mode: 'SOLO',
    formatId: setup.formatId,
    difficultyId: setup.difficultyId,
    category: setup.category,
    adaptiveDifficulty: setup.adaptiveDifficulty,
    ...(setup.playerName ? { playerName: setup.playerName } : {}),
    seed,
    origin: opciones.origin ?? 'LIBRE',
    ...(opciones.seedLabel ? { seedLabel: opciones.seedLabel } : {}),
    ...(opciones.dailyKey ? { dailyKey: opciones.dailyKey } : {}),
  };

  const pool = buildGamePool(all, config);

  const game = await prisma.game.create({
    data: {
      guestId,
      mode: 'SOLO',
      status: 'IN_PROGRESS',
      formatId: config.formatId,
      difficultyId: config.difficultyId,
      categoryId: config.category,
      adaptiveDifficulty: config.adaptiveDifficulty,
      seed,
      config: config as unknown as Prisma.InputJsonValue,
      poolIds: pool.map((question) => question.id),
      origin: config.origin ?? 'LIBRE',
      ...(config.seedLabel ? { seedLabel: config.seedLabel } : {}),
      ...(config.dailyKey ? { dailyKey: config.dailyKey } : {}),
    },
    select: { id: true },
  });

  return { gameId: game.id, config, pool };
}

/**
 * Carga una partida para jugarla (o continuarla tras recargar la página).
 * El pool se guardó al crearla, así que la partida es reanudable.
 */
export async function loadGameForPlay(
  gameId: string,
  guestPublicId: string | null,
): Promise<GameForPlay | null> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { guest: { select: { publicId: true } } },
  });
  if (!game) return null;
  if (guestPublicId && game.guest.publicId !== guestPublicId) return null;

  const parsedConfig = gameConfigSchema.safeParse(game.config);
  if (!parsedConfig.success) return null;

  const rows = await prisma.question.findMany({ where: { id: { in: game.poolIds } } });
  const byId = new Map(rows.map((row) => [row.id, toQuestion(row)]));
  const pool = game.poolIds
    .map((id) => byId.get(id))
    .filter((question): question is Question => question !== undefined);

  const ghost = await obtenerFantasma(game.guestId, game.formatId, game.difficultyId);

  return {
    gameId: game.id,
    config: parsedConfig.data,
    pool,
    status: game.status,
    ghost,
  };
}

// ── Registro de respuestas ──────────────────────────────────────────────────────

export async function recordAnswer(
  gameId: string,
  guestPublicId: string,
  request: ReportAnswerRequest,
): Promise<{ ok: true } | { ok: false; reason: 'NOT_FOUND' | 'FINISHED' }> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { id: true, status: true, guest: { select: { publicId: true } } },
  });

  if (!game || game.guest.publicId !== guestPublicId) return { ok: false, reason: 'NOT_FOUND' };
  if (game.status !== 'IN_PROGRESS') return { ok: false, reason: 'FINISHED' };

  const { answer } = request;

  await prisma.$transaction(async (tx) => {
    await tx.gameAnswer.upsert({
      where: { gameId_questionId: { gameId, questionId: answer.questionId } },
      create: {
        gameId,
        questionId: answer.questionId,
        roundId: answer.roundId,
        indexInGame: answer.indexInGame,
        answered: answer.answered,
        correct: answer.correct,
        accuracy: answer.accuracy,
        responseMs: answer.responseMs,
        pointsAwarded: answer.pointsAwarded,
        basePoints: answer.basePoints,
        timeBonus: answer.timeBonus,
        streakBonus: answer.streakBonus,
        multiplier: answer.multiplier,
        streakAfter: answer.streakAfter,
        difficulty: Math.round(answer.difficulty),
        wager: answer.wager,
        maxPoints: answer.maxPoints,
        powerUpsUsed: answer.powerUpsUsed,
        submitted: answer.submitted as unknown as Prisma.InputJsonValue,
      },
      update: {},
    });

    await tx.game.update({
      where: { id: gameId },
      data: { totalScore: request.totalScore },
    });

    const stat = await tx.questionStat.upsert({
      where: { questionId: answer.questionId },
      create: {
        questionId: answer.questionId,
        timesShown: 1,
        timesAnswered: answer.answered ? 1 : 0,
        timesCorrect: answer.correct ? 1 : 0,
        timesAbandoned: answer.answered ? 0 : 1,
        totalResponseMs: answer.answered ? answer.responseMs : 0,
        totalPoints: answer.pointsAwarded,
      },
      update: {
        timesShown: { increment: 1 },
        timesAnswered: { increment: answer.answered ? 1 : 0 },
        timesCorrect: { increment: answer.correct ? 1 : 0 },
        timesAbandoned: { increment: answer.answered ? 0 : 1 },
        totalResponseMs: { increment: answer.answered ? answer.responseMs : 0 },
        totalPoints: { increment: answer.pointsAwarded },
      },
      select: { timesAnswered: true, timesCorrect: true },
    });

    const estimated = estimateDifficulty(stat);
    if (estimated !== null) {
      await tx.questionStat.update({
        where: { questionId: answer.questionId },
        data: { estimatedDifficulty: estimated },
      });
    }

    if (request.events.length > 0) {
      await tx.gameEventLog.createMany({
        data: request.events.map((event) => ({
          gameId,
          seq: event.seq,
          type: event.type,
          payload: event.payload as Prisma.InputJsonValue,
        })),
        skipDuplicates: true,
      });
    }
  });

  return { ok: true };
}

// ── Cierre de partida ───────────────────────────────────────────────────────────

/** Reconstruye el progreso por rondas a partir de las respuestas persistidas. */
export function rebuildRounds(formatId: string, answers: readonly AnsweredQuestion[]): RoundProgress[] {
  const format = getGameFormat(formatId);
  return format.rounds.map((round, index) => {
    const forRound = answers.filter((answer) => answer.roundId === round.id);
    const aciertos = forRound.filter((answer) => answer.correct).length;
    return {
      roundId: round.id,
      roundIndex: index,
      title: round.title,
      questionCount: round.questionCount,
      answered: forRound.length,
      correct: aciertos,
      points: forRound.reduce((sum, answer) => sum + answer.pointsAwarded, 0),
      // Reconstrucción del minijuego del ascensor: plantas = aciertos seguidos al final.
      floor: forRound.reduce((planta, answer) => (answer.correct ? planta + 1 : planta), 0),
      stalled: forRound.length > 0 ? forRound[forRound.length - 1]?.correct !== true : false,
    };
  });
}

export async function finishGame(
  gameId: string,
  guestPublicId: string,
  request: FinishGameRequest,
): Promise<
  | { ok: true; summary: GameSummary; progresion: ResultadoProgresion }
  | { ok: false; reason: 'NOT_FOUND' }
> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      guest: { select: { publicId: true } },
      answers: {
        orderBy: { indexInGame: 'asc' },
        include: { question: { select: { type: true, category: true } } },
      },
    },
  });

  if (!game || game.guest.publicId !== guestPublicId) return { ok: false, reason: 'NOT_FOUND' };

  const answers: AnsweredQuestion[] = game.answers.map((row) => {
    const submitted = answerSubmissionSchema.safeParse(row.submitted);
    return {
      questionId: row.questionId,
      roundId: row.roundId,
      indexInGame: row.indexInGame,
      type: row.question.type,
      difficulty: row.difficulty,
      category: row.question.category,
      answered: row.answered,
      correct: row.correct,
      accuracy: row.accuracy,
      responseMs: row.responseMs,
      pointsAwarded: row.pointsAwarded,
      basePoints: row.basePoints,
      timeBonus: row.timeBonus,
      streakBonus: row.streakBonus,
      multiplier: row.multiplier,
      streakAfter: row.streakAfter,
      wager: row.wager ?? 0,
      powerUpsUsed: row.powerUpsUsed.filter((id): id is PowerUpId =>
        POWER_UP_IDS.includes(id as PowerUpId),
      ),
      submitted: submitted.success ? submitted.data : { kind: 'NONE' },
      maxPoints: row.maxPoints,
    };
  });

  const summary = buildSummary({
    answers,
    rounds: rebuildRounds(game.formatId, answers),
    totalScore: request.totalScore,
    bestStreak: request.bestStreak,
    ...(request.startedAt ? { startedAt: request.startedAt } : {}),
    finishedAt: Date.now(),
    scoreTrail: request.scoreTrail,
    ...(game.origin === 'RETO_DIARIO' ? { esRetoDiario: true } : {}),
  });

  await prisma.game.update({
    where: { id: gameId },
    data: {
      status: 'FINISHED',
      finishedAt: new Date(),
      totalScore: request.totalScore,
      summary: summary as unknown as Prisma.InputJsonValue,
      ghostTrail: request.scoreTrail,
    },
  });

  // Progresión, récord personal y logros: reglas puras del dominio, filas aquí.
  const progresion = await registrarFinDePartida({
    guestId: game.guestId,
    gameId,
    formatId: game.formatId,
    difficultyId: game.difficultyId,
    origin: game.origin,
    dailyKey: game.dailyKey,
    summary,
    answers,
    scoreTrail: request.scoreTrail,
  });

  if (request.events.length > 0) {
    await prisma.gameEventLog.createMany({
      data: request.events.map((event) => ({
        gameId,
        seq: event.seq,
        type: event.type,
        payload: event.payload as Prisma.InputJsonValue,
      })),
      skipDuplicates: true,
    });
  }

  return { ok: true, summary, progresion };
}

export async function getFinishedGame(gameId: string): Promise<{
  id: string;
  status: string;
  formatId: string;
  difficultyId: string;
  categoryId: string;
  adaptiveDifficulty: boolean;
  totalScore: number;
  summary: GameSummary | null;
  createdAt: Date;
  questionsAsked: number;
  origin: string;
  seedLabel: string | null;
  dailyKey: string | null;
  ghostTrail: number[];
  guestId: string;
} | null> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { _count: { select: { answers: true } } },
  });
  if (!game) return null;

  return {
    id: game.id,
    status: game.status,
    formatId: game.formatId,
    difficultyId: game.difficultyId,
    categoryId: game.categoryId,
    adaptiveDifficulty: game.adaptiveDifficulty,
    totalScore: game.totalScore,
    summary: (game.summary as GameSummary | null) ?? null,
    createdAt: game.createdAt,
    questionsAsked: game._count.answers,
    origin: game.origin,
    seedLabel: game.seedLabel,
    dailyKey: game.dailyKey,
    ghostTrail: game.ghostTrail,
    guestId: game.guestId,
  };
}

/** Últimas partidas del invitado, para la portada y los resultados. */
export async function recentGames(guestPublicId: string, limit = 5) {
  return prisma.game.findMany({
    where: { guest: { publicId: guestPublicId }, status: 'FINISHED' },
    orderBy: { finishedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      totalScore: true,
      formatId: true,
      difficultyId: true,
      categoryId: true,
      finishedAt: true,
      summary: true,
    },
  });
}

export function expectedQuestionCount(formatId: string): number {
  return totalQuestions(getGameFormat(formatId));
}
