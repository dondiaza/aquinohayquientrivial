'use client';

import { useEffect } from 'react';

import { PortalIcon } from '@/components/portal/icons';

import { AnswerButton, type AnswerState } from '../AnswerButton';
import { inPresentationOrder, letterFor, TEXTO_A_OSCURAS, type QuestionViewProps } from './types';
import type {
  FinalBetQuestion,
  MemoryGridQuestion,
  MissingItemQuestion,
  MultipleChoiceQuestion,
  WhoIsItQuestion,
} from '@/domain/questions/types';

type OptionQuestion =
  | MultipleChoiceQuestion
  | WhoIsItQuestion
  | FinalBetQuestion
  | MemoryGridQuestion
  | MissingItemQuestion;

/**
 * Vista compartida por los tipos que se responden eligiendo una opción.
 * Incluye atajos de teclado 1-4 y el modo «se ha ido la luz», que oculta los textos
 * pero mantiene la información accesible para lectores de pantalla.
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
  const aOscuras = active.riskMode && !reveal;

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
          <span className="flex items-center gap-2">
            {option.icon && !aOscuras ? <PortalIcon id={option.icon} tamano={26} /> : null}
            <span aria-hidden={aOscuras ? true : undefined}>
              {aOscuras ? TEXTO_A_OSCURAS : option.text}
            </span>
            {aOscuras ? (
              <span className="sr-only">
                Opción {letterFor(index)}: texto oculto porque se ha ido la luz
              </span>
            ) : null}
          </span>
        </AnswerButton>
      ))}
    </div>
  );
}

export function MultipleChoiceView(props: QuestionViewProps<MultipleChoiceQuestion>) {
  return <OptionGrid {...props} />;
}
