/**
 * Contrato común de las vistas de pregunta.
 *
 * Cada tipo de prueba tiene su propia vista y recibe SU tipo de pregunta ya
 * estrechado. No hay un componente gigante con condicionales: `QuestionStage` hace
 * un único switch exhaustivo y delega.
 */

import type { RoundPresentation } from '@/domain/rounds/formats';
import type { ActiveQuestion, RevealSummary } from '@/domain/engine/state';
import type { AnswerSubmission, Question } from '@/domain/questions/types';

export type QuestionViewProps<T extends Question = Question> = {
  question: T;
  active: ActiveQuestion;
  /** true en cuanto la respuesta está bloqueada (ANSWER_LOCKED o REVEAL). */
  locked: boolean;
  /** Lo que ha enviado el jugador, en cuanto lo envía (para marcar su elección). */
  submitted?: AnswerSubmission | undefined;
  /** Presente solo en la fase REVEAL. */
  reveal?: RevealSummary | undefined;
  /** Milisegundos que quedan de fase de estudio (0 = ya se puede responder). */
  studyRemainingMs?: number;
  /** Cómo presenta la ronda esta pregunta (buzones, telefonillo, junta…). */
  presentation?: RoundPresentation;
  onSubmit: (submission: AnswerSubmission) => void;
  onRevealClue?: (() => void) | undefined;
};

/** Ordena las opciones según la presentación mezclada de la partida. */
export function inPresentationOrder<T extends { id: string }>(
  items: readonly T[],
  order: readonly string[],
): T[] {
  if (order.length === 0) return [...items];
  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered = order.map((id) => byId.get(id)).filter((item): item is T => item !== undefined);
  // Por si el orden guardado no cubre todo (p. ej. tras editar una pregunta).
  for (const item of items) if (!order.includes(item.id)) ordered.push(item);
  return ordered;
}

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

export function letterFor(index: number): string {
  return LETTERS[index] ?? String(index + 1);
}

/** Texto que se muestra cuando se ha ido la luz (power-up de riesgo). */
export const TEXTO_A_OSCURAS = '▮▮▮▮▮▮▮▮';
