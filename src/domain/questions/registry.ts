/**
 * Registro de tipos de prueba — las 10 familias jugables.
 *
 * Un único sitio donde se declara qué es cada tipo: cómo se llama en pantalla, qué
 * instrucción se le da al jugador, cuánto tiempo pide por defecto y qué power-ups
 * admite. La UI y el admin leen de aquí; no hay condicionales repartidos por la app.
 *
 * Añadir un tipo = payload en types.ts + schema en schemas.ts + entrada aquí + vista en
 * components/game/views. Nada más.
 */

import type { QuestionType } from './types';

export type QuestionTypeMeta = {
  type: QuestionType;
  /** Nombre de cara al jugador. */
  label: string;
  /** Nombre corto para chips y tablas del admin. */
  short: string;
  /** Instrucción que se muestra sobre la pregunta. */
  instruction: string;
  /** Segundos por defecto al crear una pregunta de este tipo. */
  defaultTimeLimitSeconds: number;
  /** Puntos base por defecto. */
  defaultBasePoints: number;
  /** ¿Se puede descartar una opción incorrecta (power-up RADIO PATIO)? */
  supportsOptionElimination: boolean;
  /** ¿Admite acierto parcial? */
  supportsPartialCredit: boolean;
  /** ¿Muestra algo antes de poder responder (memoria)? */
  hasStudyPhase: boolean;
  /** Marca de acento en la UI. */
  accent: 'verde' | 'rojo' | 'azul' | 'mostaza' | 'morado' | 'tinta' | 'naranja' | 'granate';
  icon: string;
};

export const QUESTION_TYPE_META: Record<QuestionType, QuestionTypeMeta> = {
  MULTIPLE_CHOICE: {
    type: 'MULTIPLE_CHOICE',
    label: 'Elección múltiple',
    short: 'Múltiple',
    instruction: 'Elige una respuesta',
    defaultTimeLimitSeconds: 20,
    defaultBasePoints: 1000,
    supportsOptionElimination: true,
    supportsPartialCredit: false,
    hasStudyPhase: false,
    accent: 'verde',
    icon: '🔢',
  },
  TRUE_FALSE: {
    type: 'TRUE_FALSE',
    label: 'Verdadero o falso',
    short: 'V/F',
    instruction: '¿Verdadero o falso?',
    defaultTimeLimitSeconds: 12,
    defaultBasePoints: 700,
    supportsOptionElimination: false,
    supportsPartialCredit: false,
    hasStudyPhase: false,
    accent: 'rojo',
    icon: '⚖️',
  },
  WHO_IS_IT: {
    type: 'WHO_IS_IT',
    label: '¿Quién es?',
    short: 'Quién es',
    instruction: 'Responde cuanto antes: cada pista que esperas vale menos puntos',
    defaultTimeLimitSeconds: 25,
    defaultBasePoints: 1000,
    supportsOptionElimination: true,
    supportsPartialCredit: false,
    hasStudyPhase: false,
    accent: 'azul',
    icon: '🕵️',
  },
  IMPOSTOR: {
    type: 'IMPOSTOR',
    label: 'El infiltrado',
    short: 'Infiltrado',
    instruction: 'Tres encajan, uno no. Señala al infiltrado',
    defaultTimeLimitSeconds: 22,
    defaultBasePoints: 1000,
    supportsOptionElimination: false,
    supportsPartialCredit: false,
    hasStudyPhase: false,
    accent: 'mostaza',
    icon: '🚨',
  },
  ORDER_CHAOS: {
    type: 'ORDER_CHAOS',
    label: 'Ordena el desastre',
    short: 'Ordenar',
    instruction: 'Coloca los hechos en orden',
    defaultTimeLimitSeconds: 35,
    defaultBasePoints: 1200,
    supportsOptionElimination: false,
    supportsPartialCredit: true,
    hasStudyPhase: false,
    accent: 'morado',
    icon: '🔀',
  },
  FINAL_BET: {
    type: 'FINAL_BET',
    label: 'La derrama',
    short: 'Apuesta',
    instruction: 'Apuesta parte de tus puntos y juégatela',
    defaultTimeLimitSeconds: 30,
    defaultBasePoints: 1000,
    supportsOptionElimination: true,
    supportsPartialCredit: false,
    hasStudyPhase: false,
    accent: 'tinta',
    icon: '🎲',
  },
  MEMORY_GRID: {
    type: 'MEMORY_GRID',
    label: 'Memoria de vecino',
    short: 'Memoria',
    instruction: 'Mira bien: lo que ves ahora te lo preguntan después',
    defaultTimeLimitSeconds: 18,
    defaultBasePoints: 1100,
    supportsOptionElimination: true,
    supportsPartialCredit: false,
    hasStudyPhase: true,
    accent: 'naranja',
    icon: '🧠',
  },
  MISSING_ITEM: {
    type: 'MISSING_ITEM',
    label: '¿Qué falta aquí?',
    short: 'Qué falta',
    instruction: 'Mira la escena y di qué NO está',
    defaultTimeLimitSeconds: 22,
    defaultBasePoints: 1100,
    supportsOptionElimination: true,
    supportsPartialCredit: false,
    hasStudyPhase: false,
    accent: 'azul',
    icon: '🔍',
  },
  DECISION: {
    type: 'DECISION',
    label: 'La junta',
    short: 'Junta',
    instruction: 'Decide como presidente: hay opciones mejores y peores',
    defaultTimeLimitSeconds: 30,
    defaultBasePoints: 1200,
    supportsOptionElimination: false,
    supportsPartialCredit: true,
    hasStudyPhase: false,
    accent: 'granate',
    icon: '🗳️',
  },
  SEQUENCE: {
    type: 'SEQUENCE',
    label: 'Portero automático',
    short: 'Secuencia',
    instruction: 'Repite la secuencia de timbres',
    defaultTimeLimitSeconds: 20,
    defaultBasePoints: 1100,
    supportsOptionElimination: false,
    supportsPartialCredit: true,
    hasStudyPhase: true,
    accent: 'naranja',
    icon: '🔔',
  },
};

export const QUESTION_TYPE_LIST: QuestionTypeMeta[] = Object.values(QUESTION_TYPE_META);

export function questionTypeMeta(type: QuestionType): QuestionTypeMeta {
  return QUESTION_TYPE_META[type];
}
