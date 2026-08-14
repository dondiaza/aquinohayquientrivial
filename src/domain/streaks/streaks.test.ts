import { describe, expect, it } from 'vitest';

import { STREAK_MILESTONES } from '../copy/streaks';
import { applyStreak, createStreakState, currentMilestone } from './streaks';

describe('rachas', () => {
  it('empieza a cero', () => {
    expect(createStreakState()).toEqual({ current: 0, best: 0 });
  });

  it('crece con cada acierto y guarda la mejor', () => {
    let state = createStreakState();
    for (let index = 0; index < 4; index += 1) {
      state = applyStreak(state, true).state;
    }
    expect(state).toEqual({ current: 4, best: 4 });

    state = applyStreak(state, false).state;
    expect(state).toEqual({ current: 0, best: 4 });
  });

  it('avisa del hito exactamente cuando se alcanza', () => {
    let state = createStreakState();
    const primero = applyStreak(state, true);
    expect(primero.milestone).toBeUndefined();
    state = primero.state;

    const segundo = applyStreak(state, true);
    expect(segundo.milestone?.at).toBe(2);
    state = segundo.state;

    const tercero = applyStreak(state, true);
    expect(tercero.milestone?.at).toBe(3);
    expect(tercero.bonusPoints).toBe(
      STREAK_MILESTONES.find((milestone) => milestone.at === 3)?.bonus,
    );
  });

  it('marca la racha como rota solo si había racha de dos o más', () => {
    const sinRacha = applyStreak({ current: 1, best: 3 }, false);
    expect(sinRacha.broken).toBe(false);

    const conRacha = applyStreak({ current: 2, best: 3 }, false);
    expect(conRacha.broken).toBe(true);
  });

  it('el hito vigente es el más alto alcanzado', () => {
    expect(currentMilestone(0)).toBeUndefined();
    expect(currentMilestone(1)).toBeUndefined();
    expect(currentMilestone(4)?.at).toBe(3);
    expect(currentMilestone(6)?.at).toBe(5);
    // El último hito es el más alto del catálogo, sea cual sea.
    const ultimo = STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
    expect(currentMilestone(100)?.at).toBe(ultimo?.at);
  });

  it('un acierto parcial no alarga la racha (lo decide quien llama)', () => {
    const state = applyStreak({ current: 3, best: 3 }, false);
    expect(state.state.current).toBe(0);
  });
});
