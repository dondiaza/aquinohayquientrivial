'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { PaperNotice } from '@/components/portal/Estructuras';
import { useAudio } from '@/lib/audio/AudioProvider';
import { VIBRACION, vibrar } from '@/lib/motion';

import type { QuestionViewProps } from './types';
import type { SequenceQuestion } from '@/domain/questions/types';

/**
 * PORTERO AUTOMÁTICO — se iluminan timbres en orden y hay que repetirlos.
 *
 * Qué paso se enciende no lo decide un temporizador propio: se DERIVA del tiempo de
 * estudio que ya lleva el motor (`studyRemainingMs`). Así no hay dos relojes que puedan
 * desincronizarse y la fase de memorización no consume tiempo de respuesta.
 */
export function SequenceView({
  question,
  locked,
  reveal,
  submitted,
  studyRemainingMs = 0,
  onSubmit,
}: QuestionViewProps<SequenceQuestion>) {
  const { sonar } = useAudio();
  const [pulsados, setPulsados] = useState<string[]>([]);
  const memorizando = studyRemainingMs > 0;

  // Paso que se está mostrando, derivado del tiempo de estudio restante.
  const totalMs = question.sequence.length * question.stepMs + 600;
  const transcurrido = Math.max(0, totalMs - studyRemainingMs);
  const pasoActual = memorizando ? Math.floor(transcurrido / question.stepMs) : -1;
  const encendido =
    pasoActual >= 0 && pasoActual < question.sequence.length ? question.sequence[pasoActual] : null;

  // Un timbre por paso mostrado.
  useEffect(() => {
    if (encendido) sonar('timbre');
  }, [encendido, sonar]);

  const enviadoIds = submitted?.kind === 'ORDER' ? submitted.orderedIds : undefined;
  const mostrados = enviadoIds ?? pulsados;

  const pulsar = (padId: string) => {
    if (locked || memorizando) return;
    const siguiente = [...pulsados, padId];
    setPulsados(siguiente);
    sonar('seleccion');
    vibrar(VIBRACION.toque);
    if (siguiente.length >= question.sequence.length) {
      onSubmit({ kind: 'ORDER', orderedIds: siguiente });
    }
  };

  return (
    <div className="space-y-4">
      <PaperNotice tono={memorizando ? 'azul' : 'papel'} className="p-3 text-center">
        <p className="texto-sello">
          {memorizando ? 'Mira la secuencia' : locked ? 'Secuencia enviada' : 'Ahora repítela'}
        </p>
        <p className="mt-1 text-sm text-tinta-suave">
          {question.sequence.length} timbres · llevas {mostrados.length}
        </p>
      </PaperNotice>

      <div className="metal mx-auto grid max-w-xs grid-cols-2 gap-3 p-4">
        {question.pads.map((pad) => {
          const activo = encendido === pad.id;
          const correcto =
            reveal && question.sequence.includes(pad.id) ? 'ring-2 ring-verde-portal' : '';
          return (
            <button
              key={pad.id}
              type="button"
              className={`boton-ascensor h-16 w-full rounded-sm ${activo ? 'boton-ascensor-encendido' : ''} ${correcto}`}
              onClick={() => pulsar(pad.id)}
              disabled={locked || memorizando}
              aria-label={`Timbre ${pad.text}${activo ? ' (encendido)' : ''}`}
            >
              {pad.text}
            </button>
          );
        })}
      </div>

      {/* Lo pulsado hasta ahora, también en texto: el estado no depende del color */}
      <p className="text-center text-sm" aria-live="polite">
        {mostrados.length === 0 ? (
          <span className="texto-sello text-tinta-tenue">Sin pulsar todavía</span>
        ) : (
          mostrados
            .map((id) => question.pads.find((pad) => pad.id === id)?.text ?? '?')
            .join(' → ')
        )}
      </p>

      {!locked && !memorizando && pulsados.length > 0 ? (
        <div className="flex justify-center gap-2">
          <Button tone="fantasma" size="sm" onClick={() => setPulsados([])}>
            Empezar de nuevo
          </Button>
          <Button
            tone="papel"
            size="sm"
            onClick={() => onSubmit({ kind: 'ORDER', orderedIds: pulsados })}
          >
            Enviar así
          </Button>
        </div>
      ) : null}
    </div>
  );
}
