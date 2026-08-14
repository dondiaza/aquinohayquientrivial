/**
 * PUNTUACIÓN — función pura, documentada y cubierta con tests.
 *
 * Fórmula:
 *
 *   puntosPregunta = redondear(
 *       (base · precisión  +  bonusTiempo  +  bonusRacha)
 *       ·  multiplicadorDificultad
 *       ·  multiplicadorPistas          (solo ¿QUIÉN ES?)
 *       ·  ∏ multiplicadoresDeEvento    (derrama, junta urgente, ronda…)
 *   )
 *
 *   total = puntosPregunta ± apuesta   (solo en APUESTA FINAL)
 *
 * Criterios de diseño:
 *
 * · LA PRECISIÓN MANDA. El acierto vale 1000 y el tiempo como mucho 300: responder
 *   rápido nunca compensa fallar.
 * · EL TIEMPO SE MIDE POR TRAMOS, no al milisegundo. Hay 6 tramos de 50 puntos, así
 *   que responder 200 ms antes casi nunca cambia el resultado; lo que cambia es
 *   responder "pronto" frente a "en el último segundo". Esto quita presión de reflejos
 *   y evita que gane quien tenga mejor conexión (importante para Fase 3).
 * · La racha premia la constancia con techo: máximo 5 × 100 = 500 puntos.
 * · Fallar da 0 (y, en la apuesta final, pierdes lo apostado).
 * · ORDENA EL DESASTRE admite acierto parcial: `accuracy` multiplica solo la base.
 */

export const SCORING = {
  /** Puntos base por defecto si la pregunta no define otros. */
  defaultBasePoints: 1000,
  /** Bonus máximo por tiempo. */
  timeBonusMax: 300,
  /** Tramos en los que se reparte el bonus de tiempo. */
  timeBonusBands: 6,
  /** Puntos por cada acierto consecutivo previo. */
  streakBonusPerStep: 100,
  /** Tope de pasos de racha que puntúan. */
  streakBonusCap: 5,
  /** Pendiente del multiplicador de dificultad por punto de la escala 1-10. */
  difficultySlope: 0.06,
  /** Límites del multiplicador de dificultad. */
  difficultyMultiplierMin: 0.7,
  difficultyMultiplierMax: 1.35,
  /** Bonus por cada pista NO consumida en ¿QUIÉN ES? */
  cluePremiumPerUnusedClue: 0.1,
} as const;

export type ScoreModifier = {
  id: string;
  label: string;
  multiplier: number;
};

export type ScoreInput = {
  basePoints: number;
  /** 0..1 (1 = acierto pleno). */
  accuracy: number;
  isCorrect: boolean;
  /** Escala interna 1-10. */
  difficulty: number;
  timeLimitSeconds: number;
  /** Tiempo empleado en responder, en ms. */
  responseMs: number;
  /** Racha ANTES de esta respuesta. */
  streakBefore: number;
  /** Multiplicadores activos (eventos, ronda, riesgo…). */
  modifiers?: ScoreModifier[];
  /** ¿QUIÉN ES?: pistas reveladas y totales. */
  cluesRevealed?: number;
  totalClues?: number;
  /** APUESTA FINAL: puntos apostados. */
  wager?: number;
  /**
   * Fracción del apostado que la comunidad cubre si se falla (power-up FONDO DE RESERVA).
   * 0 = sin protección, 0.5 = te devuelven la mitad.
   */
  wagerProtection?: number;
  /**
   * Anula el bonus por tiempo (suceso OBRAS EN EL SEGUNDO: con ese ruido no hay prisa,
   * pero la pregunta paga el doble).
   */
  disableTimeBonus?: boolean;
};

export type ScorePart = {
  label: string;
  /** Valor en puntos, si es un sumando. */
  points?: number;
  /** Valor como multiplicador, si es un factor. */
  multiplier?: number;
};

export type ScoreBreakdown = {
  base: number;
  timeBonus: number;
  streakBonus: number;
  difficultyMultiplier: number;
  clueMultiplier: number;
  modifierMultiplier: number;
  /** Puntos de la pregunta, ya redondeados (sin la apuesta). */
  questionPoints: number;
  /** ± lo apostado en la apuesta final. */
  wagerDelta: number;
  /** questionPoints + wagerDelta. */
  total: number;
  /** Desglose legible para el revelado. */
  parts: ScorePart[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Bonus por tiempo, por tramos.
 * Tramo 6/6 (respuesta inmediata) = 300; tramo 0 (agotado) = 0.
 */
export function timeBonus(responseMs: number, timeLimitSeconds: number): number {
  if (timeLimitSeconds <= 0) return 0;
  const limitMs = timeLimitSeconds * 1000;
  const remaining = clamp(1 - responseMs / limitMs, 0, 1);
  const band = Math.ceil(remaining * SCORING.timeBonusBands);
  return Math.round((band / SCORING.timeBonusBands) * SCORING.timeBonusMax);
}

export function streakBonus(streakBefore: number): number {
  const steps = clamp(streakBefore, 0, SCORING.streakBonusCap);
  return steps * SCORING.streakBonusPerStep;
}

export function difficultyMultiplier(difficulty: number): number {
  const raw = 1 + (clamp(difficulty, 1, 10) - 5) * SCORING.difficultySlope;
  return (
    Math.round(
      clamp(raw, SCORING.difficultyMultiplierMin, SCORING.difficultyMultiplierMax) * 100,
    ) / 100
  );
}

/** Cuantas menos pistas gastes, más vale el acierto. */
export function clueMultiplier(cluesRevealed?: number, totalClues?: number): number {
  if (!totalClues || cluesRevealed === undefined) return 1;
  const unused = clamp(totalClues - cluesRevealed, 0, totalClues);
  return Math.round((1 + unused * SCORING.cluePremiumPerUnusedClue) * 100) / 100;
}

export function combineModifiers(modifiers: ScoreModifier[] | undefined): number {
  if (!modifiers || modifiers.length === 0) return 1;
  return (
    Math.round(modifiers.reduce((product, modifier) => product * modifier.multiplier, 1) * 100) / 100
  );
}

export function scoreAnswer(input: ScoreInput): ScoreBreakdown {
  const accuracy = clamp(input.accuracy, 0, 1);
  const wager = Math.max(0, Math.round(input.wager ?? 0));

  const scored = accuracy > 0;
  const base = scored ? Math.round(input.basePoints * accuracy) : 0;
  const time =
    scored && !input.disableTimeBonus ? timeBonus(input.responseMs, input.timeLimitSeconds) : 0;
  const streak = scored ? streakBonus(input.streakBefore) : 0;

  const difficultyFactor = difficultyMultiplier(input.difficulty);
  const clueFactor = clueMultiplier(input.cluesRevealed, input.totalClues);
  const modifierFactor = combineModifiers(input.modifiers);

  const questionPoints = scored
    ? Math.round((base + time + streak) * difficultyFactor * clueFactor * modifierFactor)
    : 0;

  const proteccion = Math.max(0, Math.min(1, input.wagerProtection ?? 0));
  const wagerDelta =
    wager === 0 ? 0 : input.isCorrect ? wager : -Math.round(wager * (1 - proteccion));

  const parts: ScorePart[] = [];
  if (base > 0) parts.push({ label: accuracy < 1 ? 'Acierto parcial' : 'Acierto', points: base });
  if (time > 0) parts.push({ label: 'Bonus de tiempo', points: time });
  if (streak > 0) parts.push({ label: 'Bonus de racha', points: streak });
  if (difficultyFactor !== 1) parts.push({ label: 'Dificultad', multiplier: difficultyFactor });
  if (clueFactor !== 1) parts.push({ label: 'Pistas sin usar', multiplier: clueFactor });
  for (const modifier of input.modifiers ?? []) {
    if (modifier.multiplier !== 1) parts.push({ label: modifier.label, multiplier: modifier.multiplier });
  }
  if (wagerDelta !== 0) {
    parts.push({ label: wagerDelta > 0 ? 'Apuesta ganada' : 'Apuesta perdida', points: wagerDelta });
  }

  return {
    base,
    timeBonus: time,
    streakBonus: streak,
    difficultyMultiplier: difficultyFactor,
    clueMultiplier: clueFactor,
    modifierMultiplier: modifierFactor,
    questionPoints,
    wagerDelta,
    total: questionPoints + wagerDelta,
    parts,
  };
}

/**
 * Máximo teórico de una pregunta (acierto pleno, respuesta inmediata, racha al tope).
 * Se usa para calcular el rendimiento en los resultados, no para puntuar.
 */
export function maxPointsFor(input: {
  basePoints: number;
  difficulty: number;
  modifiers?: ScoreModifier[];
}): number {
  return Math.round(
    (input.basePoints + SCORING.timeBonusMax + SCORING.streakBonusPerStep * SCORING.streakBonusCap) *
      difficultyMultiplier(input.difficulty) *
      combineModifiers(input.modifiers),
  );
}

/** Apuesta máxima permitida: fracción del marcador, redondeada a decenas. */
export function maxWager(currentScore: number, maxWagerRatio: number): number {
  const cap = Math.max(0, Math.floor((currentScore * clamp(maxWagerRatio, 0, 1)) / 10) * 10);
  return cap;
}

/** Normaliza una apuesta a un valor permitido. */
export function clampWager(wager: number, currentScore: number, maxWagerRatio: number): number {
  const cap = maxWager(currentScore, maxWagerRatio);
  if (!Number.isFinite(wager) || wager <= 0) return 0;
  return Math.min(cap, Math.max(0, Math.round(wager)));
}
