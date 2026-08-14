'use client';

import { AnswerButton, type AnswerState } from '../AnswerButton';
import { GAME } from '@/domain/copy/ui';
import { Nota } from '@/components/ui/Surfaces';

import { inPresentationOrder, letterFor, type QuestionViewProps } from './types';
import type { ImpostorQuestion } from '@/domain/questions/types';

/** EL INFILTRADO: cuatro elementos, tres pertenecen al conjunto y uno no. */
export function ImpostorView({
  question,
  active,
  locked,
  reveal,
  submitted,
  onSubmit,
}: QuestionViewProps<ImpostorQuestion>) {
  const items = inPresentationOrder(question.items, active.optionOrder);
  const chosenId = submitted?.kind === 'ITEM' ? submitted.itemId : undefined;

  const stateFor = (itemId: string): AnswerState => {
    if (!reveal) return itemId === chosenId ? 'chosen' : 'idle';
    if (itemId === question.impostorItemId) return 'correct';
    if (itemId === chosenId) return 'wrong';
    return 'idle';
  };

  return (
    <div className="space-y-3">
      <Nota tone="azul" className="p-3">
        <p className="texto-sello">Los tres que encajan son…</p>
        <p className="text-base font-semibold">{question.setLabel}</p>
        <p className="mt-1 text-xs text-tinta-suave">{GAME.impostorHint}</p>
      </Nota>

      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item, index) => (
          <AnswerButton
            key={item.id}
            index={letterFor(index)}
            state={stateFor(item.id)}
            disabled={locked}
            onClick={() => onSubmit({ kind: 'ITEM', itemId: item.id })}
          >
            {item.text}
          </AnswerButton>
        ))}
      </div>
    </div>
  );
}
