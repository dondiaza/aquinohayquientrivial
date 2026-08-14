/**
 * Modelo de pregunta.
 *
 * Cada tipo de prueba aporta SOLO los campos que necesita (`payload`), de modo que
 * no hay campos forzados ni opcionales-por-si-acaso. El tipo `Question` es una unión
 * discriminada por `type`: si añades un tipo nuevo, TypeScript te obliga a cubrirlo
 * en la evaluación (grading) y en el registro de vistas de la UI.
 *
 * Fase 2 amplía de 6 a 10 familias jugables sin tocar el motor: los cuatro tipos
 * nuevos se responden con las formas de respuesta que ya existían (OPTION y ORDER).
 */

import type { CategoryId } from './categories';

export const QUESTION_TYPES = [
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'WHO_IS_IT',
  'IMPOSTOR',
  'ORDER_CHAOS',
  'FINAL_BET',
  // Fase 2
  'MEMORY_GRID',
  'MISSING_ITEM',
  'DECISION',
  'SEQUENCE',
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
  /** Icono del portal (src/components/portal/icons.tsx). Opcional y decorativo. */
  icon?: string;
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
  /** Destacada: el admin la marca y el director de partida la prioriza. */
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
};

// ── Payloads por tipo ───────────────────────────────────────────────────────────

/** 1. ELECCIÓN MÚLTIPLE — 4 opciones, una correcta. */
export type MultipleChoicePayload = {
  options: QuestionOption[];
  correctOptionId: string;
};

/** 2. VERDADERO / FALSO — binaria y rápida (base de RADIO PATIO). */
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
  setLabel: string;
  items: QuestionOption[];
  impostorItemId: string;
};

/** 5. ORDENA EL DESASTRE — 3-5 acontecimientos en su orden correcto. */
export type OrderChaosPayload = {
  /** En el ORDEN CORRECTO. La UI los presenta mezclados. */
  steps: QuestionOption[];
  firstLabel: string;
  lastLabel: string;
};

/** 6. APUESTA FINAL / LA DERRAMA — el jugador apuesta puntos antes de responder. */
export type FinalBetPayload = {
  options: QuestionOption[];
  correctOptionId: string;
  /** Fracción máxima del marcador que se puede apostar (0..1). */
  maxWagerRatio: number;
};

/**
 * 7. MEMORIA DE VECINO — se muestran 4-8 objetos unos segundos, desaparecen y luego
 * se pregunta por ellos.
 */
export type MemoryGridPayload = {
  /** Objetos que se exhiben (con icono del portal). */
  items: QuestionOption[];
  /** Segundos de memorización antes de que arranque el tiempo de respuesta. */
  studySeconds: number;
  /** Lo que se pregunta DESPUÉS de que desaparezcan. */
  question: string;
  options: QuestionOption[];
  correctOptionId: string;
};

/**
 * 8. ¿QUÉ FALTA AQUÍ? — composición visual original; el jugador detecta el objeto
 * ausente entre las opciones.
 */
export type MissingItemPayload = {
  /** Qué escena se está mirando. */
  sceneLabel: string;
  /** Objetos presentes en la composición. */
  present: QuestionOption[];
  options: QuestionOption[];
  /** La opción que NO está en la composición. */
  correctOptionId: string;
};

/**
 * 9. LA JUNTA — una situación y varias decisiones posibles. No hay "trampa": cada
 * opción tiene su consecuencia y su peso, así que hay acierto parcial.
 * En Fase 3 esta misma estructura se convierte en votación entre vecinos.
 */
export type DecisionPayload = {
  situation: string;
  options: (QuestionOption & {
    /** 0..1 — cuánto de acertada es la decisión. */
    weight: number;
    /** Qué pasa si se elige. Se muestra en el revelado. */
    outcome: string;
  })[];
  /** La decisión de peso 1. */
  bestOptionId: string;
};

/**
 * 10. PORTERO AUTOMÁTICO — secuencia de timbres que se ilumina y hay que repetir.
 */
export type SequencePayload = {
  /** Botones del panel (4-6). */
  pads: QuestionOption[];
  /** Secuencia correcta, por id de botón (3-6 pasos, puede repetir). */
  sequence: string[];
  /** Milisegundos que se ilumina cada paso al mostrar la secuencia. */
  stepMs: number;
};

export type QuestionPayloadMap = {
  MULTIPLE_CHOICE: MultipleChoicePayload;
  TRUE_FALSE: TrueFalsePayload;
  WHO_IS_IT: WhoIsItPayload;
  IMPOSTOR: ImpostorPayload;
  ORDER_CHAOS: OrderChaosPayload;
  FINAL_BET: FinalBetPayload;
  MEMORY_GRID: MemoryGridPayload;
  MISSING_ITEM: MissingItemPayload;
  DECISION: DecisionPayload;
  SEQUENCE: SequencePayload;
};

export type QuestionPayloadFor<T extends QuestionType> = QuestionPayloadMap[T];

type QuestionOf<T extends QuestionType> = QuestionBase & { type: T } & QuestionPayloadMap[T];

export type MultipleChoiceQuestion = QuestionOf<'MULTIPLE_CHOICE'>;
export type TrueFalseQuestion = QuestionOf<'TRUE_FALSE'>;
export type WhoIsItQuestion = QuestionOf<'WHO_IS_IT'>;
export type ImpostorQuestion = QuestionOf<'IMPOSTOR'>;
export type OrderChaosQuestion = QuestionOf<'ORDER_CHAOS'>;
export type FinalBetQuestion = QuestionOf<'FINAL_BET'>;
export type MemoryGridQuestion = QuestionOf<'MEMORY_GRID'>;
export type MissingItemQuestion = QuestionOf<'MISSING_ITEM'>;
export type DecisionQuestion = QuestionOf<'DECISION'>;
export type SequenceQuestion = QuestionOf<'SEQUENCE'>;

export type Question =
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | WhoIsItQuestion
  | ImpostorQuestion
  | OrderChaosQuestion
  | FinalBetQuestion
  | MemoryGridQuestion
  | MissingItemQuestion
  | DecisionQuestion
  | SequenceQuestion;

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
  MEMORY_GRID: 'OPTION',
  MISSING_ITEM: 'OPTION',
  DECISION: 'OPTION',
  SEQUENCE: 'ORDER',
};

// ── Ayudas de acceso seguro (noUncheckedIndexedAccess) ──────────────────────────

/** Devuelve las opciones seleccionables de la pregunta, si su tipo las tiene. */
export function questionOptions(question: Question): QuestionOption[] | null {
  switch (question.type) {
    case 'MULTIPLE_CHOICE':
    case 'WHO_IS_IT':
    case 'FINAL_BET':
    case 'MEMORY_GRID':
    case 'MISSING_ITEM':
    case 'DECISION':
      return question.options;
    case 'IMPOSTOR':
      return question.items;
    case 'SEQUENCE':
      return question.pads;
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
    case 'MEMORY_GRID':
    case 'MISSING_ITEM':
      return question.options
        .filter((option) => option.id !== question.correctOptionId)
        .map((option) => option.id);
    case 'DECISION':
      // En LA JUNTA no se descarta: todas las decisiones son legítimas.
      return [];
    case 'IMPOSTOR':
    case 'ORDER_CHAOS':
    case 'TRUE_FALSE':
    case 'SEQUENCE':
      return [];
  }
}

/**
 * Milisegundos de "estudio" antes de que empiece a contar el tiempo de respuesta.
 * Los tipos de memoria muestran algo primero; el resto responden desde el segundo cero.
 */
export function studyMsFor(question: Question): number {
  switch (question.type) {
    case 'MEMORY_GRID':
      return Math.max(0, question.studySeconds) * 1000;
    case 'SEQUENCE':
      return question.sequence.length * question.stepMs + 600;
    default:
      return 0;
  }
}
