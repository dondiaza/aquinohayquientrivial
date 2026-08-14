/**
 * Banco de preguntas DEMO completo.
 *
 * IMPORTANTE: todo este contenido está marcado con `verified: false` y describe una
 * comunidad de vecinos FICTICIA y original (ver src/content/portal.ts). No afirma
 * hechos sobre ninguna serie real. Cuando existan preguntas verificadas con fuente,
 * se importan al banco con `verified: true` y `sourceNote` apuntando a la fuente; el
 * admin permite filtrar por ese campo.
 */

import { questionRecordSchema, type QuestionRecord } from '@/domain/questions/schemas';
import { assembleQuestion } from '@/domain/questions/schemas';
import type { Question } from '@/domain/questions/types';

import { GENERAL_QUESTIONS } from './general';
import { LUGARES_QUESTIONS } from './lugares';
import { PERSONAJES_QUESTIONS } from './personajes';
import { SITUACIONES_QUESTIONS } from './situaciones';
import { TEMPORADAS_QUESTIONS } from './temporadas';
import { TRAMAS_QUESTIONS } from './tramas';

export const DEMO_QUESTION_RECORDS: QuestionRecord[] = [
  ...GENERAL_QUESTIONS,
  ...PERSONAJES_QUESTIONS,
  ...LUGARES_QUESTIONS,
  ...SITUACIONES_QUESTIONS,
  ...TRAMAS_QUESTIONS,
  ...TEMPORADAS_QUESTIONS,
];

/** Valida el banco entero. Si algo está mal formado, el seed falla en vez de sembrar basura. */
export function validatedDemoRecords(): QuestionRecord[] {
  const seen = new Set<string>();
  return DEMO_QUESTION_RECORDS.map((record) => {
    const parsed = questionRecordSchema.parse(record);
    if (seen.has(parsed.id)) {
      throw new Error(`Pregunta demo duplicada: ${parsed.id}`);
    }
    seen.add(parsed.id);
    return parsed;
  });
}

/** El banco demo como preguntas listas para el motor (se usa en tests). */
export function demoQuestions(): Question[] {
  return validatedDemoRecords().map(assembleQuestion);
}
