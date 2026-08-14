'use client';

import { Nota, Papel } from '@/components/ui/Surfaces';
import { GAME } from '@/domain/copy/ui';
import {
  REVEAL_CORRECT_LABEL,
  REVEAL_EXPLANATION_LABEL,
  REVEAL_YOUR_ANSWER_LABEL,
} from '@/domain/copy/feedback';
import { STREAK_BROKEN_LINE } from '@/domain/copy/streaks';
import type { RevealSummary } from '@/domain/engine/state';

/**
 * Revelado: qué has hecho, qué era correcto, cuántos puntos y por qué. Aquí se cierra
 * el bucle de feedback, así que se muestra el desglose completo (bonus por bonus).
 */
export function RevealPanel({
  reveal,
  onNext,
  secondsLeft,
  isLast,
}: {
  reveal: RevealSummary;
  onNext: () => void;
  secondsLeft: number;
  isLast: boolean;
}) {
  const { grade, breakdown } = reveal;
  const tone = grade.isCorrect ? 'verde' : grade.accuracy > 0 ? 'mostaza' : 'papel';
  const heading = reveal.timedOut
    ? GAME.timeUp
    : grade.isCorrect
      ? '¡Correcto!'
      : grade.accuracy > 0
        ? 'Casi'
        : 'Incorrecto';

  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <Nota tone={tone} className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="texto-cartel text-2xl">
              <span aria-hidden className="mr-1">
                {grade.isCorrect ? '✔' : grade.accuracy > 0 ? '≈' : '✘'}
              </span>
              {heading}
            </p>
            <p className="mt-1 text-sm text-tinta-suave">{reveal.line}</p>
          </div>
          <p
            className={`marcador flex-none text-3xl ${
              reveal.netPoints > 0 ? 'text-verde-portal' : reveal.netPoints < 0 ? 'text-rojo-buzon' : ''
            }`}
          >
            {reveal.netPoints > 0 ? '+' : ''}
            {reveal.netPoints}
          </p>
        </div>
      </Nota>

      <Papel className="p-4">
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="texto-sello text-tinta-tenue">{REVEAL_CORRECT_LABEL}</dt>
            <dd className="font-semibold">{grade.correctSummary}</dd>
          </div>
          {!reveal.timedOut ? (
            <div>
              <dt className="texto-sello text-tinta-tenue">{REVEAL_YOUR_ANSWER_LABEL}</dt>
              <dd>{grade.submittedSummary}</dd>
            </div>
          ) : null}
          {reveal.question.explanation ? (
            <div>
              <dt className="texto-sello text-tinta-tenue">{REVEAL_EXPLANATION_LABEL}</dt>
              <dd className="text-tinta-suave">{reveal.question.explanation}</dd>
            </div>
          ) : null}
        </dl>

        {breakdown.parts.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5 border-t border-linea pt-3">
            {breakdown.parts.map((part) => (
              <li key={part.label} className="chip">
                {part.label}{' '}
                <strong>
                  {part.points !== undefined
                    ? `${part.points > 0 ? '+' : ''}${part.points}`
                    : `×${part.multiplier}`}
                </strong>
              </li>
            ))}
            {reveal.milestoneBonus > 0 ? (
              <li className="chip border-rojo-buzon text-rojo-buzon">
                {reveal.milestoneTitle} <strong>+{reveal.milestoneBonus}</strong>
              </li>
            ) : null}
            {reveal.eventPenalty < 0 ? (
              <li className="chip border-rojo-buzon text-rojo-buzon">
                Reparación <strong>{reveal.eventPenalty}</strong>
              </li>
            ) : null}
          </ul>
        ) : null}

        {reveal.streakBroken ? (
          <p className="mt-3 text-sm text-rojo-buzon">{STREAK_BROKEN_LINE}</p>
        ) : null}
        {reveal.milestoneLine ? (
          <p className="mt-3 text-sm font-semibold text-verde-portal">🔥 {reveal.milestoneLine}</p>
        ) : null}
        {reveal.adaptiveDelta !== 0 ? (
          <p className="texto-sello mt-2 text-tinta-tenue">
            Dificultad {reveal.adaptiveDelta > 0 ? 'al alza' : 'a la baja'} para la siguiente
          </p>
        ) : null}
      </Papel>

      <button type="button" className="btn btn-verde btn-lg w-full" onClick={onNext} autoFocus>
        {isLast ? GAME.finish : GAME.nextQuestion}
        <span aria-hidden className="opacity-70">
          {secondsLeft > 0 ? ` (${secondsLeft})` : ''}
        </span>
      </button>
    </div>
  );
}
