/**
 * ESTADO DEL MOTOR.
 *
 * Es un objeto plano y SERIALIZABLE (nada de clases, funciones ni fechas): se puede
 * guardar en sessionStorage, mandar por la red o reconstruir en el servidor. El banco
 * de preguntas NO vive aquí (va como dependencia), para que el estado sea pequeño.
 *
 * Las fases HOME / MODE_SELECT / SETUP corresponden a rutas de Next (portada, /jugar,
 * /jugar/solo) y no las gestiona el reducer: el motor arranca en INTRO. Se declaran en
 * `GamePhase` porque son parte del mismo flujo conceptual y Fase 3 las necesitará
 * (sala de espera del host).
 */

import type { AdaptiveState } from '../difficulty/adaptive';
import type { GameEventId, PendingEvent } from '../events/game-events';
import type { PowerUpId, PowerUpInventory } from '../powerups/powerups';
import type { CategorySelection } from '../questions/categories';
import type { AnswerSubmission, Question, QuestionType } from '../questions/types';
import type { ScoreBreakdown, ScoreModifier } from '../scoring/scoring';
import type { StreakState } from '../streaks/streaks';
import type { Grade } from '../questions/grading';
import type { GameSummary } from '../results/summary';

export const GAME_PHASES = [
  'HOME',
  'MODE_SELECT',
  'SETUP',
  'INTRO',
  'ROUND_INTRO',
  'QUESTION',
  'ANSWER_LOCKED',
  'REVEAL',
  'ROUND_RESULTS',
  'EVENT',
  'FINAL_ROUND',
  'GAME_RESULTS',
] as const;

export type GamePhase = (typeof GAME_PHASES)[number];

export type GameMode = 'SOLO' | 'PARTY';

/** De dónde viene la partida: normal, reto del día o desafío con semilla compartida. */
export type GameOrigin = 'LIBRE' | 'RETO_DIARIO' | 'DESAFIO';

export type GameConfig = {
  mode: GameMode;
  formatId: string;
  difficultyId: string;
  category: CategorySelection;
  adaptiveDifficulty: boolean;
  playerName?: string;
  /** Semilla del RNG. La misma semilla + mismo banco = misma partida. */
  seed: string;
  origin?: GameOrigin;
  /** Etiqueta legible del desafío, tipo «#21DESENGAÑO». */
  seedLabel?: string;
  /** Día del reto (YYYY-MM-DD) si es el reto diario. */
  dailyKey?: string;
};

/** Marca de una partida anterior con la que compararse (modo fantasma). */
export type GhostRun = {
  label: string;
  /** Puntuación acumulada tras cada pregunta. */
  trail: number[];
  totalScore: number;
};

/** La pregunta en juego, con todo lo que la partida le ha hecho encima. */
export type ActiveQuestion = {
  question: Question;
  roundId: string;
  indexInGame: number;
  /** Tiempo efectivo tras aplicar nivel, ronda, suceso y power-ups. */
  timeLimitSeconds: number;
  /** Orden en el que la UI presenta opciones/pasos (ids). */
  optionOrder: string[];
  /** Multiplicadores activos (ronda + suceso + comodines). */
  modifiers: ScoreModifier[];
  eliminatedOptionIds: string[];
  cluesRevealed: number;
  powerUpsUsed: PowerUpId[];
  wager: number;
  /** Fracción del apostado protegida por FONDO DE RESERVA. */
  wagerProtection: number;
  /** SE HA IDO LA LUZ: se responde sin ver los textos. */
  riskMode: boolean;
  eventId?: GameEventId;
  /** El suceso activo impide usar comodines. */
  powerUpsBlocked: boolean;
  /** El suceso activo anula el bonus por tiempo. */
  timeBonusDisabled: boolean;
  /** Epoch ms en que empezó a contar el tiempo. */
  startedAt: number;
  /**
   * Epoch ms hasta el que hay fase de estudio (memoria / secuencia). El tiempo de
   * respuesta empieza a contar DESPUÉS.
   */
  studyUntil: number;
};

export type PendingSubmission = {
  submission: AnswerSubmission;
  responseMs: number;
  timedOut: boolean;
};

export type RevealSummary = {
  questionId: string;
  question: Question;
  /** Lo que envió el jugador (la vista lo necesita para marcar su elección). */
  submitted: AnswerSubmission;
  grade: Grade;
  breakdown: ScoreBreakdown;
  /** Penalización del suceso (ascensor averiado), en negativo. */
  eventPenalty: number;
  /** Puntos de celebración por hito de racha. */
  milestoneBonus: number;
  milestoneTitle?: string;
  milestoneLine?: string;
  streakBefore: number;
  streakAfter: number;
  streakBroken: boolean;
  scoreBefore: number;
  scoreAfter: number;
  /** Puntos netos sumados al marcador (puede ser negativo). */
  netPoints: number;
  responseMs: number;
  timedOut: boolean;
  line: string;
  adaptiveDelta: number;
  cluesRevealed: number;
  /** Nivel de combo alcanzado (0-4), para la intensidad de los efectos. */
  comboLevel: number;
};

export type AnsweredQuestion = {
  questionId: string;
  roundId: string;
  indexInGame: number;
  type: QuestionType;
  difficulty: number;
  category: string;
  answered: boolean;
  correct: boolean;
  accuracy: number;
  responseMs: number;
  pointsAwarded: number;
  basePoints: number;
  timeBonus: number;
  streakBonus: number;
  multiplier: number;
  streakAfter: number;
  wager: number;
  powerUpsUsed: PowerUpId[];
  submitted: AnswerSubmission;
  /** Máximo teórico de esta pregunta: sirve para el índice de rendimiento. */
  maxPoints: number;
};

export type RoundProgress = {
  roundId: string;
  roundIndex: number;
  title: string;
  questionCount: number;
  answered: number;
  correct: number;
  points: number;
  /** Plantas subidas en el minijuego del ascensor (aciertos seguidos en la ronda). */
  floor: number;
  /** El ascensor se ha parado por un fallo. */
  stalled: boolean;
};

export type GameState = {
  gameId: string;
  config: GameConfig;
  phase: GamePhase;
  roundIndex: number;
  questionInRound: number;
  questionIndex: number;
  score: number;
  streak: StreakState;
  adaptive: AdaptiveState;
  inventory: PowerUpInventory;
  usedQuestionIds: string[];
  currentQuestion?: ActiveQuestion;
  pendingSubmission?: PendingSubmission;
  pendingEvent?: PendingEvent;
  lastReveal?: RevealSummary;
  rounds: RoundProgress[];
  answers: AnsweredQuestion[];
  summary?: GameSummary;
  /** Puntuación acumulada tras cada pregunta (para el modo fantasma y las gráficas). */
  scoreTrail: number[];
  /** Sucesos ya vistos: el director evita repetirlos. */
  seenEvents: GameEventId[];
  /** Preguntas desde el último suceso (enfriamiento del director). */
  questionsSinceEvent: number;
  /** Cursor del RNG: hace reproducible la partida y serializable el azar. */
  rngCursor: number;
  /** Secuencia del último evento emitido. */
  eventSeq: number;
  startedAt?: number;
  finishedAt?: number;
  /** Avisos no fatales (p. ej. banco de preguntas agotado). */
  notices: string[];
};

export function isPlayablePhase(phase: GamePhase): boolean {
  return phase === 'QUESTION' || phase === 'FINAL_ROUND';
}

export function isTerminalPhase(phase: GamePhase): boolean {
  return phase === 'GAME_RESULTS';
}

/**
 * Nivel de combo (0-4) según la racha. Escala la intensidad de los efectos: 2 racha,
 * 3 destacada, 5 modo caliente, 8 momento extraordinario (§18).
 */
export function comboLevel(streak: number): number {
  if (streak >= 8) return 4;
  if (streak >= 5) return 3;
  if (streak >= 3) return 2;
  if (streak >= 2) return 1;
  return 0;
}

/** Tasa de acierto de las últimas `ventana` respuestas (para el director). */
export function recentAccuracy(answers: readonly AnsweredQuestion[], ventana = 5): number {
  if (answers.length === 0) return 1;
  const ultimas = answers.slice(-ventana);
  const aciertos = ultimas.filter((answer) => answer.correct).length;
  return aciertos / ultimas.length;
}
