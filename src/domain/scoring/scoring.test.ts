import { describe, expect, it } from 'vitest';

import {
  SCORING,
  clampWager,
  combineModifiers,
  clueMultiplier,
  difficultyMultiplier,
  maxPointsFor,
  maxWager,
  scoreAnswer,
  streakBonus,
  timeBonus,
} from './scoring';

const base = {
  basePoints: 1000,
  accuracy: 1,
  isCorrect: true,
  difficulty: 5,
  timeLimitSeconds: 20,
  responseMs: 0,
  streakBefore: 0,
};

describe('bonus de tiempo', () => {
  it('da el máximo si se responde al instante', () => {
    expect(timeBonus(0, 20)).toBe(SCORING.timeBonusMax);
  });

  it('da cero si se agota el tiempo', () => {
    expect(timeBonus(20_000, 20)).toBe(0);
  });

  it('va por tramos: 200 ms de diferencia no cambian el bonus', () => {
    expect(timeBonus(5_000, 20)).toBe(timeBonus(5_200, 20));
  });

  it('los tramos son de 50 puntos y hay seis', () => {
    const values = new Set(
      Array.from({ length: 21 }, (_, index) => timeBonus(index * 1000, 20)),
    );
    expect([...values].sort((a, b) => a - b)).toEqual([0, 50, 100, 150, 200, 250, 300]);
  });

  it('responder pronto siempre vale más o igual que responder tarde', () => {
    for (let ms = 0; ms < 20_000; ms += 1000) {
      expect(timeBonus(ms, 20)).toBeGreaterThanOrEqual(timeBonus(ms + 1000, 20));
    }
  });
});

describe('bonus de racha', () => {
  it('suma 100 por acierto consecutivo', () => {
    expect(streakBonus(0)).toBe(0);
    expect(streakBonus(3)).toBe(300);
  });

  it('tiene tope', () => {
    expect(streakBonus(50)).toBe(SCORING.streakBonusPerStep * SCORING.streakBonusCap);
  });
});

describe('multiplicadores', () => {
  it('la dificultad 5 es neutra', () => {
    expect(difficultyMultiplier(5)).toBe(1);
  });

  it('sube con la dificultad y está acotado', () => {
    expect(difficultyMultiplier(10)).toBeGreaterThan(1);
    expect(difficultyMultiplier(1)).toBeLessThan(1);
    expect(difficultyMultiplier(100)).toBeLessThanOrEqual(SCORING.difficultyMultiplierMax);
    expect(difficultyMultiplier(-5)).toBeGreaterThanOrEqual(SCORING.difficultyMultiplierMin);
  });

  it('las pistas sin usar premian', () => {
    expect(clueMultiplier(1, 3)).toBeGreaterThan(clueMultiplier(3, 3));
    expect(clueMultiplier(3, 3)).toBe(1);
    expect(clueMultiplier(undefined, undefined)).toBe(1);
  });

  it('los modificadores se multiplican entre sí', () => {
    expect(
      combineModifiers([
        { id: 'a', label: 'A', multiplier: 1.5 },
        { id: 'b', label: 'B', multiplier: 2 },
      ]),
    ).toBe(3);
    expect(combineModifiers(undefined)).toBe(1);
  });
});

describe('puntuación de una respuesta', () => {
  it('un acierto perfecto suma base + tiempo + racha', () => {
    const result = scoreAnswer({ ...base, streakBefore: 2 });
    expect(result.base).toBe(1000);
    expect(result.timeBonus).toBe(300);
    expect(result.streakBonus).toBe(200);
    expect(result.total).toBe(1500);
  });

  it('un fallo no da nada, ni bonus de tiempo ni de racha', () => {
    const result = scoreAnswer({ ...base, isCorrect: false, accuracy: 0, streakBefore: 4 });
    expect(result.total).toBe(0);
    expect(result.timeBonus).toBe(0);
    expect(result.streakBonus).toBe(0);
  });

  it('la precisión pesa más que la velocidad', () => {
    const lentoPeroCorrecto = scoreAnswer({ ...base, responseMs: 19_500 });
    const rapidoPeroFallado = scoreAnswer({
      ...base,
      isCorrect: false,
      accuracy: 0,
      responseMs: 100,
    });
    expect(lentoPeroCorrecto.total).toBeGreaterThan(rapidoPeroFallado.total);
    // Y el bonus de tiempo nunca puede superar al acierto.
    expect(SCORING.timeBonusMax).toBeLessThan(SCORING.defaultBasePoints);
  });

  it('el acierto parcial escala la base pero mantiene el bonus de tiempo', () => {
    const result = scoreAnswer({ ...base, isCorrect: false, accuracy: 2 / 3 });
    expect(result.base).toBe(667);
    expect(result.timeBonus).toBe(300);
    expect(result.total).toBe(967);
  });

  it('aplica dificultad y modificadores', () => {
    const result = scoreAnswer({
      ...base,
      difficulty: 10,
      modifiers: [{ id: 'derrama', label: 'Derrama', multiplier: 1.5 }],
    });
    // (1000 + 300) × 1.3 × 1.5
    expect(result.total).toBe(Math.round(1300 * 1.3 * 1.5));
  });

  it('devuelve un desglose legible', () => {
    const result = scoreAnswer({ ...base, streakBefore: 3, difficulty: 8 });
    const labels = result.parts.map((part) => part.label);
    expect(labels).toContain('Acierto');
    expect(labels).toContain('Bonus de tiempo');
    expect(labels).toContain('Bonus de racha');
    expect(labels).toContain('Dificultad');
  });

  it('nunca puntúa por encima del máximo teórico de la pregunta', () => {
    const input = { ...base, streakBefore: 99, difficulty: 9 };
    const result = scoreAnswer(input);
    expect(result.questionPoints).toBeLessThanOrEqual(
      maxPointsFor({ basePoints: input.basePoints, difficulty: input.difficulty }),
    );
  });
});

describe('apuesta final', () => {
  it('suma lo apostado al acertar', () => {
    const result = scoreAnswer({ ...base, wager: 500 });
    expect(result.wagerDelta).toBe(500);
    expect(result.total).toBe(result.questionPoints + 500);
  });

  it('resta lo apostado al fallar, y no da puntos de pregunta', () => {
    const result = scoreAnswer({ ...base, isCorrect: false, accuracy: 0, wager: 500 });
    expect(result.questionPoints).toBe(0);
    expect(result.wagerDelta).toBe(-500);
    expect(result.total).toBe(-500);
  });

  it('el máximo apostable es una fracción del marcador, redondeada a decenas', () => {
    expect(maxWager(1234, 0.5)).toBe(610);
    expect(maxWager(0, 0.5)).toBe(0);
  });

  it('recorta apuestas fuera de rango', () => {
    expect(clampWager(99_999, 1000, 0.5)).toBe(500);
    expect(clampWager(-10, 1000, 0.5)).toBe(0);
    expect(clampWager(Number.NaN, 1000, 0.5)).toBe(0);
    expect(clampWager(250, 1000, 0.5)).toBe(250);
  });
});
