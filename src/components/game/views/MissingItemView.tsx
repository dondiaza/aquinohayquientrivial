'use client';

import { PortalIcon } from '@/components/portal/icons';
import { PaperNotice } from '@/components/portal/Estructuras';

import { AnswerButton, type AnswerState } from '../AnswerButton';
import { inPresentationOrder, letterFor, TEXTO_A_OSCURAS, type QuestionViewProps } from './types';
import type { MissingItemQuestion } from '@/domain/questions/types';

/**
 * ¿QUÉ FALTA AQUÍ? — composición original de objetos del portal; el jugador señala el
 * que NO aparece. Los dibujos son SVG propios (src/components/portal/icons.tsx): nada
 * de fotogramas ni imágenes de terceros.
 */
export function MissingItemView({
  question,
  active,
  locked,
  reveal,
  submitted,
  onSubmit,
}: QuestionViewProps<MissingItemQuestion>) {
  const opciones = inPresentationOrder(question.options, active.optionOrder);
  const elegida = submitted?.kind === 'OPTION' ? submitted.optionId : undefined;

  const estadoDe = (optionId: string): AnswerState => {
    if (active.eliminatedOptionIds.includes(optionId)) return 'eliminated';
    if (!reveal) return optionId === elegida ? 'chosen' : 'idle';
    if (optionId === question.correctOptionId) return 'correct';
    if (optionId === elegida) return 'wrong';
    return 'idle';
  };

  return (
    <div className="space-y-4">
      {/* La escena */}
      <div className="tablon p-3">
        <p className="texto-sello mb-2 text-center text-papel">{question.sceneLabel}</p>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label="Objetos de la escena">
          {question.present.map((objeto, indice) => (
            <li
              key={objeto.id}
              className="papel anim-aparecer flex flex-col items-center gap-1 p-2"
              style={{ animationDelay: `${indice * 50}ms` }}
            >
              <PortalIcon id={objeto.icon ?? 'caja'} tamano={34} />
              <span className="text-center text-[0.65rem] leading-tight">{objeto.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <PaperNotice tono="mostaza" className="p-2 text-center text-sm">
        ¿Cuál de estos <strong>no está</strong> en la escena?
      </PaperNotice>

      <div className="grid gap-2 sm:grid-cols-2">
        {opciones.map((opcion, indice) => (
          <AnswerButton
            key={opcion.id}
            index={letterFor(indice)}
            state={estadoDe(opcion.id)}
            disabled={locked}
            onClick={() => onSubmit({ kind: 'OPTION', optionId: opcion.id })}
          >
            <span className="flex items-center gap-2">
              {!active.riskMode ? <PortalIcon id={opcion.icon ?? 'caja'} tamano={26} /> : null}
              <span>{active.riskMode ? TEXTO_A_OSCURAS : opcion.text}</span>
            </span>
          </AnswerButton>
        ))}
      </div>
    </div>
  );
}
