/**
 * Rachas. El estado es mínimo (actual + mejor) y las funciones son puras.
 * Los textos viven en domain/copy/streaks.ts.
 */

import { STREAK_MILESTONES, type StreakMilestoneCopy } from '../copy/streaks';

export type StreakState = {
  current: number;
  best: number;
};

export function createStreakState(): StreakState {
  return { current: 0, best: 0 };
}

export type StreakUpdate = {
  state: StreakState;
  /** Hito alcanzado exactamente con esta respuesta, si lo hay. */
  milestone?: StreakMilestoneCopy;
  /** true si se acaba de romper una racha de 2 o más. */
  broken: boolean;
  /** Puntos extra de celebración del hito (0 si no hay hito). */
  bonusPoints: number;
};

export function applyStreak(state: StreakState, extended: boolean): StreakUpdate {
  if (!extended) {
    return {
      state: { current: 0, best: state.best },
      broken: state.current >= 2,
      bonusPoints: 0,
    };
  }

  const current = state.current + 1;
  const next: StreakState = { current, best: Math.max(current, state.best) };
  const milestone = STREAK_MILESTONES.find((candidate) => candidate.at === current);

  return {
    state: next,
    ...(milestone ? { milestone } : {}),
    broken: false,
    bonusPoints: milestone?.bonus ?? 0,
  };
}

/** Hito activo para una racha dada (el más alto alcanzado). */
export function currentMilestone(streak: number): StreakMilestoneCopy | undefined {
  let found: StreakMilestoneCopy | undefined;
  for (const milestone of STREAK_MILESTONES) {
    if (streak >= milestone.at) found = milestone;
  }
  return found;
}
