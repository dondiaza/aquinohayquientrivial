/**
 * EVENTOS DEL MOTOR — el contrato que en Fase 3 viajará por WebSocket.
 *
 * Toda acción del juego produce uno o más eventos tipados con número de secuencia.
 * Hoy se guardan en `GameEventLog` (trazabilidad + analítica) y alimentan la UI; en
 * Fase 3 el servidor autoritativo emitirá EXACTAMENTE estos mismos eventos a los
 * clientes conectados sin cambiar el motor.
 *
 * Regla: los eventos describen HECHOS ya ocurridos, en pasado. Las intenciones del
 * jugador son `GameAction` (domain/engine/actions.ts).
 */

import type { AnswerSubmission, QuestionType } from '../questions/types';
import type { GameEventId } from '../events/game-events';
import type { PowerUpId } from '../powerups/powerups';

export type EngineEventBase = {
  /** Monotónico dentro de la partida, empieza en 1. */
  seq: number;
  gameId: string;
  /** Milisegundos epoch. Lo aporta quien despacha la acción; el motor no lee el reloj. */
  at: number;
};

export type EngineEvent = EngineEventBase &
  (
    | { type: 'PLAYER_JOINED'; playerId: string; displayName: string | null }
    | { type: 'GAME_STARTED'; formatId: string; difficultyId: string; totalQuestions: number }
    | { type: 'ROUND_STARTED'; roundId: string; roundIndex: number; questionCount: number }
    | {
        type: 'QUESTION_STARTED';
        questionId: string;
        questionType: QuestionType;
        roundId: string;
        indexInGame: number;
        difficulty: number;
        timeLimitSeconds: number;
      }
    | { type: 'CLUE_REVEALED'; questionId: string; clueIndex: number }
    | { type: 'BET_PLACED'; questionId: string; wager: number }
    | { type: 'POWERUP_USED'; questionId: string; powerUpId: PowerUpId; detail: string }
    | {
        type: 'ANSWER_SUBMITTED';
        questionId: string;
        submission: AnswerSubmission;
        responseMs: number;
        timedOut: boolean;
      }
    | {
        type: 'ANSWER_REVEALED';
        questionId: string;
        correct: boolean;
        accuracy: number;
        pointsAwarded: number;
        scoreAfter: number;
        streakAfter: number;
      }
    | { type: 'EVENT_TRIGGERED'; eventId: GameEventId; appliesToQuestionIndex: number }
    | { type: 'ROUND_FINISHED'; roundId: string; roundIndex: number; points: number; correct: number }
    | { type: 'GAME_FINISHED'; totalScore: number; correctAnswers: number; rankId: string }
  );

export type EngineEventType = EngineEvent['type'];

/** Todos los tipos de evento, útil para validaciones y para el log. */
export const ENGINE_EVENT_TYPES = [
  'PLAYER_JOINED',
  'GAME_STARTED',
  'ROUND_STARTED',
  'QUESTION_STARTED',
  'CLUE_REVEALED',
  'BET_PLACED',
  'POWERUP_USED',
  'ANSWER_SUBMITTED',
  'ANSWER_REVEALED',
  'EVENT_TRIGGERED',
  'ROUND_FINISHED',
  'GAME_FINISHED',
] as const satisfies readonly EngineEventType[];

/** Forma serializada para persistir o enviar por el cable. */
export type EngineEventEnvelope = {
  seq: number;
  gameId: string;
  type: EngineEventType;
  at: number;
  payload: Record<string, unknown>;
};

export function toEnvelope(event: EngineEvent): EngineEventEnvelope {
  const { seq, gameId, at, type, ...payload } = event;
  return { seq, gameId, at, type, payload: payload as Record<string, unknown> };
}
