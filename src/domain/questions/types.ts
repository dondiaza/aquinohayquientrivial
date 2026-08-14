/**
 * Modelo de pregunta.
 *
 * Cada tipo de prueba aporta SOLO los campos que necesita (`payload`), de modo que
 * no hay campos forzados ni opcionales-por-si-acaso. El tipo `Question` es una unión
 * discriminada por `type`: si añades un tipo nuevo, TypeScript te obliga a cubrirlo
 * en la evaluación (grading) y en el registro de vistas de la UI.
 */

import type { CategoryId } from './categories';

export const QUESTION_TYPES = [
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'WHO_IS_IT',
  'IMPOSTOR',
  'ORDER_CHAOS',
  'FINAL_BET',
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

/** Escala interna de dificultad: 1 (muy fácil) … 10 (muy difícil). */
export type DifficultyValue = number;

export type QuestionMedia = {
  kind: 'image' | 'audio' | 'video';
  /** Texto del placeholder mientras no haya un asset propio y con derechos. */
  placeholder: string;
  /** Ruta a un asset ORIGINAL del proyecto. Nunca material protegido de terceros. */
  src?: string;
  alt?: string;
};

export type QuestionOption = {
  id: string;
  text: string;
};

export type QuestionBase = {
  id: string;
  status: QuestionStatus;
  prompt: string;
  explanation?: string;
  difficulty: DifficultyValue;
  category: CategoryId;
  season?: number;
  episode?: number;
  characters: string[];
  tags: string[];
  media?: QuestionMedia;
  basePoints: number;
  timeLimitSeconds: number;
  /** De dónde sale el dato. Obligatorio moralmente en contenido verificado. */
  sourceNote?: string;
  /** false = contenido DEMO o sin verificar. Nunca se presenta como canon. */
  verified: boolean;
  createdAt: string;
  updatedAt: string;
};

// ── Payloads por tipo ───────────────────────────────────────────────────────────

/** 1. ELECCIÓN MÚLTIPLE — 4 opciones, una correcta. */
export type MultipleChoicePayload = {
  options: QuestionOption[];
  correctOptionId: string;
};

/** 2. VERDADERO / FALSO — binaria y rápida. */
export type TrueFalsePayload = {
  correctValue: boolean;
};

/** 3. ¿QUIÉN ES? — pistas progresivas; responder antes vale más. */
export type WhoIsItPayload = {
  /** De más vaga a más evidente. Se revelan de una en una. */
  clues: string[];
  options: QuestionOption[];
  correctOptionId: string;
  /** Segundos entre revelado automático de pistas. */
  clueIntervalSeconds: number;
};

/** 4. EL INFILTRADO — cuatro elementos, uno no pertenece al conjunto. */
export type ImpostorPayload = {
  /** Qué tienen en común los tres correctos ("vecinos del 3º", "excusas de la derrama"…). */
  setLabel: string;
  items: QuestionOption[];
  impostorItemId: string;
};

/** 5. ORDENA EL DESASTRE — 3-5 acontecimientos en su orden correcto. */
export type OrderChaosPayload = {
  /** En el ORDEN CORRECTO. La UI los presenta mezclados. */
  steps: QuestionOption[];
  /** Etiquetas de los extremos de la escala (p. ej. "Primero" / "Último"). */
  firstLabel: string;
  lastLabel: string;
};

/** 6. APUESTA FINAL — el jugador apuesta puntos antes de ver/responder. */
export type FinalBetPayload = {
  options: QuestionOption[];
  correctOptionId: string;
  /** Fracción máxima del marcador que se puede apostar (0..1). */
  maxWagerRatio: number;
};

export type QuestionPayloadMap = {
  MULTIPLE_CHOICE: MultipleChoicePayload;
  TRUE_FALSE: TrueFalsePayload;
  WHO_IS_IT: WhoIsItPayload;
  IMPOSTOR: ImpostorPayload;
  ORDER_CHAOS: OrderChaosPayload;
  FINAL_BET: FinalBetPayload;
};

export type QuestionPayloadFor<T extends QuestionType> = QuestionPayloadMap[T];

type QuestionOf<T extends QuestionType> = QuestionBase & { type: T } & QuestionPayloadMap[T];

export type MultipleChoiceQuestion = QuestionOf<'MULTIPLE_CHOICE'>;
export type TrueFalseQuestion = QuestionOf<'TRUE_FALSE'>;
export type WhoIsItQuestion = QuestionOf<'WHO_IS_IT'>;
export type ImpostorQuestion = QuestionOf<'IMPOSTOR'>;
export type OrderChaosQuestion = QuestionOf<'ORDER_CHAOS'>;
export type FinalBetQuestion = QuestionOf<'FINAL_BET'>;

export type Question =
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | WhoIsItQuestion
  | ImpostorQuestion
  | OrderChaosQuestion
  | FinalBetQuestion;

/** Pregunta sin los campos que asigna la persistencia. */
export type QuestionDraft = Omit<Question, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

// ── Respuestas ──────────────────────────────────────────────────────────────────

export type AnswerSubmission =
  | { kind: 'OPTION'; optionId: string }
  | { kind: 'BOOLEAN'; value: boolean }
  | { kind: 'ITEM'; itemId: string }
  | { kind: 'ORDER'; orderedIds: string[] }
  /** Tiempo agotado o abandono: no hay respuesta. */
  | { kind: 'NONE' };

export type AnswerKind = AnswerSubmission['kind'];

/** Qué forma de respuesta espera cada tipo de prueba. */
export const ANSWER_KIND_BY_TYPE: Record<QuestionType, AnswerKind> = {
  MULTIPLE_CHOICE: 'OPTION',
  TRUE_FALSE: 'BOOLEAN',
  WHO_IS_IT: 'OPTION',
  IMPOSTOR: 'ITEM',
  ORDER_CHAOS: 'ORDER',
  FINAL_BET: 'OPTION',
};

// ── Ayudas de acceso seguro (noUncheckedIndexedAccess) ──────────────────────────

/** Devuelve las opciones seleccionables de la pregunta, si su tipo las tiene. */
export function questionOptions(question: Question): QuestionOption[] | null {
  switch (question.type) {
    case 'MULTIPLE_CHOICE':
    case 'WHO_IS_IT':
    case 'FINAL_BET':
      return question.options;
    case 'IMPOSTOR':
      return question.items;
    case 'ORDER_CHAOS':
    case 'TRUE_FALSE':
      return null;
  }
}

/**
 * Ids de opciones incorrectas: lo que necesita el power-up RADIO PATIO.
 * Devuelve [] cuando el tipo no admite descartar opciones.
 */
export function wrongOptionIds(question: Question): string[] {
  switch (question.type) {
    case 'MULTIPLE_CHOICE':
    case 'WHO_IS_IT':
    case 'FINAL_BET':
      return question.options
        .filter((option) => option.id !== question.correctOptionId)
        .map((option) => option.id);
    case 'IMPOSTOR':
    case 'ORDER_CHAOS':
    case 'TRUE_FALSE':
      return [];
  }
}
