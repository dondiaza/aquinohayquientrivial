/**
 * CONTRATO DE RED entre el motor (cliente) y el servidor.
 *
 * En Fase 1 el motor corre en el cliente y el servidor REGISTRA lo que ocurre:
 * cada respuesta se persiste con su desglose, y el resumen final se RECALCULA en el
 * servidor a partir de lo persistido (no se confía en un resumen enviado por el cliente).
 *
 * En Fase 3 se invierte: el servidor ejecuta el mismo motor y emite estos mismos
 * eventos por WebSocket. Este fichero no cambia; cambia quién lo produce.
 */

import { z } from 'zod';

import { POWER_UP_IDS } from '../powerups/powerups';
import { QUESTION_TYPES } from '../questions/types';
import { ENGINE_EVENT_TYPES } from './engine-events';
import { gameSetupSchema } from './config';

export const answerSubmissionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('OPTION'), optionId: z.string().min(1).max(40) }),
  z.object({ kind: z.literal('BOOLEAN'), value: z.boolean() }),
  z.object({ kind: z.literal('ITEM'), itemId: z.string().min(1).max(40) }),
  z.object({ kind: z.literal('ORDER'), orderedIds: z.array(z.string().min(1).max(40)).max(10) }),
  z.object({ kind: z.literal('NONE') }),
]);

export const answerReportSchema = z.object({
  questionId: z.string().min(1),
  roundId: z.string().min(1),
  indexInGame: z.number().int().min(0).max(200),
  type: z.enum(QUESTION_TYPES),
  difficulty: z.number().min(1).max(10),
  answered: z.boolean(),
  correct: z.boolean(),
  accuracy: z.number().min(0).max(1),
  responseMs: z.number().int().min(0).max(10 * 60 * 1000),
  pointsAwarded: z.number().int().min(-100000).max(100000),
  basePoints: z.number().int().min(0).max(100000),
  timeBonus: z.number().int().min(0).max(10000),
  streakBonus: z.number().int().min(0).max(10000),
  multiplier: z.number().min(0).max(20),
  streakAfter: z.number().int().min(0).max(500),
  wager: z.number().int().min(0).max(1000000),
  powerUpsUsed: z.array(z.enum(POWER_UP_IDS)).max(10),
  submitted: answerSubmissionSchema,
  maxPoints: z.number().int().min(0).max(1000000),
});

export type AnswerReport = z.infer<typeof answerReportSchema>;

export const engineEventEnvelopeSchema = z.object({
  seq: z.number().int().min(1),
  type: z.enum(ENGINE_EVENT_TYPES),
  at: z.number().int().min(0),
  payload: z.record(z.string(), z.unknown()),
});

export const createGameRequestSchema = gameSetupSchema;

export const reportAnswerRequestSchema = z.object({
  answer: answerReportSchema,
  totalScore: z.number().int().min(0).max(10000000),
  events: z.array(engineEventEnvelopeSchema).max(40).default([]),
});

export type ReportAnswerRequest = z.infer<typeof reportAnswerRequestSchema>;

export const finishGameRequestSchema = z.object({
  totalScore: z.number().int().min(0).max(10000000),
  bestStreak: z.number().int().min(0).max(500),
  startedAt: z.number().int().min(0).optional(),
  /** Puntuación acumulada tras cada pregunta: alimenta el modo fantasma. */
  scoreTrail: z.array(z.number().int().min(0).max(10000000)).max(200).default([]),
  events: z.array(engineEventEnvelopeSchema).max(40).default([]),
});

export type FinishGameRequest = z.infer<typeof finishGameRequestSchema>;
