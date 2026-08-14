import { describe, expect, it } from 'vitest';

import { bancoANHQV } from '@/content/anhqv/banco';
import { isCategoryId } from './categories';
import { assembleQuestion, questionInputSchema, questionRecordSchema, splitQuestion } from './schemas';
import { normalizarTexto } from './texto';
import { QUESTION_TYPES } from './types';

const baseInput = {
  type: 'MULTIPLE_CHOICE' as const,
  prompt: '¿Quién dejó la basura en el rellano?',
  difficulty: 5,
  category: 'general' as const,
  timeLimitSeconds: 20,
  payload: {
    options: [
      { id: 'a', text: 'El del 2ºA' },
      { id: 'b', text: 'El del 3ºB' },
      { id: 'c', text: 'Nadie' },
      { id: 'd', text: 'El portero' },
    ],
    correctOptionId: 'a',
  },
};

describe('validación de preguntas', () => {
  it('acepta una pregunta bien formada y aplica los valores por defecto', () => {
    const parsed = questionInputSchema.parse(baseInput);
    expect(parsed.status).toBe('ACTIVE');
    expect(parsed.verified).toBe(false);
    expect(parsed.basePoints).toBe(1000);
    expect(parsed.characters).toEqual([]);
  });

  it('rechaza elección múltiple sin cuatro opciones', () => {
    const result = questionInputSchema.safeParse({
      ...baseInput,
      payload: { ...baseInput.payload, options: baseInput.payload.options.slice(0, 3) },
    });
    expect(result.success).toBe(false);
  });

  it('rechaza que la respuesta correcta no esté entre las opciones', () => {
    const result = questionInputSchema.safeParse({
      ...baseInput,
      payload: { ...baseInput.payload, correctOptionId: 'z' },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path.includes('correctOptionId'))).toBe(true);
  });

  it('rechaza ids de opción repetidos', () => {
    const result = questionInputSchema.safeParse({
      ...baseInput,
      payload: {
        ...baseInput.payload,
        options: baseInput.payload.options.map((option) => ({ ...option, id: 'a' })),
      },
    });
    expect(result.success).toBe(false);
  });

  it('rechaza dificultad fuera de la escala 1-10', () => {
    expect(questionInputSchema.safeParse({ ...baseInput, difficulty: 0 }).success).toBe(false);
    expect(questionInputSchema.safeParse({ ...baseInput, difficulty: 11 }).success).toBe(false);
  });

  it('rechaza una categoría inexistente', () => {
    expect(questionInputSchema.safeParse({ ...baseInput, category: 'gastronomia' }).success).toBe(false);
  });

  it('rechaza enunciados vacíos o demasiado cortos', () => {
    expect(questionInputSchema.safeParse({ ...baseInput, prompt: '¿Eh?' }).success).toBe(false);
  });

  it('rechaza tiempos absurdos', () => {
    expect(questionInputSchema.safeParse({ ...baseInput, timeLimitSeconds: 1 }).success).toBe(false);
    expect(questionInputSchema.safeParse({ ...baseInput, timeLimitSeconds: 600 }).success).toBe(false);
  });

  it('exige que el payload corresponda al tipo', () => {
    const result = questionInputSchema.safeParse({
      ...baseInput,
      type: 'TRUE_FALSE',
      payload: baseInput.payload,
    });
    expect(result.success).toBe(false);
  });

  it('valida «el infiltrado» y «ordena el desastre»', () => {
    expect(
      questionInputSchema.safeParse({
        ...baseInput,
        type: 'IMPOSTOR',
        payload: {
          setLabel: 'Zonas comunes del portal',
          items: baseInput.payload.options,
          impostorItemId: 'd',
        },
      }).success,
    ).toBe(true);

    expect(
      questionInputSchema.safeParse({
        ...baseInput,
        type: 'ORDER_CHAOS',
        payload: { steps: [{ id: 's1', text: 'Uno' }, { id: 's2', text: 'Dos' }] },
      }).success,
    ).toBe(false); // menos de 3 pasos
  });
});

describe('conversión entre registro y pregunta', () => {
  it('aplanar y volver a separar no pierde información', () => {
    const record = questionRecordSchema.parse({
      ...baseInput,
      id: 'q1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const question = assembleQuestion(record);
    expect(question.type).toBe('MULTIPLE_CHOICE');
    if (question.type === 'MULTIPLE_CHOICE') {
      expect(question.options).toHaveLength(4);
      expect(question.correctOptionId).toBe('a');
    }
    expect(splitQuestion(question)).toEqual(record);
  });
});

describe('banco de AQUÍ NO HAY QUIEN VIVA', () => {
  const { registros, diagnostico } = bancoANHQV();

  it('importa el pack entero sin perder ni duplicar ids', () => {
    expect(registros.length).toBe(diagnostico.total + diagnostico.derivadas);
    expect(new Set(registros.map((record) => record.id)).size).toBe(registros.length);
    // Los ids del pack se conservan tal cual: es lo que permite volver a importarlo.
    expect(registros.some((record) => record.id === 'Q0001')).toBe(true);
    expect(registros.some((record) => record.id === 'Q0958')).toBe(true);
  });

  it('cubre las once familias jugables', () => {
    for (const type of QUESTION_TYPES) {
      const jugables = registros.filter(
        (record) => record.type === type && record.status === 'ACTIVE' && !record.needsReview,
      );
      expect(jugables.length, `sin preguntas jugables de tipo ${type}`).toBeGreaterThan(0);
    }
  });

  it('todas las preguntas tienen explicación y categoría del catálogo', () => {
    const sinExplicacion = registros.filter((record) => !record.explanation);
    expect(sinExplicacion.map((record) => record.id)).toEqual([]);
    for (const record of registros) {
      expect(isCategoryId(record.category), `categoría inválida en ${record.id}`).toBe(true);
    }
  });

  it('cubre todo el rango de dificultades', () => {
    const difficulties = new Set(registros.map((record) => record.difficulty));
    expect(Math.min(...difficulties)).toBeLessThanOrEqual(2);
    expect(Math.max(...difficulties)).toBeGreaterThanOrEqual(9);
  });

  it('en las de opciones, la respuesta correcta está exactamente una vez', () => {
    for (const record of registros) {
      if (
        record.type !== 'MULTIPLE_CHOICE' &&
        record.type !== 'FINAL_BET' &&
        record.type !== 'WHO_IS_IT'
      ) {
        continue;
      }
      const correcta = record.payload.options.filter(
        (option) => option.id === record.payload.correctOptionId,
      );
      expect(correcta.length, `respuesta correcta mal marcada en ${record.id}`).toBe(1);
      const textos = record.payload.options.map((option) => option.text);
      expect(new Set(textos).size, `opciones repetidas en ${record.id}`).toBe(textos.length);
    }
  });

  it('ningún enunciado publicado contiene su propia respuesta', () => {
    const chivatas: string[] = [];
    for (const record of registros) {
      if (record.needsReview || record.status !== 'ACTIVE') continue;
      const respuesta =
        record.type === 'SHORT_ANSWER'
          ? record.payload.answer
          : record.type === 'MULTIPLE_CHOICE' || record.type === 'FINAL_BET'
            ? record.payload.options.find((option) => option.id === record.payload.correctOptionId)?.text
            : undefined;
      if (!respuesta || respuesta.length < 5) continue;
      const enunciado = ` ${normalizarTexto(record.prompt)} `;
      if (enunciado.includes(` ${normalizarTexto(respuesta)} `)) chivatas.push(record.id);
    }
    expect(chivatas).toEqual([]);
  });

  it('lo que no se puede jugar limpio queda en borrador', () => {
    for (const record of registros) {
      if (!record.needsReview) continue;
      expect(record.status, `${record.id} está marcada para revisión pero activa`).toBe('DRAFT');
    }
    // Si esto sube mucho, algo se ha roto en el importador.
    expect(diagnostico.enRevision).toBeLessThan(20);
  });

  it('el destripe está clasificado y hay contenido para el modo sin spoilers', () => {
    const sinSpoilers = registros.filter(
      (record) => record.spoiler !== 'major' && record.status === 'ACTIVE' && !record.needsReview,
    );
    expect(sinSpoilers.length).toBeGreaterThan(800);
    expect(registros.some((record) => record.spoiler === 'major')).toBe(true);
  });

  it('el trío del pack sobre un mismo dato comparte huella', () => {
    const primeras = registros.filter((record) => ['Q0001', 'Q0002', 'Q0003'].includes(record.id));
    expect(primeras).toHaveLength(3);
    expect(new Set(primeras.map((record) => record.factKey)).size).toBe(1);
  });
});
