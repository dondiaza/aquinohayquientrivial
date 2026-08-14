/**
 * Analítica del banco de preguntas: convertir uso real en dificultad estimada.
 *
 * Objetivo: poder recalibrar más adelante. Si una pregunta marcada como dificultad 3
 * la falla el 80 % de la gente, la etiqueta está mal y esto lo delata.
 */

export const MIN_SAMPLES_FOR_ESTIMATE = 5;

export type QuestionUsage = {
  timesShown: number;
  timesAnswered: number;
  timesCorrect: number;
  timesAbandoned: number;
  totalResponseMs: number;
};

/**
 * Dificultad estimada (1-10) a partir de la tasa de acierto:
 * 100 % de acierto → 1, 0 % → 10. `null` si aún no hay muestras suficientes.
 */
export function estimateDifficulty(usage: Pick<QuestionUsage, 'timesAnswered' | 'timesCorrect'>): number | null {
  if (usage.timesAnswered < MIN_SAMPLES_FOR_ESTIMATE) return null;
  const successRate = usage.timesCorrect / usage.timesAnswered;
  return Math.round((1 + (1 - successRate) * 9) * 10) / 10;
}

export function successRate(usage: Pick<QuestionUsage, 'timesAnswered' | 'timesCorrect'>): number | null {
  if (usage.timesAnswered === 0) return null;
  return Math.round((usage.timesCorrect / usage.timesAnswered) * 1000) / 10;
}

export function abandonRate(usage: Pick<QuestionUsage, 'timesShown' | 'timesAbandoned'>): number | null {
  if (usage.timesShown === 0) return null;
  return Math.round((usage.timesAbandoned / usage.timesShown) * 1000) / 10;
}

export function averageResponseMs(usage: Pick<QuestionUsage, 'timesAnswered' | 'totalResponseMs'>): number | null {
  if (usage.timesAnswered === 0) return null;
  return Math.round(usage.totalResponseMs / usage.timesAnswered);
}

/** Diferencia entre la dificultad declarada y la real. Positivo = más difícil de lo etiquetado. */
export function calibrationDrift(declared: number, estimated: number | null): number | null {
  if (estimated === null) return null;
  return Math.round((estimated - declared) * 10) / 10;
}
