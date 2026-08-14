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
  CONFIDENCE_LEVELS,
  QUESTION_STATUSES,
  QUESTION_TYPES,
  SPOILER_LEVELS,
  type Question,
  type QuestionBase,
  type QuestionPayloadMap,
  type QuestionType,
} from './types';

// ── Piezas comunes ──────────────────────────────────────────────────────────────

export const optionSchema = z.object({
  id: z.string().min(1).max(40),
  text: z.string().min(1, 'El texto no puede estar vacío').max(280),
  icon: z.string().max(40).optional(),
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

const memoryGridPayloadSchema = z
  .object({
    items: z
      .array(optionSchema)
      .min(4, 'Memoria de vecino necesita al menos 4 objetos')
      .max(8, 'Como máximo 8 objetos'),
    studySeconds: z.number().int().min(2).max(15).default(5),
    question: z.string().min(8).max(240),
    options: z.array(optionSchema).length(4, 'Necesita 4 opciones de respuesta'),
    correctOptionId: z.string().min(1),
  })
  .superRefine((value, ctx) => {
    refineCorrectId(value.options, value.correctOptionId, 'correctOptionId', ctx);
    if (!uniqueIds(value.items)) {
      ctx.addIssue({ code: 'custom', message: 'Hay objetos repetidos', path: ['items'] });
    }
  });

const missingItemPayloadSchema = z
  .object({
    sceneLabel: z.string().min(4).max(160),
    present: z
      .array(optionSchema)
      .min(3, 'La composición necesita al menos 3 objetos')
      .max(9, 'Como máximo 9 objetos'),
    options: z.array(optionSchema).length(4, 'Necesita 4 opciones'),
    correctOptionId: z.string().min(1),
  })
  .superRefine((value, ctx) => {
    refineCorrectId(value.options, value.correctOptionId, 'correctOptionId', ctx);
    // La respuesta correcta es el objeto AUSENTE: no puede estar en la composición.
    const correcta = value.options.find((option) => option.id === value.correctOptionId);
    if (correcta && value.present.some((objeto) => objeto.text === correcta.text)) {
      ctx.addIssue({
        code: 'custom',
        message: 'El objeto que falta no puede estar en la composición',
        path: ['present'],
      });
    }
  });

const decisionPayloadSchema = z
  .object({
    situation: z.string().min(10).max(400),
    options: z
      .array(
        optionSchema.extend({
          weight: z.number().min(0).max(1),
          outcome: z.string().min(4).max(280),
        }),
      )
      .min(3, 'La junta necesita al menos 3 decisiones')
      .max(4, 'Como máximo 4 decisiones'),
    bestOptionId: z.string().min(1),
  })
  .superRefine((value, ctx) => {
    refineCorrectId(value.options, value.bestOptionId, 'bestOptionId', ctx);
    const mejor = value.options.find((option) => option.id === value.bestOptionId);
    if (mejor && mejor.weight !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'La mejor decisión debe tener peso 1',
        path: ['bestOptionId'],
      });
    }
  });

const sequencePayloadSchema = z
  .object({
    pads: z
      .array(optionSchema)
      .min(4, 'El portero automático necesita al menos 4 botones')
      .max(6, 'Como máximo 6 botones'),
    sequence: z
      .array(z.string().min(1).max(40))
      .min(3, 'La secuencia necesita al menos 3 pasos')
      .max(6, 'Como máximo 6 pasos'),
    stepMs: z.number().int().min(300).max(1500).default(650),
  })
  .superRefine((value, ctx) => {
    if (!uniqueIds(value.pads)) {
      ctx.addIssue({ code: 'custom', message: 'Hay botones repetidos', path: ['pads'] });
    }
    const idsValidos = new Set(value.pads.map((pad) => pad.id));
    if (value.sequence.some((paso) => !idsValidos.has(paso))) {
      ctx.addIssue({
        code: 'custom',
        message: 'La secuencia usa botones que no existen',
        path: ['sequence'],
      });
    }
  });

const shortAnswerPayloadSchema = z
  .object({
    answer: z.string().min(1).max(120),
    accepted: z.array(z.string().min(1).max(120)).max(12).default([]),
    hint: z.string().max(160).optional(),
  })
  .superRefine((value, ctx) => {
    // Una respuesta escrita tiene que caber en un campo de texto. El importador es aún
    // más estricto (tres palabras) para lo que de verdad sale a jugar; aquí solo se corta
    // el caso absurdo de meter un párrafo.
    if (value.answer.split(/\s+/).length > 12) {
      ctx.addIssue({
        code: 'custom',
        message: 'Una respuesta escrita no puede ser un párrafo',
        path: ['answer'],
      });
    }
  });

export const PAYLOAD_SCHEMAS = {
  MULTIPLE_CHOICE: multipleChoicePayloadSchema,
  TRUE_FALSE: trueFalsePayloadSchema,
  WHO_IS_IT: whoIsItPayloadSchema,
  IMPOSTOR: impostorPayloadSchema,
  ORDER_CHAOS: orderChaosPayloadSchema,
  FINAL_BET: finalBetPayloadSchema,
  MEMORY_GRID: memoryGridPayloadSchema,
  MISSING_ITEM: missingItemPayloadSchema,
  DECISION: decisionPayloadSchema,
  SEQUENCE: sequencePayloadSchema,
  SHORT_ANSWER: shortAnswerPayloadSchema,
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
  featured: z.boolean().default(false),
  spoiler: z.enum(SPOILER_LEVELS).default('none'),
  confidence: z.enum(CONFIDENCE_LEVELS).default('high'),
  variant: z.string().min(2).max(40).optional(),
  factKey: z.string().min(4).max(80).optional(),
  needsReview: z.boolean().default(false),
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
  z.object({ ...baseInputShape, type: z.literal('MEMORY_GRID'), payload: memoryGridPayloadSchema }),
  z.object({ ...baseInputShape, type: z.literal('MISSING_ITEM'), payload: missingItemPayloadSchema }),
  z.object({ ...baseInputShape, type: z.literal('DECISION'), payload: decisionPayloadSchema }),
  z.object({ ...baseInputShape, type: z.literal('SEQUENCE'), payload: sequencePayloadSchema }),
  z.object({ ...baseInputShape, type: z.literal('SHORT_ANSWER'), payload: shortAnswerPayloadSchema }),
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
  z.object({ ...baseInputShape, ...persistedShape, type: z.literal('MEMORY_GRID'), payload: memoryGridPayloadSchema }),
  z.object({ ...baseInputShape, ...persistedShape, type: z.literal('MISSING_ITEM'), payload: missingItemPayloadSchema }),
  z.object({ ...baseInputShape, ...persistedShape, type: z.literal('DECISION'), payload: decisionPayloadSchema }),
  z.object({ ...baseInputShape, ...persistedShape, type: z.literal('SEQUENCE'), payload: sequencePayloadSchema }),
  z.object({ ...baseInputShape, ...persistedShape, type: z.literal('SHORT_ANSWER'), payload: shortAnswerPayloadSchema }),
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
    case 'MEMORY_GRID':
      return { ...common, type, ...payload };
    case 'MISSING_ITEM':
      return { ...common, type, ...payload };
    case 'DECISION':
      return { ...common, type, ...payload };
    case 'SEQUENCE':
      return { ...common, type, ...payload };
    case 'SHORT_ANSWER':
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
    featured: question.featured ?? false,
    spoiler: question.spoiler,
    confidence: question.confidence,
    variant: question.variant,
    factKey: question.factKey,
    needsReview: question.needsReview ?? false,
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
    case 'MEMORY_GRID':
      return {
        ...common,
        type: question.type,
        payload: {
          items: question.items,
          studySeconds: question.studySeconds,
          question: question.question,
          options: question.options,
          correctOptionId: question.correctOptionId,
        },
      };
    case 'MISSING_ITEM':
      return {
        ...common,
        type: question.type,
        payload: {
          sceneLabel: question.sceneLabel,
          present: question.present,
          options: question.options,
          correctOptionId: question.correctOptionId,
        },
      };
    case 'DECISION':
      return {
        ...common,
        type: question.type,
        payload: {
          situation: question.situation,
          options: question.options,
          bestOptionId: question.bestOptionId,
        },
      };
    case 'SEQUENCE':
      return {
        ...common,
        type: question.type,
        payload: {
          pads: question.pads,
          sequence: question.sequence,
          stepMs: question.stepMs,
        },
      };
    case 'SHORT_ANSWER':
      return {
        ...common,
        type: question.type,
        payload: {
          answer: question.answer,
          accepted: question.accepted,
          hint: question.hint,
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
