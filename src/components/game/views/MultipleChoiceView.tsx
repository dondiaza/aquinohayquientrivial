'use client';

import { useEffect } from 'react';

import { AnswerButton, type AnswerState } from '../AnswerButton';
import { inPresentationOrder, letterFor, type QuestionViewProps } from './types';
import type { MultipleChoiceQuestion, FinalBetQuestion, WhoIsItQuestion } from '@/domain/questions/types';

type OptionQuestion = MultipleChoiceQuestion | WhoIsItQuestion | FinalBetQuestion;

/**
 * Vista compartida por los tipos que se responden eligiendo una opción
 * (elección múltiple, ¿quién es? y apuesta final). Incluye atajos de teclado 1-4.
 */
export function OptionGrid({
  question,
  active,
  locked,
  reveal,
  submitted,
  onSubmit,
}: QuestionViewProps<OptionQuestion>) {
  const options = inPresentationOrder(question.options, active.optionOrder);
  const chosenId = submitted?.kind === 'OPTION' ? submitted.optionId : undefined;

  useEffect(() => {
    if (locked) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const index = Number.parseInt(event.key, 10) - 1;
      if (Number.isNaN(index)) return;
      const option = options[index];
      if (!option) return;
      if (active.eliminatedOptionIds.includes(option.id)) return;
      onSubmit({ kind: 'OPTION', optionId: option.id });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [locked, options, onSubmit, active.eliminatedOptionIds]);

  const stateFor = (optionId: string): AnswerState => {
    if (active.eliminatedOptionIds.includes(optionId)) return 'eliminated';
    if (!reveal) return optionId === chosenId ? 'chosen' : 'idle';
    if (optionId === question.correctOptionId) return 'correct';
    if (optionId === chosenId) return 'wrong';
    return 'idle';
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option, index) => (
        <AnswerButton
          key={option.id}
          index={letterFor(index)}
          state={stateFor(option.id)}
          disabled={locked}
          shortcut={`${index + 1}`}
          onClick={() => onSubmit({ kind: 'OPTION', optionId: option.id })}
        >
          {option.text}
        </AnswerButton>
      ))}
    </div>
  );
}

export function MultipleChoiceView(props: QuestionViewProps<MultipleChoiceQuestion>) {
  return <OptionGrid {...props} />;
}
