/**
 * Traducción de FormData → `QuestionInput` validado.
 *
 * El formulario del panel es un `<form>` normal, así que todo llega como texto. Aquí se
 * reconstruye el payload propio de cada tipo y se valida con Zod: si algo no cuadra, se
 * devuelven los errores por campo y no se escribe nada.
 */

import { questionInputSchema, type QuestionInput } from '@/domain/questions/schemas';
import type { QuestionType } from '@/domain/questions/types';

const LETTERS = ['a', 'b', 'c', 'd'] as const;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function optionalText(formData: FormData, key: string): string | undefined {
  const value = text(formData, key);
  return value.length > 0 ? value : undefined;
}

function number(formData: FormData, key: string): number | undefined {
  const value = text(formData, key);
  if (value.length === 0) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function list(formData: FormData, key: string): string[] {
  return text(formData, key)
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function lines(formData: FormData, key: string): string[] {
  return text(formData, key)
    .split('\n')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function fourOptions(formData: FormData, prefix: string) {
  return LETTERS.map((letter) => ({ id: letter, text: text(formData, `${prefix}-${letter}`) }));
}

function payloadFor(type: QuestionType, formData: FormData): unknown {
  switch (type) {
    case 'MULTIPLE_CHOICE':
      return {
        options: fourOptions(formData, 'option'),
        correctOptionId: text(formData, 'correctOptionId') || 'a',
      };
    case 'TRUE_FALSE':
      return { correctValue: text(formData, 'correctValue') === 'true' };
    case 'WHO_IS_IT':
      return {
        clues: lines(formData, 'clues'),
        options: fourOptions(formData, 'option'),
        correctOptionId: text(formData, 'correctOptionId') || 'a',
        clueIntervalSeconds: number(formData, 'clueIntervalSeconds') ?? 5,
      };
    case 'IMPOSTOR':
      return {
        setLabel: text(formData, 'setLabel'),
        items: fourOptions(formData, 'item'),
        impostorItemId: text(formData, 'impostorItemId') || 'a',
      };
    case 'ORDER_CHAOS':
      return {
        steps: lines(formData, 'steps').map((step, index) => ({ id: `s${index + 1}`, text: step })),
        firstLabel: optionalText(formData, 'firstLabel') ?? 'Primero',
        lastLabel: optionalText(formData, 'lastLabel') ?? 'Último',
      };
    case 'FINAL_BET':
      return {
        options: fourOptions(formData, 'option'),
        correctOptionId: text(formData, 'correctOptionId') || 'a',
        maxWagerRatio: number(formData, 'maxWagerRatio') ?? 0.5,
      };
  }
}

export type FormParseResult =
  | { ok: true; input: QuestionInput }
  | { ok: false; errors: Record<string, string>; message: string };

export function parseQuestionForm(formData: FormData): FormParseResult {
  const type = text(formData, 'type') as QuestionType;
  const mediaPlaceholder = optionalText(formData, 'mediaPlaceholder');

  const candidate = {
    type,
    status: text(formData, 'status') || 'ACTIVE',
    prompt: text(formData, 'prompt'),
    explanation: optionalText(formData, 'explanation'),
    difficulty: number(formData, 'difficulty') ?? 5,
    category: text(formData, 'category'),
    season: number(formData, 'season'),
    episode: number(formData, 'episode'),
    characters: list(formData, 'characters'),
    tags: list(formData, 'tags'),
    media: mediaPlaceholder
      ? {
          kind: (optionalText(formData, 'mediaKind') ?? 'image') as 'image' | 'audio' | 'video',
          placeholder: mediaPlaceholder,
          src: optionalText(formData, 'mediaSrc'),
        }
      : undefined,
    basePoints: number(formData, 'basePoints') ?? 1000,
    timeLimitSeconds: number(formData, 'timeLimitSeconds') ?? 20,
    sourceNote: optionalText(formData, 'sourceNote'),
    verified: formData.get('verified') !== null,
    payload: payloadFor(type, formData),
  };

  const parsed = questionInputSchema.safeParse(candidate);
  if (parsed.success) return { ok: true, input: parsed.data };

  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.join('.') || 'general';
    if (!errors[key]) errors[key] = issue.message;
  }

  return {
    ok: false,
    errors,
    message: 'Revisa los campos marcados: la pregunta no se ha guardado.',
  };
}
