/**
 * SUCESOS DE PARTIDA (las cartelas que salen entre preguntas).
 *
 * Ojo con el vocabulario, hay dos cosas distintas y ambas se llamarían "evento":
 *
 *   · `GameEvent`  (este fichero)  = suceso de JUEGO que altera la siguiente pregunta:
 *                                    derrama, junta urgente, ascensor averiado…
 *   · `EngineEvent` (domain/engine/engine-events.ts) = mensaje TIPADO del motor
 *                                    (QUESTION_STARTED, ANSWER_SUBMITTED…) que en
 *                                    Fase 3 viajará por WebSocket.
 *
 * Quién decide cuándo aparece un suceso: el DIRECTOR (domain/events/director.ts), no el
 * azar puro. Aquí solo están las definiciones y sus efectos.
 */

import type { ScoreModifier } from '../scoring/scoring';
import type { PowerUpId, Rareza } from '../powerups/powerups';

export const GAME_EVENT_IDS = [
  'DERRAMA_EXTRAORDINARIA',
  'JUNTA_URGENTE',
  'ASCENSOR_AVERIADO',
  'OBRAS_EN_EL_SEGUNDO',
  'INSPECCION_TECNICA',
  'VECINO_GENEROSO',
  'PORTERO_DE_VACACIONES',
] as const;
export type GameEventId = (typeof GAME_EVENT_IDS)[number];

export type GameEventEffect = {
  /** Multiplicador de puntuación de la siguiente pregunta. */
  scoreMultiplier?: number;
  /** Factor sobre el tiempo de la siguiente pregunta (0.6 = 40 % menos). */
  timeScale?: number;
  /** Hay que acertar la siguiente pregunta o hay penalización. */
  mustPass?: boolean;
  /** Puntos que se pierden si `mustPass` y se falla. */
  failurePenalty?: number;
  /** Desplaza la dificultad objetivo de la siguiente pregunta. */
  difficultyOffset?: number;
  /** La siguiente pregunta no da bonus por tiempo (pero paga más). */
  noTimeBonus?: boolean;
  /** No se pueden usar comodines en la siguiente pregunta. */
  blockPowerUps?: boolean;
  /** Regala una carga de este comodín. */
  grantPowerUp?: PowerUpId;
};

export type GameEventDefinition = {
  id: GameEventId;
  title: string;
  /** Texto de la cartela. */
  line: string;
  /** Qué implica, en una frase corta y clara. */
  consequence: string;
  icon: string;
  accent: 'rojo' | 'mostaza' | 'azul' | 'morado' | 'naranja';
  rareza: Rareza;
  effect: GameEventEffect;
  /** Peso relativo en el sorteo del director. */
  weight: number;
  /**
   * ¿Requiere que el jugador vaya bien? Los sucesos con castigo solo aparecen cuando la
   * partida va cómoda: si alguien está sufriendo, el juego no le pisa la cabeza.
   */
  soloSiVaBien?: boolean;
  /** ¿Aparece cuando el jugador está atascado? (sucesos que ayudan) */
  soloSiVaMal?: boolean;
};

export const GAME_EVENTS: Record<GameEventId, GameEventDefinition> = {
  DERRAMA_EXTRAORDINARIA: {
    id: 'DERRAMA_EXTRAORDINARIA',
    title: 'Derrama extraordinaria',
    line: 'La administradora ha pasado una derrama sin avisar. Si hay que pagar, que al menos rente.',
    consequence: 'La próxima pregunta vale ×1.5',
    icon: '💸',
    accent: 'mostaza',
    rareza: 'comun',
    effect: { scoreMultiplier: 1.5 },
    weight: 3,
  },
  JUNTA_URGENTE: {
    id: 'JUNTA_URGENTE',
    title: 'Junta urgente',
    line: 'Convocada con dos horas de antelación y con el portal entero de pie.',
    consequence: 'Menos tiempo, pero ×1.35 en puntos',
    icon: '⏱️',
    accent: 'azul',
    rareza: 'comun',
    effect: { scoreMultiplier: 1.35, timeScale: 0.6 },
    weight: 3,
  },
  ASCENSOR_AVERIADO: {
    id: 'ASCENSOR_AVERIADO',
    title: 'Ascensor averiado',
    line: 'Otra vez parado entre el segundo y el tercero. Toca resolverlo rápido.',
    consequence: 'Acierta la próxima o pierdes 250 puntos de reparación',
    icon: '🛗',
    accent: 'rojo',
    rareza: 'curioso',
    effect: { scoreMultiplier: 1.25, timeScale: 0.5, mustPass: true, failurePenalty: 250 },
    weight: 2,
    soloSiVaBien: true,
  },
  OBRAS_EN_EL_SEGUNDO: {
    id: 'OBRAS_EN_EL_SEGUNDO',
    title: 'Obras en el segundo',
    line: 'Radial a las ocho de la mañana. Con ese ruido no hay prisa que valga.',
    consequence: 'Sin bonus de tiempo, pero la pregunta vale ×2',
    icon: '🔨',
    accent: 'naranja',
    rareza: 'curioso',
    effect: { scoreMultiplier: 2, noTimeBonus: true },
    weight: 2,
  },
  INSPECCION_TECNICA: {
    id: 'INSPECCION_TECNICA',
    title: 'Inspección técnica',
    line: 'Viene el técnico a mirarlo todo y pregunta cosas raras.',
    consequence: 'Pregunta más difícil, pero ×1.6',
    icon: '📋',
    accent: 'morado',
    rareza: 'raro',
    effect: { scoreMultiplier: 1.6, difficultyOffset: 2 },
    weight: 2,
    soloSiVaBien: true,
  },
  VECINO_GENEROSO: {
    id: 'VECINO_GENEROSO',
    title: 'Vecino generoso',
    line: 'El del 3ºB te ve apurado y te echa un cable sin que se lo pidas.',
    consequence: 'Te regala un «Un poquito de por favor»',
    icon: '🤝',
    accent: 'azul',
    rareza: 'curioso',
    effect: { grantPowerUp: 'UN_POQUITO_DE_POR_FAVOR' },
    weight: 2,
    soloSiVaMal: true,
  },
  PORTERO_DE_VACACIONES: {
    id: 'PORTERO_DE_VACACIONES',
    title: 'El portero está de vacaciones',
    line: 'Sin Amancio no hay favores, ni sopla nadie desde el rellano.',
    consequence: 'Sin comodines en la próxima, pero vale ×1.4',
    icon: '🏖️',
    accent: 'rojo',
    rareza: 'raro',
    effect: { scoreMultiplier: 1.4, blockPowerUps: true },
    weight: 1,
    soloSiVaBien: true,
  },
};

export const GAME_EVENT_LIST: GameEventDefinition[] = Object.values(GAME_EVENTS);

/** Suceso en curso: afecta exactamente a la siguiente pregunta. */
export type PendingEvent = {
  id: GameEventId;
  /** Índice de pregunta (global) al que afecta. */
  appliesToQuestionIndex: number;
};

export function getGameEvent(id: GameEventId): GameEventDefinition {
  return GAME_EVENTS[id];
}

/** Modificadores de puntuación que aporta el suceso activo. */
export function eventModifiers(event: GameEventDefinition | undefined): ScoreModifier[] {
  if (!event?.effect.scoreMultiplier) return [];
  return [{ id: event.id, label: event.title, multiplier: event.effect.scoreMultiplier }];
}

/** Factor de tiempo que aporta el suceso activo. */
export function eventTimeScale(event: GameEventDefinition | undefined): number {
  return event?.effect.timeScale ?? 1;
}
