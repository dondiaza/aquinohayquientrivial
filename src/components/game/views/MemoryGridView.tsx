'use client';

import { PortalIcon } from '@/components/portal/icons';
import { PaperNotice } from '@/components/portal/Estructuras';

import { OptionGrid } from './MultipleChoiceView';
import type { QuestionViewProps } from './types';
import type { MemoryGridQuestion } from '@/domain/questions/types';

/**
 * MEMORIA DE VECINO — se exhiben los objetos unos segundos y después se pregunta.
 *
 * La fase de estudio la controla el motor (`studyUntil`), así que el tiempo de respuesta
 * NO empieza hasta que los objetos desaparecen: memorizar no te cuesta puntos.
 */
export function MemoryGridView(props: QuestionViewProps<MemoryGridQuestion>) {
  const { question, studyRemainingMs = 0 } = props;
  const memorizando = studyRemainingMs > 0;
  const segundos = Math.ceil(studyRemainingMs / 1000);

  if (memorizando) {
    return (
      <div className="space-y-4">
        <PaperNotice tono="azul" sujecion="cinta" className="p-3 text-center">
          <p className="texto-sello">Memoriza</p>
          <p className="marcador text-3xl">{segundos}</p>
        </PaperNotice>

        <ul
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          aria-label="Objetos para memorizar"
        >
          {question.items.map((item, indice) => (
            <li
              key={item.id}
              className="papel anim-aparecer-escala flex flex-col items-center gap-1 p-3"
              style={{ animationDelay: `${indice * 60}ms` }}
            >
              <PortalIcon id={item.icon ?? 'caja'} tamano={40} />
              <span className="text-center text-xs leading-tight">{item.text}</span>
            </li>
          ))}
        </ul>

        <p className="texto-sello text-center text-tinta-tenue">
          El tiempo de respuesta empieza cuando desaparezcan
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PaperNotice tono="papel" className="p-3">
        <p className="texto-sello text-tinta-tenue">Y ahora dime…</p>
        <p className="text-lg leading-snug">{question.question}</p>
      </PaperNotice>
      <OptionGrid {...props} question={question} />
    </div>
  );
}
