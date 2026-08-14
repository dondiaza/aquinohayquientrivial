/**
 * Dificultad adaptativa de la sesión.
 *
 * Reglas (sencillas a propósito, y por tanto testeables):
 *
 *   · Se mantiene un `skillRating` interno en la escala 1-10, que empieza en el
 *     `start` del nivel elegido.
 *   · Tras DOS aciertos consecutivos: sube +0.5 y se reinicia el contador.
 *   · Tras DOS fallos consecutivos: baja -0.7 y se reinicia el contador (baja algo más
 *     rápido de lo que sube: es mejor equivocarse por fácil que por imposible).
 *   · Siempre acotado a [min, max] del nivel: un "Novato" nunca acaba en preguntas
 *     de superfan, y el paso máximo es 0.7 → sin saltos bruscos.
 *   · El rating se redondea a un decimal, así que los pasos caen siempre en la misma
 *     rejilla y no arrastran ruido de coma flotante.
 *   · Si la adaptación está desactivada, el rating no se mueve (los contadores sí,
 *     porque las rachas se siguen usando para puntuar y para estadísticas).
 */

import { getDifficultyLevel, type DifficultyLevel } from './levels';

export const ADAPTIVE_CONFIG = {
  correctsToRaise: 2,
  wrongsToLower: 2,
  raiseStep: 0.5,
  lowerStep: 0.7,
} as const;

export type AdaptiveState = {
  skillRating: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
};

export function createAdaptiveState(levelId: string): AdaptiveState {
  const level = getDifficultyLevel(levelId);
  return {
    skillRating: level.start,
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Redondea a un decimal para que el rating no arrastre ruido de coma flotante. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export type AdaptiveUpdate = {
  state: AdaptiveState;
  /** Cambio aplicado al rating (0 si no ha habido ajuste). */
  delta: number;
};

export function updateAdaptiveState(
  state: AdaptiveState,
  outcome: { correct: boolean },
  options: { level: DifficultyLevel; enabled: boolean },
): AdaptiveUpdate {
  const next: AdaptiveState = {
    skillRating: state.skillRating,
    consecutiveCorrect: outcome.correct ? state.consecutiveCorrect + 1 : 0,
    consecutiveWrong: outcome.correct ? 0 : state.consecutiveWrong + 1,
  };

  if (!options.enabled) {
    return { state: next, delta: 0 };
  }

  const { level } = options;
  let delta = 0;

  if (next.consecutiveCorrect >= ADAPTIVE_CONFIG.correctsToRaise) {
    const target = clamp(next.skillRating + ADAPTIVE_CONFIG.raiseStep, level.min, level.max);
    delta = round1(target - next.skillRating);
    next.skillRating = round1(target);
    next.consecutiveCorrect = 0;
  } else if (next.consecutiveWrong >= ADAPTIVE_CONFIG.wrongsToLower) {
    const target = clamp(next.skillRating - ADAPTIVE_CONFIG.lowerStep, level.min, level.max);
    delta = round1(target - next.skillRating);
    next.skillRating = round1(target);
    next.consecutiveWrong = 0;
  }

  return { state: next, delta };
}

/** Dificultad objetivo para la siguiente pregunta. */
export function targetDifficulty(state: AdaptiveState, level: DifficultyLevel): number {
  return clamp(state.skillRating, level.min, level.max);
}
