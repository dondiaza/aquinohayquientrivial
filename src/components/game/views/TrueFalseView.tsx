'use client';

import { useEffect } from 'react';

import { AnswerButton, type AnswerState } from '../AnswerButton';
import type { QuestionViewProps } from './types';
import type { TrueFalseQuestion } from '@/domain/questions/types';

/** VERDADERO / FALSO. Dos botones enormes: la respuesta más rápida del juego. */
export function TrueFalseView({
  question,
  locked,
  reveal,
  submitted,
  onSubmit,
}: QuestionViewProps<TrueFalseQuestion>) {
  const chosen = submitted?.kind === 'BOOLEAN' ? submitted.value : undefined;

  useEffect(() => {
    if (locked) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === 'v' || key === '1') onSubmit({ kind: 'BOOLEAN', value: true });
      if (key === 'f' || key === '2') onSubmit({ kind: 'BOOLEAN', value: false });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [locked, onSubmit]);

  const stateFor = (value: boolean): AnswerState => {
    if (!reveal) return value === chosen ? 'chosen' : 'idle';
    if (value === question.correctValue) return 'correct';
    if (value === chosen) return 'wrong';
    return 'idle';
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <AnswerButton
        index="✓"
        state={stateFor(true)}
        disabled={locked}
        shortcut="V"
        onClick={() => onSubmit({ kind: 'BOOLEAN', value: true })}
      >
        <span className="texto-cartel text-2xl">Verdadero</span>
      </AnswerButton>
      <AnswerButton
        index="✗"
        state={stateFor(false)}
        disabled={locked}
        shortcut="F"
        onClick={() => onSubmit({ kind: 'BOOLEAN', value: false })}
      >
        <span className="texto-cartel text-2xl">Falso</span>
      </AnswerButton>
    </div>
  );
}
