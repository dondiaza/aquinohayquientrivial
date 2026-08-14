/**
 * EVENTOS DE PARTIDA (las "cartelas" que salen entre preguntas).
 *
 * Ojo con el vocabulario, hay dos cosas distintas y ambas se llamarían "evento":
 *
 *   · `GameEvent`  (este fichero)  = suceso de JUEGO que altera la siguiente pregunta:
 *                                    derrama, junta urgente, ascensor averiado…
 *   · `EngineEvent` (domain/engine/engine-events.ts) = mensaje TIPADO del motor
 *                                    (QUESTION_STARTED, ANSWER_SUBMITTED…) que en
 *                                    Fase 3 viajará por WebSocket.
 *
 * Un evento se resuelve en un `PendingEvent` que vive hasta que se responde la
 * siguiente pregunta. Añadir eventos nuevos = añadir una entrada aquí.
 */

import { pickWeighted, type Rng } from '../rng';
import type { ScoreModifier } from '../scoring/scoring';

export const GAME_EVENT_IDS = ['DERRAMA_EXTRAORDINARIA', 'JUNTA_URGENTE', 'ASCENSOR_AVERIADO'] as const;
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
};

export type GameEventDefinition = {
  id: GameEventId;
  title: string;
  /** Texto de la cartela. */
  line: string;
  /** Qué implica, en una frase corta y clara. */
  consequence: string;
  icon: string;
  accent: 'rojo' | 'mostaza' | 'azul';
  effect: GameEventEffect;
  /** Peso relativo en el sorteo. */
  weight: number;
};

export const GAME_EVENTS: Record<GameEventId, GameEventDefinition> = {
  DERRAMA_EXTRAORDINARIA: {
    id: 'DERRAMA_EXTRAORDINARIA',
    title: 'Derrama extraordinaria',
    line: 'La administradora ha pasado una derrama sin avisar. Si hay que pagar, que al menos rente.',
    consequence: 'La próxima pregunta vale x1.5',
    icon: '💸',
    accent: 'mostaza',
    effect: { scoreMultiplier: 1.5 },
    weight: 3,
  },
  JUNTA_URGENTE: {
    id: 'JUNTA_URGENTE',
    title: 'Junta urgente',
    line: 'Convocada con dos horas de antelación y con el portal entero de pie.',
    consequence: 'Menos tiempo, pero x1.35 en puntos',
    icon: '⏱️',
    accent: 'azul',
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
    effect: { scoreMultiplier: 1.25, timeScale: 0.5, mustPass: true, failurePenalty: 250 },
    weight: 2,
  },
};

export const GAME_EVENT_LIST: GameEventDefinition[] = Object.values(GAME_EVENTS);

/** Evento en curso: afecta exactamente a la siguiente pregunta. */
export type PendingEvent = {
  id: GameEventId;
  /** Índice de pregunta (global) al que afecta. */
  appliesToQuestionIndex: number;
};

export function getGameEvent(id: GameEventId): GameEventDefinition {
  return GAME_EVENTS[id];
}

/** Sorteo ponderado de un evento. Determinista con el RNG de la partida. */
export function rollGameEvent(rng: Rng, exclude: GameEventId[] = []): GameEventDefinition | undefined {
  const candidates = GAME_EVENT_LIST.filter((event) => !exclude.includes(event.id));
  if (candidates.length === 0) return undefined;
  return pickWeighted(candidates, (event) => event.weight, rng);
}

/** Modificadores de puntuación que aporta el evento activo. */
export function eventModifiers(event: GameEventDefinition | undefined): ScoreModifier[] {
  if (!event?.effect.scoreMultiplier) return [];
  return [{ id: event.id, label: event.title, multiplier: event.effect.scoreMultiplier }];
}

/** Factor de tiempo que aporta el evento activo. */
export function eventTimeScale(event: GameEventDefinition | undefined): number {
  return event?.effect.timeScale ?? 1;
}
