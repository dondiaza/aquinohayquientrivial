/**
 * RESULTADOS — resumen de la partida a partir de las respuestas registradas.
 *
 * Función pura: entra el estado, sale el resumen. Se guarda tal cual en `Game.summary`
 * y es lo que pinta /resultados/[gameId] sin recalcular nada.
 *
 * Fase 2 añade lo que necesita la ceremonia de resultados (§33): categoría favorita y
 * la más difícil, velocidad, curva de puntuación para el modo fantasma y la experiencia
 * ganada.
 */

import { performanceIndex, rankForIndex } from '../ranks/ranks';
import { POWER_UP_IDS, type PowerUpId } from '../powerups/powerups';
import { QUESTION_TYPES, type QuestionType } from '../questions/types';
import { xpForGame } from '../progression/progression';
import type { AnsweredQuestion, RoundProgress } from '../engine/state';

export type TypeBreakdown = {
  type: QuestionType;
  asked: number;
  correct: number;
  points: number;
};

export type CategoryBreakdown = {
  category: string;
  asked: number;
  correct: number;
  accuracyPercent: number;
};

export type GameSummary = {
  totalScore: number;
  /** Preguntas presentadas (respondidas o no). */
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  /** Presentadas y no respondidas (tiempo agotado). */
  timeouts: number;
  accuracyPercent: number;
  bestStreak: number;
  averageResponseMs: number;
  /** La respuesta correcta más rápida de la partida. */
  fastestCorrectMs: number | null;
  averageDifficulty: number;
  /** Puntos que vinieron de bonus (tiempo + racha), no del acierto base. */
  bonusPoints: number;
  /** Saldo neto de las apuestas. */
  wagerDelta: number;
  powerUpsUsed: Record<PowerUpId, number>;
  totalPowerUpsUsed: number;
  maxPossibleScore: number;
  performanceIndex: number;
  /**
   * Solo el ID del rango: la etiqueta, la frase y el icono son COPY y se resuelven al
   * pintar (domain/ranks). Así se puede reescribir el tono del juego sin migrar las
   * partidas ya guardadas, y no se mete texto decorativo en la base de datos.
   */
  rankId: string;
  rounds: RoundProgress[];
  byType: TypeBreakdown[];
  byCategory: CategoryBreakdown[];
  /** Categoría con mejor y peor acierto (mínimo 2 preguntas para contar). */
  favouriteCategory: string | null;
  hardestCategory: string | null;
  /** Puntuación acumulada tras cada pregunta (modo fantasma y gráficas). */
  scoreTrail: number[];
  /** Familias de prueba distintas jugadas. */
  distinctTypes: number;
  /** Experiencia ganada con esta partida. */
  xpEarned: number;
  durationMs: number;
};

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildSummary(input: {
  answers: readonly AnsweredQuestion[];
  rounds: readonly RoundProgress[];
  totalScore: number;
  bestStreak: number;
  startedAt?: number;
  finishedAt: number;
  scoreTrail?: readonly number[];
  esRetoDiario?: boolean;
}): GameSummary {
  const answers = [...input.answers];
  const answered = answers.filter((answer) => answer.answered);
  const correct = answers.filter((answer) => answer.correct);
  const timeouts = answers.filter((answer) => !answer.answered);

  const powerUpsUsed = {} as Record<PowerUpId, number>;
  for (const id of POWER_UP_IDS) powerUpsUsed[id] = 0;
  for (const answer of answers) {
    for (const id of answer.powerUpsUsed) {
      powerUpsUsed[id] = (powerUpsUsed[id] ?? 0) + 1;
    }
  }

  const byType: TypeBreakdown[] = QUESTION_TYPES.map((type) => {
    const forType = answers.filter((answer) => answer.type === type);
    return {
      type,
      asked: forType.length,
      correct: forType.filter((answer) => answer.correct).length,
      points: forType.reduce((sum, answer) => sum + answer.pointsAwarded, 0),
    };
  }).filter((entry) => entry.asked > 0);

  const categorias = [...new Set(answers.map((answer) => answer.category))];
  const byCategory: CategoryBreakdown[] = categorias
    .map((category) => {
      const forCategory = answers.filter((answer) => answer.category === category);
      const aciertos = forCategory.filter((answer) => answer.correct).length;
      return {
        category,
        asked: forCategory.length,
        correct: aciertos,
        accuracyPercent:
          forCategory.length === 0 ? 0 : Math.round((aciertos / forCategory.length) * 1000) / 10,
      };
    })
    .sort((a, b) => b.accuracyPercent - a.accuracyPercent);

  const conMuestra = byCategory.filter((entry) => entry.asked >= 2);
  const favourite = conMuestra[0]?.accuracyPercent ? (conMuestra[0]?.category ?? null) : null;
  const hardest =
    conMuestra.length > 1 ? (conMuestra[conMuestra.length - 1]?.category ?? null) : null;

  const maxPossibleScore = answers.reduce((sum, answer) => sum + answer.maxPoints, 0);
  const index = performanceIndex({
    correctAnswers: correct.length,
    totalQuestions: answers.length,
    totalScore: input.totalScore,
    maxPossibleScore,
  });
  const rank = rankForIndex(index);

  const tiemposCorrectos = correct.filter((answer) => answer.answered).map((answer) => answer.responseMs);
  const accuracyRatio = answers.length === 0 ? 0 : correct.length / answers.length;
  const averageDifficulty = Math.round(average(answers.map((answer) => answer.difficulty)) * 10) / 10;

  return {
    totalScore: input.totalScore,
    totalQuestions: answers.length,
    answeredQuestions: answered.length,
    correctAnswers: correct.length,
    wrongAnswers: answered.length - correct.length,
    timeouts: timeouts.length,
    accuracyPercent: Math.round(accuracyRatio * 1000) / 10,
    bestStreak: input.bestStreak,
    averageResponseMs: Math.round(average(answered.map((answer) => answer.responseMs))),
    fastestCorrectMs: tiemposCorrectos.length > 0 ? Math.min(...tiemposCorrectos) : null,
    averageDifficulty,
    bonusPoints: answers.reduce((sum, answer) => sum + answer.timeBonus + answer.streakBonus, 0),
    wagerDelta: answers.reduce(
      (sum, answer) => sum + (answer.wager > 0 ? (answer.correct ? answer.wager : -answer.wager) : 0),
      0,
    ),
    powerUpsUsed,
    totalPowerUpsUsed: Object.values(powerUpsUsed).reduce((sum, value) => sum + value, 0),
    maxPossibleScore,
    performanceIndex: index,
    rankId: rank.id,
    rounds: [...input.rounds],
    byType,
    byCategory,
    favouriteCategory: favourite,
    hardestCategory: hardest,
    scoreTrail: [...(input.scoreTrail ?? [])],
    distinctTypes: byType.length,
    xpEarned: xpForGame({
      correctAnswers: correct.length,
      totalQuestions: answers.length,
      accuracyRatio,
      averageDifficulty,
      bestStreak: input.bestStreak,
      distinctTypes: byType.length,
      finished: true,
      ...(input.esRetoDiario ? { esRetoDiario: true } : {}),
    }),
    durationMs: input.startedAt ? Math.max(0, input.finishedAt - input.startedAt) : 0,
  };
}
