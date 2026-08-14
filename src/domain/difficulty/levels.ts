/**
 * Niveles de dificultad de cara al jugador y su traducción a la escala interna 1-10.
 *
 * `start` es la dificultad objetivo inicial; `min`/`max` acotan hasta dónde puede
 * moverla la dificultad adaptativa. `timeScale` estira o encoge el tiempo de las
 * preguntas (un novato tiene más tiempo, un superfan menos).
 */

export const DIFFICULTY_LEVELS = [
  {
    id: 'novato',
    label: 'Novato',
    tagline: 'Acabas de firmar el contrato de alquiler',
    start: 2,
    min: 1,
    max: 4,
    timeScale: 1.3,
  },
  {
    id: 'vecino',
    label: 'Vecino',
    tagline: 'Ya sabes quién deja la basura en el rellano',
    start: 4,
    min: 2,
    max: 6,
    timeScale: 1.1,
  },
  {
    id: 'presidente',
    label: 'Presidente',
    tagline: 'Convocas juntas y las sufres',
    start: 6,
    min: 4,
    max: 8,
    timeScale: 1,
  },
  {
    id: 'radio-patio',
    label: 'Radio Patio',
    tagline: 'Te enteras antes que el interesado',
    start: 8,
    min: 6,
    max: 10,
    timeScale: 0.9,
  },
  {
    id: 'superfan',
    label: 'Superfan',
    tagline: 'Sabes de qué color era el felpudo',
    start: 9,
    min: 7,
    max: 10,
    timeScale: 0.8,
  },
] as const;

export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];
export type DifficultyLevelId = DifficultyLevel['id'];

export const DIFFICULTY_LEVEL_IDS = DIFFICULTY_LEVELS.map((level) => level.id) as [
  DifficultyLevelId,
  ...DifficultyLevelId[],
];

export const DEFAULT_DIFFICULTY_LEVEL: DifficultyLevelId = 'vecino';

export function getDifficultyLevel(id: string): DifficultyLevel {
  return DIFFICULTY_LEVELS.find((level) => level.id === id) ?? DIFFICULTY_LEVELS[1];
}

/** Etiqueta corta para un valor 1-10 de la escala interna. */
export function difficultyValueLabel(value: number): string {
  if (value <= 2) return 'Muy fácil';
  if (value <= 4) return 'Fácil';
  if (value <= 6) return 'Normal';
  if (value <= 8) return 'Difícil';
  return 'Muy difícil';
}

/** ¿Se considera pregunta difícil (para el multiplicador de dificultad)? */
export const HARD_QUESTION_THRESHOLD = 8;

export function isHardQuestion(difficulty: number): boolean {
  return difficulty >= HARD_QUESTION_THRESHOLD;
}
