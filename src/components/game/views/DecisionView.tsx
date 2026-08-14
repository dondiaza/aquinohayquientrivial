'use client';

import { PaperNotice } from '@/components/portal/Estructuras';

import { inPresentationOrder, type QuestionViewProps } from './types';
import type { DecisionQuestion } from '@/domain/questions/types';

/**
 * LA JUNTA — una situación y varias decisiones. No hay respuestas absurdas: hay mejores
 * y peores, y cada una tiene consecuencia (se ve en el revelado). El peso de la decisión
 * elegida es la `accuracy`, así que puntúa proporcionalmente.
 *
 * Preparado para Fase 3: esta misma estructura es una votación entre vecinos; solo hay
 * que sustituir «tu decisión» por «la decisión más votada».
 */
export function DecisionView({
  question,
  active,
  locked,
  reveal,
  submitted,
  onSubmit,
}: QuestionViewProps<DecisionQuestion>) {
  const opciones = inPresentationOrder(question.options, active.optionOrder);
  const elegida = submitted?.kind === 'OPTION' ? submitted.optionId : undefined;

  return (
    <div className="space-y-4">
      <PaperNotice tono="papel" sujecion="cinta" className="p-4 pt-5">
        <p className="texto-sello text-tinta-tenue">Orden del día</p>
        <p className="mt-1 text-base leading-snug sm:text-lg">{question.situation}</p>
      </PaperNotice>

      <ul className="space-y-2">
        {opciones.map((opcion) => {
          const esElegida = opcion.id === elegida;
          const esMejor = opcion.id === question.bestOptionId;
          const fondo = !reveal
            ? esElegida
              ? 'bg-azul-claro text-white'
              : 'bg-papel'
            : esMejor
              ? 'bg-verde-claro text-white'
              : esElegida
                ? 'bg-mostaza'
                : 'bg-papel';

          return (
            <li key={opcion.id}>
              <button
                type="button"
                className={`w-full border-2 border-tinta p-3 text-left shadow-[0_4px_0_rgba(35,32,27,0.5)] transition-transform ${fondo} ${
                  locked ? 'cursor-default' : 'hover:-translate-y-0.5 active:translate-y-0.5'
                }`}
                disabled={locked}
                onClick={() => onSubmit({ kind: 'OPTION', optionId: opcion.id })}
              >
                <span className="flex items-start gap-2">
                  <span aria-hidden className="text-lg leading-none">
                    🗳️
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug sm:text-base">{opcion.text}</span>
                    {reveal ? (
                      <span className="mt-1 block text-xs opacity-90">
                        {opcion.outcome}
                        {esMejor ? ' · mejor decisión' : ` · vale ${Math.round(opcion.weight * 100)} %`}
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {!locked ? (
        <p className="texto-sello text-center text-tinta-tenue">
          Todas se pueden votar. Unas salen mejor que otras.
        </p>
      ) : null}
    </div>
  );
}
