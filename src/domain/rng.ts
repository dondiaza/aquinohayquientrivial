/**
 * Generador pseudoaleatorio determinista (mulberry32 con semilla derivada de string).
 *
 * Todo el azar del motor pasa por aquí: la misma semilla reproduce exactamente la
 * misma partida. Eso hace testeable la selección de preguntas y los eventos, y en
 * Fase 3 permite que servidor y cliente lleguen al mismo resultado sin sincronizar
 * números aleatorios.
 */

export type Rng = {
  /** Siguiente número en [0, 1). */
  next: () => number;
  /** Entero en [min, max] inclusive. */
  int: (min: number, max: number) => number;
  /** Estado actual (permite serializar y continuar). */
  state: () => number;
};

function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function createRng(seed: string | number, cursor = 0): Rng {
  let state = (typeof seed === 'number' ? seed >>> 0 : hashSeed(seed)) + cursor * 0x9e3779b9;
  state = state >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int: (min, max) => {
      if (max <= min) return min;
      return min + Math.floor(next() * (max - min + 1));
    },
    state: () => state,
  };
}

/** Fisher-Yates determinista. Devuelve un array nuevo. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = rng.int(0, index);
    const a = result[index];
    const b = result[swap];
    if (a !== undefined && b !== undefined) {
      result[index] = b;
      result[swap] = a;
    }
  }
  return result;
}

/** Elección ponderada. Pesos <= 0 se ignoran. */
export function pickWeighted<T>(items: readonly T[], weight: (item: T) => number, rng: Rng): T | undefined {
  const weights = items.map((item) => Math.max(0, weight(item)));
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return items[0];
  let roll = rng.next() * total;
  for (let index = 0; index < items.length; index += 1) {
    roll -= weights[index] ?? 0;
    if (roll <= 0) return items[index];
  }
  return items[items.length - 1];
}

/** Semilla legible para una partida nueva. No se usa dentro del motor. */
export function newSeed(source: { random: () => number; now: () => number }): string {
  const random = Math.floor(source.random() * 0xffffff).toString(36);
  return `${source.now().toString(36)}-${random}`;
}
