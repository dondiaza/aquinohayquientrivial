import { describe, expect, it } from 'vitest';

import { gameSetupSchema, parseGameConfig } from './config';
import { answerReportSchema, finishGameRequestSchema, reportAnswerRequestSchema } from './wire';
import { GAME_FORMATS, getGameFormat, totalQuestions } from '../rounds/formats';
import { estimateDifficulty, MIN_SAMPLES_FOR_ESTIMATE } from '../questions/analytics';
import { performanceIndex, rankForIndex } from '../ranks/ranks';

describe('configuración de partida', () => {
  it('rellena los valores por defecto', () => {
    const setup = gameSetupSchema.parse({});
    expect(setup).toEqual({
      formatId: 'normal',
      difficultyId: 'vecino',
      category: 'mezcla',
      adaptiveDifficulty: true,
    });
  });

  it('rechaza formatos, dificultades y categorías inventadas', () => {
    expect(gameSetupSchema.safeParse({ formatId: 'infinito' }).success).toBe(false);
    expect(gameSetupSchema.safeParse({ difficultyId: 'imposible' }).success).toBe(false);
    expect(gameSetupSchema.safeParse({ category: 'cocina' }).success).toBe(false);
  });

  it('recorta el nombre del jugador', () => {
    expect(gameSetupSchema.parse({ playerName: '  Vecina del 3ºB  ' }).playerName).toBe('Vecina del 3ºB');
    expect(gameSetupSchema.safeParse({ playerName: 'x'.repeat(40) }).success).toBe(false);
  });

  it('la configuración completa exige semilla', () => {
    expect(() => parseGameConfig({ formatId: 'express' })).toThrow();
    expect(parseGameConfig({ formatId: 'express', seed: 'abc' }).mode).toBe('SOLO');
  });
});

describe('formatos de partida', () => {
  it('los tres formatos crecen en número de preguntas', () => {
    const [express, normal, maraton] = GAME_FORMATS;
    expect(totalQuestions(express)).toBeLessThan(totalQuestions(normal));
    expect(totalQuestions(normal)).toBeLessThan(totalQuestions(maraton));
  });

  it('todos acaban en una ronda final con apuesta', () => {
    for (const declared of GAME_FORMATS) {
      const last = getGameFormat(declared.id).rounds.at(-1)!;
      expect(last.isFinal).toBe(true);
      expect(last.allowedTypes).toContain('FINAL_BET');
      expect(last.questionCount).toBe(1);
    }
  });

  it('un formato desconocido cae en el normal', () => {
    expect(getGameFormat('no-existe').id).toBe('normal');
  });
});

describe('contrato de red', () => {
  const answer = {
    questionId: 'q1',
    roundId: 'r1',
    indexInGame: 0,
    type: 'MULTIPLE_CHOICE' as const,
    difficulty: 5,
    answered: true,
    correct: true,
    accuracy: 1,
    responseMs: 3000,
    pointsAwarded: 1300,
    basePoints: 1000,
    timeBonus: 300,
    streakBonus: 0,
    multiplier: 1,
    streakAfter: 1,
    wager: 0,
    powerUpsUsed: [],
    submitted: { kind: 'OPTION' as const, optionId: 'a' },
    maxPoints: 1800,
  };

  it('acepta un informe de respuesta válido', () => {
    expect(answerReportSchema.safeParse(answer).success).toBe(true);
  });

  it('rechaza precisión fuera de rango y comodines inventados', () => {
    expect(answerReportSchema.safeParse({ ...answer, accuracy: 1.5 }).success).toBe(false);
    expect(answerReportSchema.safeParse({ ...answer, powerUpsUsed: ['CHISMORREO'] }).success).toBe(false);
  });

  it('rechaza una respuesta con forma desconocida', () => {
    expect(answerReportSchema.safeParse({ ...answer, submitted: { kind: 'TELEPATIA' } }).success).toBe(
      false,
    );
  });

  it('la petición admite eventos y por defecto ninguno', () => {
    const parsed = reportAnswerRequestSchema.parse({ answer, totalScore: 1300 });
    expect(parsed.events).toEqual([]);

    const conEventos = reportAnswerRequestSchema.safeParse({
      answer,
      totalScore: 1300,
      events: [{ seq: 1, type: 'ANSWER_REVEALED', at: 1, payload: { correct: true } }],
    });
    expect(conEventos.success).toBe(true);
  });

  it('rechaza tipos de evento que el motor no emite', () => {
    const result = reportAnswerRequestSchema.safeParse({
      answer,
      totalScore: 0,
      events: [{ seq: 1, type: 'VECINO_ENFADADO', at: 1, payload: {} }],
    });
    expect(result.success).toBe(false);
  });

  it('el cierre de partida no acepta puntuaciones negativas', () => {
    expect(finishGameRequestSchema.safeParse({ totalScore: -5, bestStreak: 0 }).success).toBe(false);
    expect(finishGameRequestSchema.safeParse({ totalScore: 100, bestStreak: 3 }).success).toBe(true);
  });
});

describe('rangos y analítica', () => {
  it('el índice de rendimiento pesa más la precisión que los puntos', () => {
    const precisa = performanceIndex({
      correctAnswers: 10,
      totalQuestions: 10,
      totalScore: 5000,
      maxPossibleScore: 20000,
    });
    const puntuada = performanceIndex({
      correctAnswers: 5,
      totalQuestions: 10,
      totalScore: 20000,
      maxPossibleScore: 20000,
    });
    expect(precisa).toBeGreaterThan(puntuada);
  });

  it('reparte los rangos de visitante a leyenda', () => {
    expect(rankForIndex(0).id).toBe('visitante');
    expect(rankForIndex(0.55).id).toBe('propietario');
    expect(rankForIndex(1).id).toBe('leyenda-radio-patio');
  });

  it('la dificultad estimada necesita muestras', () => {
    expect(estimateDifficulty({ timesAnswered: MIN_SAMPLES_FOR_ESTIMATE - 1, timesCorrect: 0 })).toBeNull();
    expect(estimateDifficulty({ timesAnswered: 10, timesCorrect: 10 })).toBe(1);
    expect(estimateDifficulty({ timesAnswered: 10, timesCorrect: 0 })).toBe(10);
    expect(estimateDifficulty({ timesAnswered: 10, timesCorrect: 5 })).toBe(5.5);
  });
});
