'use client';

import { useState } from 'react';

import { Nota, Papel, Placa } from '@/components/ui/Surfaces';
import { GAME } from '@/domain/copy/ui';
import { maxWager } from '@/domain/scoring/scoring';
import type { ActiveQuestion } from '@/domain/engine/state';

const QUICK_FRACTIONS = [0.25, 0.5, 1] as const;

/**
 * FINAL_ROUND: pantalla de apuesta.
 *
 * Se apuesta ANTES de ver la pregunta (solo se ve el tipo de prueba y la dificultad),
 * que es lo que hace interesante la decisión. El máximo lo marca la propia pregunta
 * (`maxWagerRatio`) sobre el marcador actual.
 */
export function FinalBetSetup({
  active,
  score,
  esFinal = true,
  onPlaceBet,
}: {
  active: ActiveQuestion;
  score: number;
  /** true en «presidente por un día»; false en la derrama intermedia. */
  esFinal?: boolean;
  onPlaceBet: (wager: number) => void;
}) {
  const ratio = active.question.type === 'FINAL_BET' ? active.question.maxWagerRatio : 0.5;
  const cap = maxWager(score, ratio);
  const [wager, setWager] = useState(cap);

  return (
    <div className="space-y-4">
      <Placa tone={esFinal ? 'roja' : 'morada'} className="px-5 py-5 pt-7 text-center">
        <p aria-hidden className="text-4xl">
          {esFinal ? '🏛️' : '💸'}
        </p>
        <h2 className="mt-1 text-3xl sm:text-4xl">
          {esFinal ? 'Presidente por un día' : 'La derrama'}
        </h2>
        <p className="texto-sello mt-2 normal-case">
          {esFinal ? GAME.betTitle : 'Apuesta antes de ver la pregunta'}
        </p>
      </Placa>

      <Nota tone="papel" className="p-4">
        <p className="text-sm text-tinta-suave">{GAME.betHint}</p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-center">
          <div>
            <dt className="texto-sello text-tinta-tenue">Tus puntos</dt>
            <dd className="marcador text-2xl">{score}</dd>
          </div>
          <div>
            <dt className="texto-sello text-tinta-tenue">{GAME.betMax}</dt>
            <dd className="marcador text-2xl">{cap}</dd>
          </div>
        </dl>
      </Nota>

      <Papel className="p-4">
        <label className="etiqueta" htmlFor="wager">
          Cuánto apuestas
        </label>
        <input
          id="wager"
          type="range"
          min={0}
          max={cap}
          step={10}
          value={wager}
          onChange={(event) => setWager(Number.parseInt(event.target.value, 10))}
          className="w-full accent-rojo-buzon"
          disabled={cap === 0}
        />
        <p className="marcador mt-1 text-center text-4xl">{wager}</p>

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {QUICK_FRACTIONS.map((fraction) => (
            <button
              key={fraction}
              type="button"
              className="btn btn-papel btn-sm"
              onClick={() => setWager(Math.floor((cap * fraction) / 10) * 10)}
              disabled={cap === 0}
            >
              {fraction === 1 ? 'Todo' : `${fraction * 100} %`}
            </button>
          ))}
        </div>
      </Papel>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          className="btn btn-rojo btn-lg"
          onClick={() => onPlaceBet(wager)}
          disabled={cap === 0 || wager === 0}
          autoFocus
        >
          {GAME.betPlace}
        </button>
        <button type="button" className="btn btn-papel btn-lg" onClick={() => onPlaceBet(0)}>
          {GAME.betNone}
        </button>
      </div>

      {cap === 0 ? (
        <p className="texto-sello text-center text-tinta-tenue">
          Sin puntos que apostar: se juega la pregunta a pelo.
        </p>
      ) : null}
    </div>
  );
}
