/**
 * Registro de tipos de prueba.
 *
 * Un único sitio donde se declara qué es cada tipo: cómo se llama en pantalla, qué
 * instrucción se le da al jugador, cuánto tiempo pide por defecto y qué power-ups
 * admite. La UI y el admin leen de aquí; no hay condicionales repartidos por la app.
 *
 * Añadir un tipo en Fase 2 = añadir su payload en types.ts, su schema en schemas.ts,
 * su entrada aquí y su vista en components/game/questions.
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
  /** Marca de acento en la UI. */
  accent: 'verde' | 'rojo' | 'azul' | 'mostaza' | 'morado' | 'tinta';
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
    accent: 'morado',
    icon: '🔀',
  },
  FINAL_BET: {
    type: 'FINAL_BET',
    label: 'Apuesta final',
    short: 'Apuesta',
    instruction: 'Apuesta parte de tus puntos y juégatela',
    defaultTimeLimitSeconds: 30,
    defaultBasePoints: 1000,
    supportsOptionElimination: true,
    supportsPartialCredit: false,
    accent: 'tinta',
    icon: '🎲',
  },
};

export const QUESTION_TYPE_LIST: QuestionTypeMeta[] = Object.values(QUESTION_TYPE_META);

export function questionTypeMeta(type: QuestionType): QuestionTypeMeta {
  return QUESTION_TYPE_META[type];
}
