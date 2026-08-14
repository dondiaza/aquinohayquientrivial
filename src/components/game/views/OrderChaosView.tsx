'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { GAME } from '@/domain/copy/ui';

import { inPresentationOrder, type QuestionViewProps } from './types';
import type { OrderChaosQuestion } from '@/domain/questions/types';

/**
 * ORDENA EL DESASTRE.
 *
 * Se puede reordenar de DOS maneras a propósito:
 *   · arrastrando (ratón / trackpad, con la API nativa de HTML5),
 *   · con los botones subir/bajar, que funcionan con dedo y con teclado.
 *
 * El drag nativo no funciona bien en móvil ni con teclado, así que los botones no son
 * un extra: son el camino accesible principal. Admite acierto parcial (cada elemento
 * en su sitio cuenta), y en el revelado se marca cuál estaba bien colocado.
 */
export function OrderChaosView({
  question,
  active,
  locked,
  reveal,
  submitted,
  onSubmit,
}: QuestionViewProps<OrderChaosQuestion>) {
  const initial = useMemo(
    () => inPresentationOrder(question.steps, active.optionOrder).map((step) => step.id),
    [question.steps, active.optionOrder],
  );

  const [order, setOrder] = useState<string[]>(initial);
  const [dragging, setDragging] = useState<string | null>(null);

  useEffect(() => {
    setOrder(initial);
  }, [initial]);

  const submittedOrder = submitted?.kind === 'ORDER' ? submitted.orderedIds : undefined;
  const shown = submittedOrder && submittedOrder.length > 0 ? submittedOrder : order;
  const correctIds = question.steps.map((step) => step.id);

  const move = (id: string, direction: -1 | 1) => {
    setOrder((current) => {
      const index = current.indexOf(id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      const a = next[index];
      const b = next[target];
      if (a === undefined || b === undefined) return current;
      next[index] = b;
      next[target] = a;
      return next;
    });
  };

  const dropOn = (targetId: string) => {
    if (!dragging || dragging === targetId) return;
    setOrder((current) => {
      const from = current.indexOf(dragging);
      const to = current.indexOf(targetId);
      if (from < 0 || to < 0) return current;
      const next = [...current];
      next.splice(from, 1);
      next.splice(to, 0, dragging);
      return next;
    });
    setDragging(null);
  };

  const textFor = (id: string) => question.steps.find((step) => step.id === id)?.text ?? '';

  return (
    <div className="space-y-3">
      <p className="texto-sello text-tinta-suave">{GAME.orderHint}</p>

      <ol className="space-y-2">
        {shown.map((id, index) => {
          const wellPlaced = reveal ? correctIds[index] === id : undefined;
          const tone = !reveal
            ? 'bg-papel'
            : wellPlaced
              ? 'bg-verde-claro text-white'
              : 'bg-rojo-claro text-white';
          return (
            <li
              key={id}
              draggable={!locked}
              onDragStart={() => setDragging(id)}
              onDragEnd={() => setDragging(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => dropOn(id)}
              className={`flex items-center gap-2 border-2 border-tinta p-2 shadow-[0_3px_0_rgba(35,32,27,0.5)] ${tone} ${
                dragging === id ? 'opacity-60' : ''
              } ${locked ? '' : 'cursor-grab'}`}
            >
              <span aria-hidden className="indice-respuesta">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 text-sm sm:text-base">{textFor(id)}</span>
              {reveal ? (
                <span aria-hidden className="text-xl">
                  {wellPlaced ? '✔' : '✘'}
                </span>
              ) : (
                <span className="flex flex-none gap-1">
                  <button
                    type="button"
                    className="btn btn-papel btn-sm"
                    onClick={() => move(id, -1)}
                    disabled={locked || index === 0}
                    aria-label={`${GAME.moveUp}: ${textFor(id)}`}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    className="btn btn-papel btn-sm"
                    onClick={() => move(id, 1)}
                    disabled={locked || index === shown.length - 1}
                    aria-label={`${GAME.moveDown}: ${textFor(id)}`}
                  >
                    ▼
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex items-center justify-between gap-2 text-xs text-tinta-tenue">
        <span>↑ {question.firstLabel}</span>
        <span>{question.lastLabel} ↓</span>
      </div>

      {!locked ? (
        <Button size="lg" className="w-full" onClick={() => onSubmit({ kind: 'ORDER', orderedIds: order })}>
          {GAME.confirmOrder}
        </Button>
      ) : null}
    </div>
  );
}
