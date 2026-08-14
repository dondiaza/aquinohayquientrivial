/**
 * Textos de racha. Centralizados para poder sustituirlos sin tocar el motor ni la UI.
 */

export type StreakMilestoneCopy = {
  /** Racha a partir de la cual aplica. */
  at: number;
  title: string;
  line: string;
  /** Puntos extra de celebración (además del bonus normal de racha). */
  bonus: number;
};

export const STREAK_MILESTONES: StreakMilestoneCopy[] = [
  { at: 2, title: 'Vas calentando', line: 'Dos seguidas. El portal empieza a mirarte.', bonus: 0 },
  { at: 3, title: 'Radio Patio empieza a hablar', line: 'Tres seguidas. Ya se comenta en el rellano.', bonus: 100 },
  { at: 5, title: 'Imparable', line: 'Cinco seguidas. Nadie te tose en la junta.', bonus: 250 },
  { at: 7, title: 'Esto ya es un escándalo', line: 'Siete seguidas. Han convocado junta para hablar de ti.', bonus: 400 },
  { at: 10, title: 'Leyenda del rellano', line: 'Diez seguidas. Te van a poner una placa en el portal.', bonus: 750 },
];

export const STREAK_BROKEN_LINE = 'Se te ha cortado la racha. Como el ascensor.';
export const STREAK_LABEL = 'Racha';
