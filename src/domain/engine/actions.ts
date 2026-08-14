/**
 * ACCIONES — las INTENCIONES del jugador (o del temporizador).
 *
 * Toda acción trae `at` (epoch ms): el reducer nunca lee el reloj, así que es puro y
 * testeable, y en Fase 3 el servidor puede validar los tiempos que llegan del cliente.
 */

import type { PowerUpId } from '../powerups/powerups';
import type { AnswerSubmission } from '../questions/types';
import type { DistributiveOmit } from '../types';

export type GameAction =
  /** Cierra la cartela de bienvenida y arranca la primera ronda. */
  | { type: 'START_GAME'; at: number }
  /** Avanza desde ROUND_INTRO, EVENT, REVEAL o ROUND_RESULTS. */
  | { type: 'NEXT'; at: number }
  /** Revela la siguiente pista de ¿QUIÉN ES? */
  | { type: 'REVEAL_CLUE'; at: number }
  /** Coloca la apuesta de la ronda final y arranca la pregunta. */
  | { type: 'PLACE_BET'; wager: number; at: number }
  | { type: 'USE_POWER_UP'; powerUpId: PowerUpId; at: number }
  | { type: 'SUBMIT_ANSWER'; submission: AnswerSubmission; at: number }
  /** Se agotó el tiempo sin respuesta. */
  | { type: 'TIME_UP'; at: number }
  /** Pasa de ANSWER_LOCKED a REVEAL (la UI la despacha tras el "recibido"). */
  | { type: 'REVEAL'; at: number }
  /** Termina la partida ya (abandono voluntario o última ronda). */
  | { type: 'FINISH_GAME'; at: number };

export type GameActionType = GameAction['type'];

/** Acción sin la marca de tiempo: la pone quien despacha (la UI). */
export type GameActionInput = DistributiveOmit<GameAction, 'at'>;
