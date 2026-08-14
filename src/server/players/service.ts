/**
 * PERFIL, PROGRESIÓN Y LOGROS.
 *
 * Todo vive en la base de datos atado a la cookie anónima del invitado: no hace falta
 * cuenta, sobrevive a limpiar la caché del navegador y en Fase 3 alimenta directamente
 * las clasificaciones de las salas.
 *
 * Las reglas (cuánta experiencia, qué logro se desbloquea) son funciones PURAS del
 * dominio; aquí solo se leen y escriben filas.
 */

import { prisma } from '../db';
import { evaluarLogros, type ContextoLogros } from '@/domain/achievements/achievements';
import { nivelParaXp, rangoParaXp } from '@/domain/progression/progression';
import {
  ARQUETIPO_IDS,
  COLOR_AVATAR_IDS,
  MARCO_IDS,
  getMarco,
  type ArquetipoId,
  type ColorAvatarId,
  type MarcoId,
} from '@/domain/players/avatar';
import type { AnsweredQuestion, GhostRun } from '@/domain/engine/state';
import type { GameSummary } from '@/domain/results/summary';

export type PerfilJugador = {
  guestId: string;
  displayName: string | null;
  arquetipo: ArquetipoId;
  colorAvatar: ColorAvatarId;
  marco: MarcoId;
  xp: number;
  nivel: number;
  rangoId: string;
  gamesFinished: number;
  bestScore: number;
  bestStreak: number;
  totalCorrect: number;
  totalAnswers: number;
  logros: { achievementId: string; unlockedAt: Date }[];
};

function normalizarArquetipo(valor: string): ArquetipoId {
  return (ARQUETIPO_IDS as readonly string[]).includes(valor)
    ? (valor as ArquetipoId)
    : ARQUETIPO_IDS[0];
}

function normalizarColor(valor: string): ColorAvatarId {
  return (COLOR_AVATAR_IDS as readonly string[]).includes(valor)
    ? (valor as ColorAvatarId)
    : COLOR_AVATAR_IDS[0];
}

function normalizarMarco(valor: string): MarcoId {
  return (MARCO_IDS as readonly string[]).includes(valor) ? (valor as MarcoId) : MARCO_IDS[0];
}

/** Perfil del invitado, creándolo si es su primera vez. */
export async function obtenerPerfil(guestId: string): Promise<PerfilJugador> {
  const fila = await prisma.playerProfile.upsert({
    where: { guestId },
    create: { guestId },
    update: {},
    include: { achievements: { orderBy: { unlockedAt: 'desc' } } },
  });

  return {
    guestId,
    displayName: fila.displayName,
    arquetipo: normalizarArquetipo(fila.arquetipo),
    colorAvatar: normalizarColor(fila.colorAvatar),
    marco: normalizarMarco(fila.marco),
    xp: fila.xp,
    nivel: nivelParaXp(fila.xp),
    rangoId: rangoParaXp(fila.xp).id,
    gamesFinished: fila.gamesFinished,
    bestScore: fila.bestScore,
    bestStreak: fila.bestStreak,
    totalCorrect: fila.totalCorrect,
    totalAnswers: fila.totalAnswers,
    logros: fila.achievements.map((logro) => ({
      achievementId: logro.achievementId,
      unlockedAt: logro.unlockedAt,
    })),
  };
}

export type CambiosPerfil = {
  displayName?: string | null;
  arquetipo?: string;
  colorAvatar?: string;
  marco?: string;
};

/** Guarda la personalización. Los marcos se validan contra el nivel alcanzado. */
export async function actualizarPerfil(guestId: string, cambios: CambiosPerfil): Promise<PerfilJugador> {
  const actual = await obtenerPerfil(guestId);
  const marcoPedido = cambios.marco ? normalizarMarco(cambios.marco) : actual.marco;
  const marcoPermitido =
    getMarco(marcoPedido).nivelMinimo <= actual.nivel ? marcoPedido : actual.marco;

  await prisma.playerProfile.update({
    where: { guestId },
    data: {
      ...(cambios.displayName !== undefined
        ? { displayName: cambios.displayName?.slice(0, 24) ?? null }
        : {}),
      ...(cambios.arquetipo ? { arquetipo: normalizarArquetipo(cambios.arquetipo) } : {}),
      ...(cambios.colorAvatar ? { colorAvatar: normalizarColor(cambios.colorAvatar) } : {}),
      marco: marcoPermitido,
    },
  });

  return obtenerPerfil(guestId);
}

// ── Cierre de partida: progresión, récords y logros ─────────────────────────────

export type ResultadoProgresion = {
  xpGanada: number;
  xpTotal: number;
  nivelAntes: number;
  nivelDespues: number;
  rangoAntes: string;
  rangoDespues: string;
  esRecord: boolean;
  recordAnterior: number | null;
  logrosNuevos: { id: string; label: string; icon: string; rareza: string }[];
};

/** Fantasma con el que competir: la mejor partida previa en ese formato y dificultad. */
export async function obtenerFantasma(
  guestId: string,
  formatId: string,
  difficultyId: string,
): Promise<GhostRun | null> {
  const mejor = await prisma.personalBest.findUnique({
    where: { guestId_formatId_difficultyId: { guestId, formatId, difficultyId } },
  });
  if (!mejor || mejor.trail.length === 0) return null;
  return { label: 'Tu récord', trail: mejor.trail, totalScore: mejor.score };
}

/**
 * Aplica todo lo que pasa al terminar una partida: experiencia, contadores, récord
 * personal, logros y (si es el reto del día) su resultado.
 */
export async function registrarFinDePartida(input: {
  guestId: string;
  gameId: string;
  formatId: string;
  difficultyId: string;
  origin: string;
  dailyKey?: string | null;
  summary: GameSummary;
  answers: readonly AnsweredQuestion[];
  scoreTrail: number[];
}): Promise<ResultadoProgresion> {
  const perfilAntes = await obtenerPerfil(input.guestId);
  const recordPrevio = await prisma.personalBest.findUnique({
    where: {
      guestId_formatId_difficultyId: {
        guestId: input.guestId,
        formatId: input.formatId,
        difficultyId: input.difficultyId,
      },
    },
  });

  const contexto: ContextoLogros = {
    summary: input.summary,
    answers: input.answers,
    config: {
      formatId: input.formatId,
      difficultyId: input.difficultyId,
      origin: input.origin,
    },
    perfil: {
      partidasTerminadas: perfilAntes.gamesFinished,
      mejorPuntuacion: perfilAntes.bestScore,
      mejorRacha: perfilAntes.bestStreak,
    },
    recordAnterior: recordPrevio?.score,
    ghostTrail: recordPrevio?.trail,
  };

  const logrosNuevos = evaluarLogros(
    contexto,
    perfilAntes.logros.map((logro) => logro.achievementId),
  );

  const xpTotal = perfilAntes.xp + input.summary.xpEarned;
  const esRecord = input.summary.totalScore > (recordPrevio?.score ?? -1);

  await prisma.$transaction(async (tx) => {
    const perfil = await tx.playerProfile.update({
      where: { guestId: input.guestId },
      data: {
        xp: xpTotal,
        gamesFinished: { increment: 1 },
        bestScore: Math.max(perfilAntes.bestScore, input.summary.totalScore),
        bestStreak: Math.max(perfilAntes.bestStreak, input.summary.bestStreak),
        totalCorrect: { increment: input.summary.correctAnswers },
        totalAnswers: { increment: input.summary.totalQuestions },
      },
      select: { id: true },
    });

    if (logrosNuevos.length > 0) {
      await tx.playerAchievement.createMany({
        data: logrosNuevos.map((logro) => ({
          profileId: perfil.id,
          achievementId: logro.id,
          gameId: input.gameId,
        })),
        skipDuplicates: true,
      });
    }

    if (esRecord) {
      await tx.personalBest.upsert({
        where: {
          guestId_formatId_difficultyId: {
            guestId: input.guestId,
            formatId: input.formatId,
            difficultyId: input.difficultyId,
          },
        },
        create: {
          guestId: input.guestId,
          formatId: input.formatId,
          difficultyId: input.difficultyId,
          score: input.summary.totalScore,
          accuracy: input.summary.accuracyPercent,
          bestStreak: input.summary.bestStreak,
          gameId: input.gameId,
          trail: input.scoreTrail,
        },
        update: {
          score: input.summary.totalScore,
          accuracy: input.summary.accuracyPercent,
          bestStreak: input.summary.bestStreak,
          gameId: input.gameId,
          trail: input.scoreTrail,
        },
      });
    }

    if (input.dailyKey) {
      await tx.dailyResult.upsert({
        where: { guestId_dailyKey: { guestId: input.guestId, dailyKey: input.dailyKey } },
        create: {
          guestId: input.guestId,
          dailyKey: input.dailyKey,
          gameId: input.gameId,
          score: input.summary.totalScore,
          accuracy: input.summary.accuracyPercent,
          durationMs: input.summary.durationMs,
        },
        update: {},
      });
    }
  });

  return {
    xpGanada: input.summary.xpEarned,
    xpTotal,
    nivelAntes: perfilAntes.nivel,
    nivelDespues: nivelParaXp(xpTotal),
    rangoAntes: perfilAntes.rangoId,
    rangoDespues: rangoParaXp(xpTotal).id,
    esRecord,
    recordAnterior: recordPrevio?.score ?? null,
    logrosNuevos: logrosNuevos.map((logro) => ({
      id: logro.id,
      label: logro.label,
      icon: logro.icon,
      rareza: logro.rareza,
    })),
  };
}

/** ¿Ya se ha jugado el reto de hoy? */
export async function resultadoDelDia(guestId: string, dailyKey: string) {
  return prisma.dailyResult.findUnique({
    where: { guestId_dailyKey: { guestId, dailyKey } },
  });
}

/** Clasificación del reto del día (base de la de Fase 3). */
export async function clasificacionDelDia(dailyKey: string, limite = 10) {
  return prisma.dailyResult.findMany({
    where: { dailyKey },
    orderBy: [{ score: 'desc' }, { durationMs: 'asc' }],
    take: limite,
    include: { guest: { select: { displayName: true, profile: { select: { displayName: true, arquetipo: true, colorAvatar: true } } } } },
  });
}

/**
 * Lo que hay que contar en la ceremonia de resultados de UNA partida concreta:
 * logros desbloqueados en ella y si supone récord del formato.
 */
export async function progresionDeLaPartida(
  gameId: string,
  guestId: string,
  formatId: string,
  difficultyId: string,
  totalScore: number,
): Promise<{
  logros: string[];
  esRecord: boolean;
  recordActual: number | null;
  perfil: PerfilJugador;
}> {
  const [logros, mejor, perfil] = await Promise.all([
    prisma.playerAchievement.findMany({ where: { gameId }, select: { achievementId: true } }),
    prisma.personalBest.findUnique({
      where: { guestId_formatId_difficultyId: { guestId, formatId, difficultyId } },
    }),
    obtenerPerfil(guestId),
  ]);

  return {
    logros: logros.map((logro) => logro.achievementId),
    esRecord: !!mejor && mejor.gameId === gameId && mejor.score === totalScore,
    recordActual: mejor?.score ?? null,
    perfil,
  };
}
