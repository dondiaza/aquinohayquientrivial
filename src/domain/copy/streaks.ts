/**
 * Textos de racha y combo. Centralizados para poder sustituirlos sin tocar el motor ni
 * la UI. Los hitos coinciden a propósito con los niveles de combo (2/3/5/8) para que el
 * texto, el sonido y el efecto visual escalen juntos.
 */

export type StreakMilestoneCopy = {
  /** Racha a partir de la cual aplica. */
  at: number;
  title: string;
  line: string;
  /** Puntos extra de celebración (además del bonus normal de racha). */
  bonus: number;
  /** Intensidad de los efectos: 1 discreto … 4 momento extraordinario. */
  intensidad: number;
};

export const STREAK_MILESTONES: StreakMilestoneCopy[] = [
  {
    at: 2,
    title: 'Vas calentando',
    line: 'Dos seguidas. El portal empieza a mirarte.',
    bonus: 0,
    intensidad: 1,
  },
  {
    at: 3,
    title: 'Radio Patio empieza a hablar',
    line: 'Tres seguidas. Ya se comenta en el rellano.',
    bonus: 100,
    intensidad: 2,
  },
  {
    at: 5,
    title: 'Modo caliente',
    line: 'Cinco seguidas. Nadie te tose en la junta.',
    bonus: 250,
    intensidad: 3,
  },
  {
    at: 8,
    title: 'Esto ya es un escándalo',
    line: 'Ocho seguidas. Han convocado junta para hablar de ti.',
    bonus: 500,
    intensidad: 4,
  },
  {
    at: 12,
    title: 'Leyenda del rellano',
    line: 'Doce seguidas. Te van a poner una placa en el portal.',
    bonus: 900,
    intensidad: 4,
  },
];

export const STREAK_BROKEN_LINE = 'Se te ha cortado la racha. Como el ascensor.';
export const STREAK_LABEL = 'Racha';

/** Etiqueta corta del combo, para el HUD. */
export const COMBO_LABELS: Record<number, string> = {
  1: 'Racha',
  2: 'En racha',
  3: 'Caliente',
  4: 'Escándalo',
};
