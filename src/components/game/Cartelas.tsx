'use client';

import { Chip, Nota, Papel, Placa } from '@/components/ui/Surfaces';
import { GAME } from '@/domain/copy/ui';
import { getGameEvent } from '@/domain/events/game-events';
import { getDifficultyLevel } from '@/domain/difficulty/levels';
import { categoryLabel } from '@/domain/questions/categories';
import { getGameFormat, type RoundDefinition } from '@/domain/rounds/formats';
import { questionTypeMeta } from '@/domain/questions/registry';
import type { GameState, RoundProgress } from '@/domain/engine/state';

/** INTRO: cartela de apertura, para que la partida no empiece en frío. */
export function IntroCartela({ state, onStart }: { state: GameState; onStart: () => void }) {
  const format = getGameFormat(state.config.formatId);
  const level = getDifficultyLevel(state.config.difficultyId);
  const total = format.rounds.reduce((sum, round) => sum + round.questionCount, 0);

  return (
    <div className="space-y-4 text-center">
      <Placa className="px-5 py-6 pt-8">
        <p className="texto-sello text-mostaza-claro">Travesía del Portalón, 13</p>
        <h1 className="mt-1 text-3xl sm:text-5xl">{GAME.introTitle}</h1>
      </Placa>

      <Papel className="p-4 text-left">
        <p className="text-sm text-tinta-suave">{GAME.introLine}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          <Chip>{format.label}</Chip>
          <Chip>{format.estimatedMinutes}</Chip>
          <Chip>{total} preguntas</Chip>
          <Chip>Dificultad {level.label}</Chip>
          <Chip>{categoryLabel(state.config.category)}</Chip>
          {state.config.adaptiveDifficulty ? <Chip>Adaptativa</Chip> : <Chip>Fija</Chip>}
        </div>
        <ol className="mt-4 space-y-1 text-sm">
          {format.rounds.map((round, index) => (
            <li key={round.id} className="flex items-baseline gap-2">
              <span className="texto-sello text-tinta-tenue">{index + 1}</span>
              <span className="font-semibold">{round.title}</span>
              <span className="text-tinta-tenue">· {round.questionCount}</span>
            </li>
          ))}
        </ol>
      </Papel>

      <button type="button" className="btn btn-rojo btn-xl w-full" onClick={onStart} autoFocus>
        ▶ {GAME.introCta}
      </button>
    </div>
  );
}

/** ROUND_INTRO: cartela de ronda con sus tipos de prueba y modificadores. */
export function RoundIntroCartela({
  round,
  roundIndex,
  totalRounds,
  onStart,
}: {
  round: RoundDefinition;
  roundIndex: number;
  totalRounds: number;
  onStart: () => void;
}) {
  return (
    <div className="space-y-4">
      <Placa tone={round.isFinal ? 'roja' : 'verde'} className="px-5 py-5 pt-7">
        <p className="texto-sello text-mostaza-claro">
          {GAME.round} {roundIndex + 1} de {totalRounds}
        </p>
        <h2 className="mt-1 text-3xl sm:text-4xl">{round.title}</h2>
        <p className="texto-sello mt-2 normal-case">{round.subtitle}</p>
      </Placa>

      <Nota tone="papel" tilt="izq" pin="cinta" className="p-4 pt-5">
        <p className="text-base">{round.line}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip>{round.questionCount} preguntas</Chip>
          {round.allowedTypes.map((type) => (
            <Chip key={type}>{questionTypeMeta(type).short}</Chip>
          ))}
          {(round.modifiers ?? []).map((modifier) => (
            <Chip key={modifier.id} className="border-rojo-buzon text-rojo-buzon">
              {modifier.label} ×{modifier.multiplier}
            </Chip>
          ))}
          {round.timeScale && round.timeScale !== 1 ? (
            <Chip className="border-azul-telefonillo text-azul-telefonillo">
              Tiempo ×{round.timeScale}
            </Chip>
          ) : null}
        </div>
      </Nota>

      <button type="button" className="btn btn-verde btn-lg w-full" onClick={onStart} autoFocus>
        {GAME.startRound}
      </button>
    </div>
  );
}

/** EVENT: la cartela del suceso que altera la siguiente pregunta. */
export function EventCartela({
  eventId,
  onContinue,
}: {
  eventId: Parameters<typeof getGameEvent>[0];
  onContinue: () => void;
}) {
  const event = getGameEvent(eventId);
  const tone = event.accent === 'rojo' ? 'mostaza' : event.accent === 'azul' ? 'azul' : 'mostaza';

  return (
    <div className="space-y-4">
      <Nota tone={tone} tilt="der" pin="chincheta" className="p-5 pt-6 text-center">
        <p aria-hidden className="text-5xl">
          {event.icon}
        </p>
        <h2 className="mt-2 text-3xl">{event.title}</h2>
        <p className="mt-2 text-sm text-tinta-suave">{event.line}</p>
        <p className="texto-cartel mt-3 border-2 border-tinta bg-papel px-3 py-2 text-base">
          {event.consequence}
        </p>
      </Nota>

      <button type="button" className="btn btn-rojo btn-lg w-full" onClick={onContinue} autoFocus>
        {GAME.continue}
      </button>
    </div>
  );
}

/** ROUND_RESULTS: cierre de ronda con lo conseguido. */
export function RoundResultsCartela({
  progress,
  isLastRound,
  totalScore,
  onNext,
}: {
  progress: RoundProgress;
  isLastRound: boolean;
  totalScore: number;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <Placa className="px-5 py-5 pt-7">
        <p className="texto-sello text-mostaza-claro">Fin de la ronda</p>
        <h2 className="mt-1 text-3xl sm:text-4xl">{progress.title}</h2>
      </Placa>

      <Papel className="p-4">
        <dl className="grid grid-cols-3 gap-3 text-center">
          <div>
            <dt className="texto-sello text-tinta-tenue">Aciertos</dt>
            <dd className="marcador text-2xl">
              {progress.correct}/{progress.answered}
            </dd>
          </div>
          <div>
            <dt className="texto-sello text-tinta-tenue">Puntos ronda</dt>
            <dd className="marcador text-2xl">{progress.points}</dd>
          </div>
          <div>
            <dt className="texto-sello text-tinta-tenue">Total</dt>
            <dd className="marcador text-2xl text-verde-portal">{totalScore}</dd>
          </div>
        </dl>
      </Papel>

      <button type="button" className="btn btn-verde btn-lg w-full" onClick={onNext} autoFocus>
        {isLastRound ? GAME.finish : GAME.continue}
      </button>
    </div>
  );
}
