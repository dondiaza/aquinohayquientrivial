import { describe, expect, it } from 'vitest';

import { parseQuestionForm } from './form';

/** Construye un FormData como el que envía el formulario del panel. */
function form(entries: Record<string, string | undefined>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined) data.set(key, value);
  }
  return data;
}

const commonFields = {
  status: 'ACTIVE',
  prompt: '¿Quién dejó la basura en el rellano del segundo?',
  explanation: 'Nunca se supo, pero todos lo sospechan.',
  difficulty: '6',
  category: 'general',
  timeLimitSeconds: '20',
  basePoints: '1000',
};

const fourOptions = {
  'option-a': 'El del 2ºA',
  'option-b': 'El del 3ºB',
  'option-c': 'Nadie',
  'option-d': 'El portero',
};

describe('formulario del panel → QuestionInput', () => {
  it('convierte una elección múltiple válida', () => {
    const result = parseQuestionForm(
      form({ ...commonFields, ...fourOptions, type: 'MULTIPLE_CHOICE', correctOptionId: 'c' }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.type).toBe('MULTIPLE_CHOICE');
      expect(result.input.difficulty).toBe(6);
      expect(result.input.verified).toBe(false);
      if (result.input.type === 'MULTIPLE_CHOICE') {
        expect(result.input.payload.correctOptionId).toBe('c');
        expect(result.input.payload.options).toHaveLength(4);
      }
    }
  });

  it('parte las listas por comas y por saltos de línea', () => {
    const result = parseQuestionForm(
      form({
        ...commonFields,
        ...fourOptions,
        type: 'MULTIPLE_CHOICE',
        correctOptionId: 'a',
        characters: 'Amancio Quintela, Charo Peláez',
        tags: 'portal\nascensor',
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.characters).toEqual(['Amancio Quintela', 'Charo Peláez']);
      expect(result.input.tags).toEqual(['portal', 'ascensor']);
    }
  });

  it('devuelve errores por campo cuando la dificultad está fuera de rango', () => {
    const result = parseQuestionForm(
      form({ ...commonFields, ...fourOptions, type: 'MULTIPLE_CHOICE', correctOptionId: 'a', difficulty: '99' }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.difficulty).toBeDefined();
      expect(result.message).toContain('no se ha guardado');
    }
  });

  it('rechaza una opción vacía', () => {
    const result = parseQuestionForm(
      form({
        ...commonFields,
        ...fourOptions,
        'option-c': '',
        type: 'MULTIPLE_CHOICE',
        correctOptionId: 'a',
      }),
    );
    expect(result.ok).toBe(false);
  });

  it('rechaza un enunciado demasiado corto', () => {
    const result = parseQuestionForm(
      form({ ...commonFields, ...fourOptions, prompt: '¿Eh?', type: 'MULTIPLE_CHOICE', correctOptionId: 'a' }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.prompt).toBeDefined();
  });

  it('convierte verdadero/falso', () => {
    const verdadero = parseQuestionForm(
      form({ ...commonFields, type: 'TRUE_FALSE', correctValue: 'true', timeLimitSeconds: '12' }),
    );
    expect(verdadero.ok).toBe(true);
    if (verdadero.ok && verdadero.input.type === 'TRUE_FALSE') {
      expect(verdadero.input.payload.correctValue).toBe(true);
    }

    const falso = parseQuestionForm(
      form({ ...commonFields, type: 'TRUE_FALSE', correctValue: 'false', timeLimitSeconds: '12' }),
    );
    if (falso.ok && falso.input.type === 'TRUE_FALSE') {
      expect(falso.input.payload.correctValue).toBe(false);
    }
  });

  it('convierte ¿quién es? con las pistas una por línea', () => {
    const result = parseQuestionForm(
      form({
        ...commonFields,
        ...fourOptions,
        type: 'WHO_IS_IT',
        correctOptionId: 'b',
        clues: 'Tiene tres bicicletas\n\nVive en el bajo\nVota no a todo',
        clueIntervalSeconds: '6',
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.input.type === 'WHO_IS_IT') {
      expect(result.input.payload.clues).toEqual([
        'Tiene tres bicicletas',
        'Vive en el bajo',
        'Vota no a todo',
      ]);
      expect(result.input.payload.clueIntervalSeconds).toBe(6);
    }
  });

  it('convierte «ordena el desastre» generando ids por posición', () => {
    const result = parseQuestionForm(
      form({
        ...commonFields,
        type: 'ORDER_CHAOS',
        steps: 'Se avería el ascensor\nSe convoca junta\nSe aprueba la derrama',
        timeLimitSeconds: '35',
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.input.type === 'ORDER_CHAOS') {
      expect(result.input.payload.steps.map((step) => step.id)).toEqual(['s1', 's2', 's3']);
      expect(result.input.payload.firstLabel).toBe('Primero');
    }
  });

  it('rechaza «ordena el desastre» con menos de tres hechos', () => {
    const result = parseQuestionForm(
      form({ ...commonFields, type: 'ORDER_CHAOS', steps: 'Uno\nDos', timeLimitSeconds: '35' }),
    );
    expect(result.ok).toBe(false);
  });

  it('convierte «el infiltrado»', () => {
    const result = parseQuestionForm(
      form({
        ...commonFields,
        type: 'IMPOSTOR',
        setLabel: 'Zonas comunes del portal',
        'item-a': 'El portal',
        'item-b': 'La azotea',
        'item-c': 'El patio',
        'item-d': 'El salón del 1ºA',
        impostorItemId: 'd',
        timeLimitSeconds: '22',
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.input.type === 'IMPOSTOR') {
      expect(result.input.payload.impostorItemId).toBe('d');
    }
  });

  it('guarda el media como placeholder sustituible', () => {
    const result = parseQuestionForm(
      form({
        ...commonFields,
        ...fourOptions,
        type: 'MULTIPLE_CHOICE',
        correctOptionId: 'a',
        mediaPlaceholder: 'Ilustración original del portal',
        mediaKind: 'image',
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.media).toEqual({
        kind: 'image',
        placeholder: 'Ilustración original del portal',
      });
    }
  });

  it('sin placeholder no se guarda media', () => {
    const result = parseQuestionForm(
      form({ ...commonFields, ...fourOptions, type: 'MULTIPLE_CHOICE', correctOptionId: 'a' }),
    );
    if (result.ok) expect(result.input.media).toBeUndefined();
  });

  it('la casilla de verificada solo cuenta si viene marcada', () => {
    const marcada = parseQuestionForm(
      form({ ...commonFields, ...fourOptions, type: 'MULTIPLE_CHOICE', correctOptionId: 'a', verified: 'on' }),
    );
    if (marcada.ok) expect(marcada.input.verified).toBe(true);

    const sinMarcar = parseQuestionForm(
      form({ ...commonFields, ...fourOptions, type: 'MULTIPLE_CHOICE', correctOptionId: 'a' }),
    );
    if (sinMarcar.ok) expect(sinMarcar.input.verified).toBe(false);
  });
});
