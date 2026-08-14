'use client';

import type { ReactNode } from 'react';

export type AnswerState = 'idle' | 'chosen' | 'correct' | 'wrong' | 'eliminated';

const STATE_CLASS: Record<AnswerState, string> = {
  idle: '',
  chosen: 'respuesta-elegida',
  correct: 'respuesta-correcta',
  wrong: 'respuesta-fallo',
  eliminated: 'respuesta-descartada',
};

/**
 * Botón de respuesta. El estado NUNCA se comunica solo con color: lleva también
 * icono y texto accesible, para que funcione con daltonismo y con lector de pantalla.
 */
export function AnswerButton({
  index,
  children,
  state = 'idle',
  disabled,
  onClick,
  shortcut,
}: {
  /** Índice para la pastilla (A, B, C…) o número. */
  index?: string;
  children: ReactNode;
  state?: AnswerState;
  disabled?: boolean;
  onClick?: () => void;
  shortcut?: string;
}) {
  const mark =
    state === 'correct' ? '✔' : state === 'wrong' ? '✘' : state === 'eliminated' ? '—' : null;
  const statusText =
    state === 'correct'
      ? 'Respuesta correcta'
      : state === 'wrong'
        ? 'Respuesta incorrecta'
        : state === 'chosen'
          ? 'Tu respuesta'
          : state === 'eliminated'
            ? 'Descartada por Radio Patio'
            : null;

  return (
    <button
      type="button"
      className={`respuesta ${STATE_CLASS[state]}`}
      disabled={disabled || state === 'eliminated'}
      onClick={onClick}
    >
      {index ? (
        <span aria-hidden className="indice-respuesta">
          {index}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 text-base leading-snug sm:text-lg">{children}</span>
      {mark ? (
        <span aria-hidden className="text-2xl leading-none">
          {mark}
        </span>
      ) : null}
      {shortcut ? (
        <span aria-hidden className="texto-sello hidden opacity-60 sm:inline">
          {shortcut}
        </span>
      ) : null}
      {statusText ? <span className="sr-only">{statusText}</span> : null}
    </button>
  );
}
