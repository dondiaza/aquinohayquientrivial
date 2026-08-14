/**
 * FORMATOS DE PARTIDA — la estructura del juego es DATOS, no código de UI.
 *
 * Una partida es una lista de rondas; cada ronda declara cuántas preguntas pide, qué
 * tipos de prueba admite, qué modificadores aplica y con qué probabilidad dispara un
 * evento entre preguntas. Cambiar el ritmo de una partida (o añadir un formato nuevo)
 * es editar este fichero; la UI no cambia.
 *
 * Estimación de duración: ~25 s por pregunta de media (enunciado + respuesta +
 * revelado + transiciones). Es la cifra con la que están calculados los tres formatos.
 */

import type { ScoreModifier } from '../scoring/scoring';
import type { QuestionType } from '../questions/types';

export const SECONDS_PER_QUESTION_ESTIMATE = 25;

export type RoundDefinition = {
  id: string;
  title: string;
  subtitle: string;
  /** Frase de la cartela de inicio de ronda. */
  line: string;
  questionCount: number;
  /** Tipos admitidos, en orden de preferencia. Vacío = cualquiera. */
  allowedTypes: readonly QuestionType[];
  /** Desplaza la dificultad objetivo de la ronda (±). */
  difficultyOffset?: number;
  /** Estira/encoge el tiempo de las preguntas de la ronda. */
  timeScale?: number;
  /** Modificadores fijos de puntuación de la ronda. */
  modifiers?: readonly ScoreModifier[];
  /** Probabilidad (0..1) de disparar un evento entre dos preguntas de la ronda. */
  eventChance: number;
  /** Ronda final con apuesta. */
  isFinal?: boolean;
};

export type GameFormat = {
  id: string;
  label: string;
  tagline: string;
  /** Duración aproximada mostrada al jugador. */
  estimatedMinutes: string;
  rounds: readonly RoundDefinition[];
};

const ROUND_WARMUP = {
  id: 'calentando-la-junta',
  title: 'Calentando la junta',
  subtitle: 'Preguntas rápidas para romper el hielo',
  line: 'Todo el mundo ha llegado tarde menos tú. Empezamos suave.',
  allowedTypes: ['MULTIPLE_CHOICE', 'TRUE_FALSE'] as const,
  difficultyOffset: -0.5,
  eventChance: 0,
} satisfies Omit<RoundDefinition, 'questionCount'>;

const ROUND_RADIO_PATIO = {
  id: 'radio-patio',
  title: 'Radio Patio',
  subtitle: 'Rumores, verdades a medias e infiltrados',
  line: 'Lo que se dice en el rellano no siempre es verdad. Distingue.',
  allowedTypes: ['TRUE_FALSE', 'IMPOSTOR'] as const,
  eventChance: 0.25,
} satisfies Omit<RoundDefinition, 'questionCount'>;

const ROUND_WHO_LIVES_HERE = {
  id: 'quien-vive-aqui',
  title: '¿Quién vive aquí?',
  subtitle: 'Pistas progresivas: cuanto antes respondas, más vale',
  line: 'Alguien ha dejado una nota sin firmar. Adivina de quién es.',
  allowedTypes: ['WHO_IS_IT', 'MULTIPLE_CHOICE'] as const,
  eventChance: 0.2,
} satisfies Omit<RoundDefinition, 'questionCount'>;

const ROUND_CHAOS = {
  id: 'caos-en-el-portal',
  title: 'Caos en el portal',
  subtitle: 'Con modificadores: más riesgo, más puntos',
  line: 'Se ha juntado la obra del 3º con la mudanza del 1º. Suerte.',
  allowedTypes: ['ORDER_CHAOS', 'MULTIPLE_CHOICE', 'IMPOSTOR'] as const,
  difficultyOffset: 0.5,
  modifiers: [{ id: 'ronda-caos', label: 'Ronda de caos', multiplier: 1.25 }] as const,
  eventChance: 0.4,
} satisfies Omit<RoundDefinition, 'questionCount'>;

const ROUND_ACTA = {
  id: 'lectura-del-acta',
  title: 'Lectura del acta',
  subtitle: 'Lo que quedó por escrito',
  line: 'El secretario leyó el acta de la última junta. ¿Te acuerdas?',
  allowedTypes: ['MULTIPLE_CHOICE', 'ORDER_CHAOS', 'TRUE_FALSE'] as const,
  difficultyOffset: 0.5,
  eventChance: 0.3,
} satisfies Omit<RoundDefinition, 'questionCount'>;

const ROUND_LIGHTNING = {
  id: 'apagon-relampago',
  title: 'Apagón relámpago',
  subtitle: 'Menos tiempo, más puntos',
  line: 'Ha saltado el diferencial. Responde antes de que vuelva la luz.',
  allowedTypes: ['TRUE_FALSE', 'MULTIPLE_CHOICE'] as const,
  timeScale: 0.7,
  modifiers: [{ id: 'ronda-relampago', label: 'Relámpago', multiplier: 1.4 }] as const,
  eventChance: 0.15,
} satisfies Omit<RoundDefinition, 'questionCount'>;

const ROUND_FINAL = {
  id: 'erase-una-vez-una-apuesta',
  title: 'Érase una vez una apuesta',
  subtitle: 'Apuesta parte de tus puntos y juégatela',
  line: 'Última junta del día. Aquí se decide quién manda en el portal.',
  allowedTypes: ['FINAL_BET'] as const,
  difficultyOffset: 1,
  eventChance: 0,
  isFinal: true,
} satisfies Omit<RoundDefinition, 'questionCount'>;

export const GAME_FORMATS = [
  {
    id: 'express',
    label: 'Express',
    tagline: 'Una junta que por una vez es corta',
    estimatedMinutes: '~5 min',
    rounds: [
      { ...ROUND_WARMUP, questionCount: 4 },
      { ...ROUND_RADIO_PATIO, questionCount: 4 },
      { ...ROUND_WHO_LIVES_HERE, questionCount: 3 },
      { ...ROUND_FINAL, questionCount: 1 },
    ],
  },
  {
    id: 'normal',
    label: 'Normal',
    tagline: 'La junta de siempre, con sus cinco rondas',
    estimatedMinutes: '~12-15 min',
    rounds: [
      { ...ROUND_WARMUP, questionCount: 7 },
      { ...ROUND_RADIO_PATIO, questionCount: 7 },
      { ...ROUND_WHO_LIVES_HERE, questionCount: 6 },
      { ...ROUND_CHAOS, questionCount: 7 },
      { ...ROUND_FINAL, questionCount: 1 },
    ],
  },
  {
    id: 'maraton',
    label: 'Maratón',
    tagline: 'Junta extraordinaria: aquí no sale nadie',
    estimatedMinutes: '~20-25 min',
    rounds: [
      { ...ROUND_WARMUP, questionCount: 8 },
      { ...ROUND_RADIO_PATIO, questionCount: 8 },
      { ...ROUND_WHO_LIVES_HERE, questionCount: 7 },
      { ...ROUND_CHAOS, questionCount: 8 },
      { ...ROUND_ACTA, questionCount: 7 },
      { ...ROUND_LIGHTNING, questionCount: 6 },
      { ...ROUND_FINAL, questionCount: 1 },
    ],
  },
] as const satisfies readonly GameFormat[];

export type GameFormatId = (typeof GAME_FORMATS)[number]['id'];

export const GAME_FORMAT_IDS = GAME_FORMATS.map((format) => format.id) as [
  GameFormatId,
  ...GameFormatId[],
];

export const DEFAULT_FORMAT: GameFormatId = 'normal';

export function getGameFormat(id: string): GameFormat {
  return GAME_FORMATS.find((format) => format.id === id) ?? GAME_FORMATS[1];
}

export function totalQuestions(format: GameFormat): number {
  return format.rounds.reduce((sum, round) => sum + round.questionCount, 0);
}

export function estimatedSeconds(format: GameFormat): number {
  return totalQuestions(format) * SECONDS_PER_QUESTION_ESTIMATE;
}
