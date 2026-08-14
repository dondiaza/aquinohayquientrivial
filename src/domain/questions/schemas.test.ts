import { describe, expect, it } from 'vitest';

import { DEMO_QUESTION_RECORDS, validatedDemoRecords } from '@/content/demo';
import { assembleQuestion, questionInputSchema, questionRecordSchema, splitQuestion } from './schemas';
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

describe('banco de contenido demo', () => {
  it('está entero validado y sin ids repetidos', () => {
    const records = validatedDemoRecords();
    expect(records).toHaveLength(DEMO_QUESTION_RECORDS.length);
    expect(new Set(records.map((record) => record.id)).size).toBe(records.length);
  });

  it('cubre los seis tipos de prueba', () => {
    const records = validatedDemoRecords();
    for (const type of QUESTION_TYPES) {
      expect(records.filter((record) => record.type === type).length).toBeGreaterThan(0);
    }
  });

  it('está marcado como NO verificado y con nota de contenido demo', () => {
    for (const record of validatedDemoRecords()) {
      expect(record.verified).toBe(false);
      expect(record.sourceNote).toContain('DEMO');
    }
  });

  it('cubre todo el rango de dificultades', () => {
    const difficulties = new Set(validatedDemoRecords().map((record) => record.difficulty));
    expect(Math.min(...difficulties)).toBeLessThanOrEqual(2);
    expect(Math.max(...difficulties)).toBeGreaterThanOrEqual(9);
  });

  it('todas las preguntas tienen explicación', () => {
    const sinExplicacion = validatedDemoRecords().filter((record) => !record.explanation);
    expect(sinExplicacion.map((record) => record.id)).toEqual([]);
  });
});
