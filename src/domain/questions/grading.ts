/**
 * Evaluación de respuestas. Funciones PURAS: sin estado, sin reloj, sin red.
 *
 * `accuracy` (0..1) permite acierto parcial. La usan tres familias:
 *   · ORDENA EL DESASTRE — cuántos elementos están en su posición exacta.
 *   · PORTERO AUTOMÁTICO — cuántos pasos seguidos aciertas antes de fallar.
 *   · LA JUNTA — cada decisión tiene su peso; no hay respuestas absurdas, hay mejores.
 *
 * Un acierto parcial da puntos proporcionales pero NO alarga la racha (solo el acierto
 * pleno lo hace), para que la racha siga significando "lo has clavado".
 */

import { questionTypeMeta } from './registry';
import { coincideRespuesta } from './texto';
import type { AnswerSubmission, Question } from './types';

export type Grade = {
  isCorrect: boolean;
  /** 0..1 */
  accuracy: number;
  /** Texto de la respuesta correcta, listo para el revelado. */
  correctSummary: string;
  /** Lo que el jugador eligió, en texto. Vacío si no respondió. */
  submittedSummary: string;
  /** Consecuencia de la decisión elegida (solo LA JUNTA). */
  outcome?: string;
};

const NO_ANSWER = '— sin respuesta —';

function optionText(options: { id: string; text: string }[], id: string | undefined): string {
  if (!id) return NO_ANSWER;
  return options.find((option) => option.id === id)?.text ?? NO_ANSWER;
}

function orderAccuracy(correctIds: string[], submittedIds: string[]): number {
  if (correctIds.length === 0) return 0;
  let hits = 0;
  for (let index = 0; index < correctIds.length; index += 1) {
    if (correctIds[index] === submittedIds[index]) hits += 1;
  }
  return hits / correctIds.length;
}

/** Cuántos pasos seguidos coinciden desde el principio (memoria de secuencia). */
function prefixAccuracy(correctIds: string[], submittedIds: string[]): number {
  if (correctIds.length === 0) return 0;
  let hits = 0;
  for (let index = 0; index < correctIds.length; index += 1) {
    if (correctIds[index] !== submittedIds[index]) break;
    hits += 1;
  }
  return hits / correctIds.length;
}

export function gradeAnswer(question: Question, submission: AnswerSubmission): Grade {
  switch (question.type) {
    case 'MULTIPLE_CHOICE':
    case 'WHO_IS_IT':
    case 'FINAL_BET':
    case 'MEMORY_GRID':
    case 'MISSING_ITEM': {
      const chosen = submission.kind === 'OPTION' ? submission.optionId : undefined;
      const isCorrect = chosen === question.correctOptionId;
      return {
        isCorrect,
        accuracy: isCorrect ? 1 : 0,
        correctSummary: optionText(question.options, question.correctOptionId),
        submittedSummary: optionText(question.options, chosen),
      };
    }

    case 'TRUE_FALSE': {
      const chosen = submission.kind === 'BOOLEAN' ? submission.value : undefined;
      const isCorrect = chosen === question.correctValue;
      return {
        isCorrect,
        accuracy: isCorrect ? 1 : 0,
        correctSummary: question.correctValue ? 'Verdadero' : 'Falso',
        submittedSummary: chosen === undefined ? NO_ANSWER : chosen ? 'Verdadero' : 'Falso',
      };
    }

    case 'IMPOSTOR': {
      const chosen = submission.kind === 'ITEM' ? submission.itemId : undefined;
      const isCorrect = chosen === question.impostorItemId;
      return {
        isCorrect,
        accuracy: isCorrect ? 1 : 0,
        correctSummary: optionText(question.items, question.impostorItemId),
        submittedSummary: optionText(question.items, chosen),
      };
    }

    case 'ORDER_CHAOS': {
      const correctIds = question.steps.map((step) => step.id);
      const submittedIds = submission.kind === 'ORDER' ? submission.orderedIds : [];
      const accuracy = orderAccuracy(correctIds, submittedIds);
      return {
        isCorrect: accuracy === 1,
        accuracy,
        correctSummary: question.steps.map((step, index) => `${index + 1}. ${step.text}`).join(' · '),
        submittedSummary:
          submittedIds.length === 0
            ? NO_ANSWER
            : submittedIds
                .map((id, index) => {
                  const step = question.steps.find((candidate) => candidate.id === id);
                  return `${index + 1}. ${step?.text ?? '?'}`;
                })
                .join(' · '),
      };
    }

    case 'DECISION': {
      const chosen = submission.kind === 'OPTION' ? submission.optionId : undefined;
      const elegida = question.options.find((option) => option.id === chosen);
      const mejor = question.options.find((option) => option.id === question.bestOptionId);
      return {
        isCorrect: chosen === question.bestOptionId,
        accuracy: elegida ? Math.max(0, Math.min(1, elegida.weight)) : 0,
        correctSummary: mejor ? `${mejor.text} — ${mejor.outcome}` : NO_ANSWER,
        submittedSummary: elegida ? elegida.text : NO_ANSWER,
        ...(elegida ? { outcome: elegida.outcome } : {}),
      };
    }

    case 'SEQUENCE': {
      const submittedIds = submission.kind === 'ORDER' ? submission.orderedIds : [];
      const accuracy = prefixAccuracy(question.sequence, submittedIds);
      const nombre = (id: string) =>
        question.pads.find((pad) => pad.id === id)?.text ?? id;
      return {
        isCorrect: accuracy === 1 && submittedIds.length === question.sequence.length,
        accuracy,
        correctSummary: question.sequence.map(nombre).join(' → '),
        submittedSummary: submittedIds.length === 0 ? NO_ANSWER : submittedIds.map(nombre).join(' → '),
      };
    }

    case 'SHORT_ANSWER': {
      const escrita = submission.kind === 'TEXT' ? submission.text.trim() : '';
      const coincidencia = escrita
        ? coincideRespuesta(escrita, question.answer, question.accepted)
        : { acierta: false, conErrata: false };
      return {
        isCorrect: coincidencia.acierta,
        accuracy: coincidencia.acierta ? 1 : 0,
        correctSummary: question.answer,
        submittedSummary: escrita || NO_ANSWER,
      };
    }
  }
}

/** ¿La respuesta cuenta para alargar la racha? Solo el acierto pleno. */
export function extendsStreak(grade: Grade): boolean {
  return grade.isCorrect;
}

/** ¿Este tipo puede dar puntos parciales? Lo declara el registro de tipos. */
export function allowsPartialCredit(question: Question): boolean {
  return questionTypeMeta(question.type).supportsPartialCredit;
}
