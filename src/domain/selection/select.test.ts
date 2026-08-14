import { describe, expect, it } from 'vitest';

import { createRng } from '../rng';
import { makeMultipleChoice, makeOrderChaos, makeTrueFalse, makePool } from '@/test/fixtures';
import { eligibleQuestions, selectQuestion, selectQuestions } from './select';

const rng = () => createRng('seleccion');

describe('selección de preguntas', () => {
  it('elige una pregunta cercana a la dificultad objetivo', () => {
    const pool = [
      makeMultipleChoice({ id: 'facil', difficulty: 1 }),
      makeMultipleChoice({ id: 'media', difficulty: 5 }),
      makeMultipleChoice({ id: 'dificil', difficulty: 10 }),
    ];
    const result = selectQuestion(pool, { targetDifficulty: 5 }, rng());
    expect(result?.question.id).toBe('media');
    expect(result?.distance).toBe(0);
  });

  it('respeta los tipos permitidos', () => {
    const pool = [makeMultipleChoice({ difficulty: 5 }), makeTrueFalse({ difficulty: 5 })];
    const result = selectQuestion(
      pool,
      { targetDifficulty: 5, allowedTypes: ['TRUE_FALSE'] },
      rng(),
    );
    expect(result?.question.type).toBe('TRUE_FALSE');
    expect(result?.relaxed).toEqual([]);
  });

  it('respeta la categoría y admite mezcla', () => {
    const pool = [
      makeMultipleChoice({ id: 'a', difficulty: 5, category: 'personajes' }),
      makeMultipleChoice({ id: 'b', difficulty: 5, category: 'lugares' }),
    ];
    expect(selectQuestion(pool, { targetDifficulty: 5, category: 'lugares' }, rng())?.question.id).toBe('b');
    expect(selectQuestion(pool, { targetDifficulty: 5, category: 'mezcla' }, rng())).toBeDefined();
  });

  it('NUNCA repite una pregunta excluida', () => {
    const pool = [makeMultipleChoice({ id: 'unica', difficulty: 5 })];
    const result = selectQuestion(
      pool,
      { targetDifficulty: 5, excludeIds: new Set(['unica']) },
      rng(),
    );
    expect(result).toBeUndefined();
  });

  it('ignora preguntas que no están activas', () => {
    const question = { ...makeMultipleChoice({ id: 'borrador' }), status: 'DRAFT' as const };
    expect(eligibleQuestions([question], { targetDifficulty: 5 })).toEqual([]);
  });

  it('relaja los filtros en orden: dificultad, categoría y tipo', () => {
    const pool = [makeOrderChaos({ id: 'lejana', difficulty: 10 })];

    const soloDificultad = selectQuestion(pool, { targetDifficulty: 1 }, rng());
    expect(soloDificultad?.relaxed).toEqual(['difficulty']);

    const conCategoria = selectQuestion(pool, { targetDifficulty: 1, category: 'personajes' }, rng());
    expect(conCategoria?.relaxed).toEqual(['difficulty', 'category']);

    const conTipo = selectQuestion(
      pool,
      { targetDifficulty: 1, category: 'personajes', allowedTypes: ['TRUE_FALSE'] },
      rng(),
    );
    expect(conTipo?.relaxed).toEqual(['difficulty', 'category', 'type']);
  });

  it('selecciona varias preguntas sin repetir ninguna', () => {
    const pool = makePool();
    const chosen = selectQuestions(pool, { targetDifficulty: 5, count: 25 }, rng());
    expect(chosen).toHaveLength(25);
    expect(new Set(chosen.map((question) => question.id)).size).toBe(25);
  });

  it('devuelve menos preguntas si el banco se agota, sin fallar', () => {
    const pool = [makeMultipleChoice({ id: 'a' }), makeMultipleChoice({ id: 'b' })];
    const chosen = selectQuestions(pool, { targetDifficulty: 5, count: 10 }, rng());
    expect(chosen).toHaveLength(2);
  });

  it('es determinista: misma semilla, misma elección', () => {
    const pool = makePool();
    const criteria = { targetDifficulty: 6 };
    const primera = selectQuestion(pool, criteria, createRng('igual'));
    const segunda = selectQuestion(pool, criteria, createRng('igual'));
    expect(primera?.question.id).toBe(segunda?.question.id);
  });

  it('con semillas distintas no siempre elige lo mismo', () => {
    const pool = makePool();
    const ids = new Set(
      Array.from({ length: 12 }, (_, index) =>
        selectQuestion(pool, { targetDifficulty: 6 }, createRng(`semilla-${index}`))?.question.id,
      ),
    );
    expect(ids.size).toBeGreaterThan(1);
  });
});
