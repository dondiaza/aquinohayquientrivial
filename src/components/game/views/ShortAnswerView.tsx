'use client';

import { useEffect, useRef, useState } from 'react';

import { coincideRespuesta } from '@/domain/questions/texto';
import type { ShortAnswerQuestion } from '@/domain/questions/types';

import type { QuestionViewProps } from './types';

/**
 * FICHA DEL VECINO — se escribe la respuesta.
 *
 * Es la única familia en la que no se puede acertar a dedo, así que hay dos cuidados:
 *
 *   · el campo se enfoca solo y responde a Enter, para que no cueste más teclear que
 *     pensar;
 *   · en el revelado se dice qué se escribió y cuál era la respuesta, porque cuando has
 *     escrito «Marivi Bilbao» y era «Mariví Bilbao» quieres saber que te ha valido.
 *
 * La tolerancia (tildes, mayúsculas, artículos, una letra bailada) vive en
 * `src/domain/questions/texto.ts` y es la MISMA que usa la evaluación: aquí no se
 * decide nada, solo se enseña.
 */
export function ShortAnswerView({
  question,
  locked,
  reveal,
  submitted,
  onSubmit,
}: QuestionViewProps<ShortAnswerQuestion>) {
  const [texto, setTexto] = useState('');
  const campo = useRef<HTMLInputElement>(null);

  const escrito = submitted?.kind === 'TEXT' ? submitted.text : '';

  useEffect(() => {
    if (!locked) campo.current?.focus();
  }, [locked]);

  const enviar = (): void => {
    const valor = texto.trim();
    if (!valor || locked) return;
    onSubmit({ kind: 'TEXT', text: valor });
  };

  const coincidencia = reveal && escrito
    ? coincideRespuesta(escrito, question.answer, question.accepted)
    : undefined;

  return (
    <div className="space-y-3">
      {question.hint && !reveal ? (
        <p className="texto-sello text-tinta-tenue">
          Pista: <span className="tracking-widest">{question.hint}</span>
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={campo}
          type="text"
          className="campo flex-1 text-lg"
          placeholder="Escribe tu respuesta"
          value={locked ? escrito || texto : texto}
          onChange={(evento) => setTexto(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') {
              evento.preventDefault();
              enviar();
            }
          }}
          disabled={locked}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
          aria-label="Tu respuesta"
        />
        <button
          type="button"
          className="btn btn-verde"
          onClick={enviar}
          disabled={locked || texto.trim().length === 0}
        >
          Responder
        </button>
      </div>

      {!locked ? (
        <p className="text-xs text-tinta-tenue">
          Vale sin tildes ni mayúsculas, y se perdona una letra bailada.
        </p>
      ) : null}

      {reveal ? (
        <div className="space-y-1 border-2 border-tinta bg-white/50 p-3">
          <p className="texto-sello text-tinta-tenue">Escribiste</p>
          <p className="text-lg">{escrito || '— nada —'}</p>
          <p className="texto-sello mt-2 text-tinta-tenue">Respuesta</p>
          <p className="text-lg font-semibold">{question.answer}</p>
          {coincidencia?.conErrata ? (
            <p className="text-xs text-verde-junta">
              Te ha valido: la diferencia era solo de escritura.
            </p>
          ) : null}
          {question.accepted.length > 0 ? (
            <p className="text-xs text-tinta-tenue">
              También se aceptaba: {question.accepted.join(' · ')}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
