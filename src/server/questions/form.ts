/**
 * Traducción de FormData → `QuestionInput` validado.
 *
 * El formulario del panel es un `<form>` normal, así que todo llega como texto. Aquí se
 * reconstruye el payload propio de cada tipo y se valida con Zod: si algo no cuadra, se
 * devuelven los errores por campo y no se escribe nada.
 */

import { questionInputSchema, type QuestionInput } from '@/domain/questions/schemas';
import type { QuestionType } from '@/domain/questions/types';

/** Las opciones fijas son siempre cuatro. */
const LETTERS = ['a', 'b', 'c', 'd'] as const;
/** Listas variables (objetos, decisiones, botones): hasta nueve elementos. */
const LETTERS_EXT = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'] as const;

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

/**
 * Lista de objetos con icono, una por línea y en formato «icono:Texto».
 * Es un formulario interno: este atajo evita construir un selector de iconos por fila.
 */
function iconList(formData: FormData, key: string) {
  return lines(formData, key).map((linea, index) => {
    const [posibleIcono, ...resto] = linea.split(':');
    const conIcono = resto.length > 0;
    return {
      id: LETTERS_EXT[index] ?? `o${index}`,
      text: (conIcono ? resto.join(':') : linea).trim(),
      ...(conIcono ? { icon: (posibleIcono ?? '').trim() } : {}),
    };
  });
}

/** Cuatro opciones que pueden llevar icono: «icono:Texto» en el propio campo. */
function fourOptionsMaybeIcon(formData: FormData, prefix: string) {
  return LETTERS.map((letter, index) => {
    const bruto = text(formData, `${prefix}-${letter}`);
    const [posibleIcono, ...resto] = bruto.split(':');
    const conIcono = resto.length > 0;
    return {
      id: LETTERS[index] ?? letter,
      text: (conIcono ? resto.join(':') : bruto).trim(),
      ...(conIcono ? { icon: (posibleIcono ?? '').trim() } : {}),
    };
  });
}

/** Decisiones de LA JUNTA: una por línea, «peso | texto | consecuencia». */
function decisionList(formData: FormData, key: string) {
  return lines(formData, key).map((linea, index) => {
    const partes = linea.split('|').map((parte) => parte.trim());
    const peso = Number.parseFloat(partes[0] ?? '0');
    return {
      id: LETTERS_EXT[index] ?? `o${index}`,
      text: partes[1] ?? '',
      weight: Number.isFinite(peso) ? Math.max(0, Math.min(1, peso)) : 0,
      outcome: partes[2] ?? '',
    };
  });
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
    case 'MEMORY_GRID':
      return {
        items: iconList(formData, 'items'),
        studySeconds: number(formData, 'studySeconds') ?? 5,
        question: text(formData, 'question'),
        options: fourOptions(formData, 'option'),
        correctOptionId: text(formData, 'correctOptionId') || 'a',
      };
    case 'MISSING_ITEM':
      return {
        sceneLabel: text(formData, 'sceneLabel'),
        present: iconList(formData, 'present'),
        options: fourOptionsMaybeIcon(formData, 'option'),
        correctOptionId: text(formData, 'correctOptionId') || 'a',
      };
    case 'DECISION': {
      const opciones = decisionList(formData, 'decisiones');
      const mejor = opciones.find((opcion) => opcion.weight === 1) ?? opciones[0];
      return {
        situation: text(formData, 'situation'),
        options: opciones,
        bestOptionId: mejor?.id ?? 'a',
      };
    }
    case 'SEQUENCE': {
      const pads = lines(formData, 'pads').map((texto, index) => ({
        id: LETTERS_EXT[index] ?? `o${index}`,
        text: texto,
      }));
      const secuencia = text(formData, 'secuencia')
        .split(/[\s,]+/)
        .map((parte) => Number.parseInt(parte, 10))
        .filter((numero) => Number.isFinite(numero))
        .map((numero) => pads[numero - 1]?.id ?? 'a');
      return {
        pads,
        sequence: secuencia,
        stepMs: number(formData, 'stepMs') ?? 650,
      };
    }
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
    featured: formData.get('featured') !== null,
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
