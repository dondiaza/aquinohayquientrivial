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

export type GameConfig = {
  mode: GameMode;
  formatId: string;
  difficultyId: string;
  category: CategorySelection;
  adaptiveDifficulty: boolean;
  playerName?: string;
  /** Semilla del RNG. La misma semilla + mismo banco = misma partida. */
  seed: string;
};

/** La pregunta en juego, con todo lo que la partida le ha hecho encima. */
export type ActiveQuestion = {
  question: Question;
  roundId: string;
  indexInGame: number;
  /** Tiempo efectivo tras aplicar nivel, ronda, evento y power-ups. */
  timeLimitSeconds: number;
  /** Orden en el que la UI presenta opciones/pasos (ids). */
  optionOrder: string[];
  /** Multiplicadores activos (ronda + evento). */
  modifiers: ScoreModifier[];
  eliminatedOptionIds: string[];
  cluesRevealed: number;
  powerUpsUsed: PowerUpId[];
  wager: number;
  eventId?: GameEventId;
  /** Epoch ms en que empezó a contar el tiempo. */
  startedAt: number;
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
  /** Penalización del evento (ascensor averiado), en negativo. */
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
};

export type AnsweredQuestion = {
  questionId: string;
  roundId: string;
  indexInGame: number;
  type: QuestionType;
  difficulty: number;
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
  subtitle: string;
  questionCount: number;
  answered: number;
  correct: number;
  points: number;
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
