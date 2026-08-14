'use client';

import { Chip } from '@/components/ui/Surfaces';
import { ComboMeter, ScoreTicker } from '@/components/portal/Espectaculo';
import { ElevatorDisplay } from '@/components/portal/Estructuras';
import { GAME } from '@/domain/copy/ui';
import { COMBO_LABELS } from '@/domain/copy/streaks';
import { comboLevel, type GameState, type GhostRun } from '@/domain/engine/state';
import { getGameFormat } from '@/domain/rounds/formats';

/**
 * MARCADOR PERMANENTE — puntos, combo, ronda, progreso y fantasma.
 *
 * En las rondas con `progressStyle: 'ascensor'` el progreso se dibuja como el ascensor
 * del portal subiendo plantas: un acierto sube, un fallo lo para. Es el mismo dato que
 * en el resto de rondas, contado en el idioma del edificio.
 */
export function Hud({ state, ghost }: { state: GameState; ghost?: GhostRun | undefined }) {
  const format = getGameFormat(state.config.formatId);
  const totalQuestions = format.rounds.reduce((sum, round) => sum + round.questionCount, 0);
  const round = state.rounds[state.roundIndex];
  const definicion = format.rounds[state.roundIndex];
  const shown = Math.min(state.questionIndex + 1, totalQuestions);
  const nivel = comboLevel(state.streak.current);

  // Fantasma: puntuación que llevaba tu récord a estas alturas de la partida.
  const puntosFantasma =
    ghost && ghost.trail.length > 0
      ? (ghost.trail[Math.min(state.questionIndex, ghost.trail.length - 1)] ?? 0)
      : null;
  const diferencia = puntosFantasma === null ? null : state.score - puntosFantasma;

  return (
    <div className="azulejo sticky top-0 z-20 border-b-2">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2">
        <div className="flex items-baseline gap-2">
          <span className="texto-sello text-verde-portal/80">{GAME.score}</span>
          <ScoreTicker valor={state.score} className="text-2xl text-verde-portal sm:text-3xl" />
          {nivel > 0 ? <ComboMeter combo={state.streak.current} titulo={COMBO_LABELS[nivel]} /> : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {definicion?.progressStyle === 'ascensor' && round ? (
            <ElevatorDisplay
              planta={round.floor}
              plantas={round.questionCount}
              averiado={round.stalled && round.answered > 0}
              compacto
            />
          ) : (
            <Chip>
              {GAME.round} {state.roundIndex + 1}/{format.rounds.length}
            </Chip>
          )}
          <Chip>
            {GAME.question} {shown}/{totalQuestions}
          </Chip>
        </div>
      </div>

      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-3 pb-1.5">
        {round ? (
          <p className="texto-sello truncate text-verde-portal/80">
            {definicion?.icon ? <span aria-hidden>{definicion.icon} </span> : null}
            {round.title}
          </p>
        ) : (
          <span />
        )}

        {diferencia !== null ? (
          <p
            className="texto-sello text-[0.6rem]"
            title={`Tu récord llevaba ${puntosFantasma} puntos a estas alturas`}
          >
            <span className="text-verde-portal/80">Tu récord: {puntosFantasma}</span>{' '}
            <span
              className={
                diferencia >= 0 ? 'font-bold text-verde-portal' : 'font-bold text-rojo-buzon'
              }
            >
              ({diferencia >= 0 ? '+' : ''}
              {diferencia})
            </span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
