import { describe, expect, it } from 'vitest';

import { ADAPTIVE_CONFIG, createAdaptiveState, targetDifficulty, updateAdaptiveState } from './adaptive';
import { getDifficultyLevel } from './levels';

const level = getDifficultyLevel('presidente'); // start 6, min 4, max 8

function play(outcomes: boolean[], enabled = true) {
  let state = createAdaptiveState(level.id);
  const deltas: number[] = [];
  for (const correct of outcomes) {
    const update = updateAdaptiveState(state, { correct }, { level, enabled });
    state = update.state;
    deltas.push(update.delta);
  }
  return { state, deltas };
}

describe('dificultad adaptativa', () => {
  it('empieza en el punto de partida del nivel', () => {
    expect(createAdaptiveState('presidente').skillRating).toBe(6);
    expect(createAdaptiveState('novato').skillRating).toBe(2);
  });

  it('no se mueve con un solo acierto', () => {
    const { state } = play([true]);
    expect(state.skillRating).toBe(6);
    expect(state.consecutiveCorrect).toBe(1);
  });

  it('sube tras dos aciertos consecutivos y reinicia el contador', () => {
    const { state, deltas } = play([true, true]);
    expect(state.skillRating).toBe(6.5);
    expect(state.consecutiveCorrect).toBe(0);
    expect(deltas.at(-1)).toBe(ADAPTIVE_CONFIG.raiseStep);
  });

  it('baja tras dos fallos consecutivos', () => {
    const { state } = play([false, false]);
    expect(state.skillRating).toBe(6 - ADAPTIVE_CONFIG.lowerStep);
  });

  it('alternar acierto y fallo no mueve la dificultad', () => {
    const { state } = play([true, false, true, false, true, false]);
    expect(state.skillRating).toBe(6);
  });

  it('nunca sale de los límites del nivel', () => {
    const { state: arriba } = play(Array.from({ length: 40 }, () => true));
    expect(arriba.skillRating).toBe(level.max);

    const { state: abajo } = play(Array.from({ length: 40 }, () => false));
    expect(abajo.skillRating).toBe(level.min);
  });

  it('no da saltos bruscos', () => {
    const { deltas } = play([true, true, true, true, false, false, false, false]);
    for (const delta of deltas) {
      expect(Math.abs(delta)).toBeLessThanOrEqual(ADAPTIVE_CONFIG.lowerStep);
    }
  });

  it('se puede desactivar sin perder los contadores', () => {
    const { state } = play([true, true, true, true], false);
    expect(state.skillRating).toBe(6);
    expect(state.consecutiveCorrect).toBe(4);
  });

  it('la dificultad objetivo respeta los límites del nivel', () => {
    expect(targetDifficulty({ skillRating: 99, consecutiveCorrect: 0, consecutiveWrong: 0 }, level)).toBe(
      level.max,
    );
    expect(targetDifficulty({ skillRating: -5, consecutiveCorrect: 0, consecutiveWrong: 0 }, level)).toBe(
      level.min,
    );
  });
});
