/**
 * Evaluación de respuestas. Funciones PURAS: sin estado, sin reloj, sin red.
 *
 * `accuracy` (0..1) permite acierto parcial. Hoy solo ORDENA EL DESASTRE la usa:
 * cuenta cuántos elementos están en su posición exacta. Un acierto parcial da puntos
 * proporcionales pero NO alarga la racha (solo el acierto pleno lo hace), para que la
 * racha siga significando "lo has clavado".
 */

import { questionTypeMeta } from './registry';
import type { AnswerSubmission, Question } from './types';

export type Grade = {
  isCorrect: boolean;
  /** 0..1 */
  accuracy: number;
  /** Texto de la respuesta correcta, listo para el revelado. */
  correctSummary: string;
  /** Lo que el jugador eligió, en texto. Vacío si no respondió. */
  submittedSummary: string;
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

export function gradeAnswer(question: Question, submission: AnswerSubmission): Grade {
  switch (question.type) {
    case 'MULTIPLE_CHOICE':
    case 'WHO_IS_IT':
    case 'FINAL_BET': {
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
