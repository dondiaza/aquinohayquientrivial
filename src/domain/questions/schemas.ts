/**
 * Validación con Zod de todo lo que entra o sale del banco de preguntas.
 *
 * Hay DOS representaciones de una pregunta y una conversión explícita entre ellas:
 *
 *   · `QuestionRecord`  = campos comunes + `payload` con lo propio del tipo.
 *                         Es la forma que viaja por la API y se guarda en Postgres.
 *   · `Question`        = la misma pregunta APLANADA (question.options, question.clues…).
 *                         Es la forma cómoda para el motor y la UI.
 *
 * `assembleQuestion` / `splitQuestion` convierten en ambos sentidos sin castings.
 */

import { z } from 'zod';

import { CATEGORY_IDS } from './categories';
import {
  QUESTION_STATUSES,
  QUESTION_TYPES,
  type Question,
  type QuestionBase,
  type QuestionPayloadMap,
  type QuestionType,
} from './types';

// ── Piezas comunes ──────────────────────────────────────────────────────────────

export const optionSchema = z.object({
  id: z.string().min(1).max(40),
  text: z.string().min(1, 'El texto no puede estar vacío').max(280),
});

export const mediaSchema = z.object({
  kind: z.enum(['image', 'audio', 'video']),
  placeholder: z.string().min(1).max(160),
  src: z.string().max(500).optional(),
  alt: z.string().max(280).optional(),
});

const isoDate = z.string().min(4);

function uniqueIds(items: { id: string }[]): boolean {
  return new Set(items.map((item) => item.id)).size === items.length;
}

/** Comprueba que el id marcado como correcto existe entre las opciones. */
function refineCorrectId(
  items: { id: string }[],
  correctId: string,
  path: string,
  ctx: z.RefinementCtx,
): void {
  if (!uniqueIds(items)) {
    ctx.addIssue({ code: 'custom', message: 'Hay ids repetidos', path: [path === 'items' ? 'items' : 'options'] });
  }
  if (!items.some((item) => item.id === correctId)) {
    ctx.addIssue({ code: 'custom', message: 'La respuesta correcta no está entre las opciones', path: [path] });
  }
}

// ── Payloads por tipo ───────────────────────────────────────────────────────────

const multipleChoicePayloadSchema = z
  .object({
    options: z.array(optionSchema).length(4, 'Elección múltiple necesita exactamente 4 opciones'),
    correctOptionId: z.string().min(1),
  })
  .superRefine((value, ctx) => refineCorrectId(value.options, value.correctOptionId, 'correctOptionId', ctx));

const trueFalsePayloadSchema = z.object({
  correctValue: z.boolean(),
});

const whoIsItPayloadSchema = z
  .object({
    clues: z
      .array(z.string().min(3).max(240))
      .min(2, 'Hacen falta al menos 2 pistas')
      .max(6, 'Máximo 6 pistas'),
    options: z.array(optionSchema).min(3).max(6),
    correctOptionId: z.string().min(1),
    clueIntervalSeconds: z.number().int().min(3).max(15).default(5),
  })
  .superRefine((value, ctx) => refineCorrectId(value.options, value.correctOptionId, 'correctOptionId', ctx));

const impostorPayloadSchema = z
  .object({
    setLabel: z.string().min(3).max(160),
    items: z.array(optionSchema).length(4, 'El infiltrado necesita exactamente 4 elementos'),
    impostorItemId: z.string().min(1),
  })
  .superRefine((value, ctx) => refineCorrectId(value.items, value.impostorItemId, 'impostorItemId', ctx));

const orderChaosPayloadSchema = z
  .object({
    steps: z
      .array(optionSchema)
      .min(3, 'Hacen falta al menos 3 hechos')
      .max(5, 'Como máximo 5 hechos'),
    firstLabel: z.string().min(1).max(40).default('Primero'),
    lastLabel: z.string().min(1).max(40).default('Último'),
  })
  .superRefine((value, ctx) => {
    if (!uniqueIds(value.steps)) {
      ctx.addIssue({ code: 'custom', message: 'Hay ids repetidos', path: ['steps'] });
    }
  });

const finalBetPayloadSchema = z
  .object({
    options: z.array(optionSchema).length(4, 'La apuesta final necesita exactamente 4 opciones'),
    correctOptionId: z.string().min(1),
    maxWagerRatio: z.number().min(0.1).max(1).default(0.5),
  })
  .superRefine((value, ctx) => refineCorrectId(value.options, value.correctOptionId, 'correctOptionId', ctx));

export const PAYLOAD_SCHEMAS = {
  MULTIPLE_CHOICE: multipleChoicePayloadSchema,
  TRUE_FALSE: trueFalsePayloadSchema,
  WHO_IS_IT: whoIsItPayloadSchema,
  IMPOSTOR: impostorPayloadSchema,
  ORDER_CHAOS: orderChaosPayloadSchema,
  FINAL_BET: finalBetPayloadSchema,
} as const;

// ── Campos comunes ──────────────────────────────────────────────────────────────

const baseInputShape = {
  status: z.enum(QUESTION_STATUSES).default('ACTIVE'),
  prompt: z.string().min(8, 'El enunciado es demasiado corto').max(400),
  explanation: z.string().max(600).optional(),
  difficulty: z.number().int().min(1, 'Mínimo 1').max(10, 'Máximo 10'),
  category: z.enum(CATEGORY_IDS),
  season: z.number().int().min(1).max(20).optional(),
  episode: z.number().int().min(1).max(400).optional(),
  characters: z.array(z.string().min(1).max(80)).max(12).default([]),
  tags: z.array(z.string().min(1).max(40)).max(16).default([]),
  media: mediaSchema.optional(),
  basePoints: z.number().int().min(100).max(5000).default(1000),
  timeLimitSeconds: z.number().int().min(5).max(120),
  sourceNote: z.string().max(300).optional(),
  verified: z.boolean().default(false),
} as const;

const persistedShape = {
  id: z.string().min(1),
  createdAt: isoDate,
  updatedAt: isoDate,
} as const;

/** Una pregunta tal y como se crea o edita desde el admin (sin id ni fechas). */
export const questionInputSchema = z.discriminatedUnion('type', [
  z.object({ ...baseInputShape, type: z.literal('MULTIPLE_CHOICE'), payload: multipleChoicePayloadSchema }),
  z.object({ ...baseInputShape, type: z.literal('TRUE_FALSE'), payload: trueFalsePayloadSchema }),
  z.object({ ...baseInputShape, type: z.literal('WHO_IS_IT'), payload: whoIsItPayloadSchema }),
  z.object({ ...baseInputShape, type: z.literal('IMPOSTOR'), payload: impostorPayloadSchema }),
  z.object({ ...baseInputShape, type: z.literal('ORDER_CHAOS'), payload: orderChaosPayloadSchema }),
  z.object({ ...baseInputShape, type: z.literal('FINAL_BET'), payload: finalBetPayloadSchema }),
]);

export type QuestionInput = z.infer<typeof questionInputSchema>;

/** Una pregunta ya persistida (incluye id y fechas). */
export const questionRecordSchema = z.discriminatedUnion('type', [
  z.object({ ...baseInputShape, ...persistedShape, type: z.literal('MULTIPLE_CHOICE'), payload: multipleChoicePayloadSchema }),
  z.object({ ...baseInputShape, ...persistedShape, type: z.literal('TRUE_FALSE'), payload: trueFalsePayloadSchema }),
  z.object({ ...baseInputShape, ...persistedShape, type: z.literal('WHO_IS_IT'), payload: whoIsItPayloadSchema }),
  z.object({ ...baseInputShape, ...persistedShape, type: z.literal('IMPOSTOR'), payload: impostorPayloadSchema }),
  z.object({ ...baseInputShape, ...persistedShape, type: z.literal('ORDER_CHAOS'), payload: orderChaosPayloadSchema }),
  z.object({ ...baseInputShape, ...persistedShape, type: z.literal('FINAL_BET'), payload: finalBetPayloadSchema }),
]);

export type QuestionRecord = z.infer<typeof questionRecordSchema>;

/** Valida solo el payload contra el tipo indicado (lo que hace falta al leer de Postgres). */
export function parsePayload<T extends QuestionType>(type: T, value: unknown): QuestionPayloadMap[T] {
  return PAYLOAD_SCHEMAS[type].parse(value) as QuestionPayloadMap[T];
}

// ── Conversión Record ⇄ Question ────────────────────────────────────────────────

/** Aplana un registro (base + payload) en la pregunta que consumen motor y UI. */
export function assembleQuestion(record: QuestionRecord): Question {
  const { payload, type, ...base } = record;
  const common: QuestionBase = base;
  switch (type) {
    case 'MULTIPLE_CHOICE':
      return { ...common, type, ...payload };
    case 'TRUE_FALSE':
      return { ...common, type, ...payload };
    case 'WHO_IS_IT':
      return { ...common, type, ...payload };
    case 'IMPOSTOR':
      return { ...common, type, ...payload };
    case 'ORDER_CHAOS':
      return { ...common, type, ...payload };
    case 'FINAL_BET':
      return { ...common, type, ...payload };
  }
}

/** Separa una pregunta en base + payload, para guardarla. */
export function splitQuestion(question: Question): QuestionRecord {
  const common = {
    id: question.id,
    status: question.status,
    prompt: question.prompt,
    explanation: question.explanation,
    difficulty: question.difficulty,
    category: question.category,
    season: question.season,
    episode: question.episode,
    characters: question.characters,
    tags: question.tags,
    media: question.media,
    basePoints: question.basePoints,
    timeLimitSeconds: question.timeLimitSeconds,
    sourceNote: question.sourceNote,
    verified: question.verified,
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
  };
  switch (question.type) {
    case 'MULTIPLE_CHOICE':
      return {
        ...common,
        type: question.type,
        payload: { options: question.options, correctOptionId: question.correctOptionId },
      };
    case 'TRUE_FALSE':
      return { ...common, type: question.type, payload: { correctValue: question.correctValue } };
    case 'WHO_IS_IT':
      return {
        ...common,
        type: question.type,
        payload: {
          clues: question.clues,
          options: question.options,
          correctOptionId: question.correctOptionId,
          clueIntervalSeconds: question.clueIntervalSeconds,
        },
      };
    case 'IMPOSTOR':
      return {
        ...common,
        type: question.type,
        payload: {
          setLabel: question.setLabel,
          items: question.items,
          impostorItemId: question.impostorItemId,
        },
      };
    case 'ORDER_CHAOS':
      return {
        ...common,
        type: question.type,
        payload: {
          steps: question.steps,
          firstLabel: question.firstLabel,
          lastLabel: question.lastLabel,
        },
      };
    case 'FINAL_BET':
      return {
        ...common,
        type: question.type,
        payload: {
          options: question.options,
          correctOptionId: question.correctOptionId,
          maxWagerRatio: question.maxWagerRatio,
        },
      };
  }
}

/** Valida datos crudos (API, seed, formulario) y devuelve la pregunta aplanada. */
export function parseQuestion(value: unknown): Question {
  return assembleQuestion(questionRecordSchema.parse(value));
}

export const QUESTION_TYPE_ENUM = z.enum(QUESTION_TYPES);
export const QUESTION_STATUS_ENUM = z.enum(QUESTION_STATUSES);
