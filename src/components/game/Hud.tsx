'use client';

import { Chip } from '@/components/ui/Surfaces';
import { GAME } from '@/domain/copy/ui';
import { STREAK_LABEL } from '@/domain/copy/streaks';
import { currentMilestone } from '@/domain/streaks/streaks';
import { getGameFormat } from '@/domain/rounds/formats';
import type { GameState } from '@/domain/engine/state';

/** Marcador permanente: puntos, racha, ronda y progreso. Pegado arriba en móvil. */
export function Hud({ state }: { state: GameState }) {
  const format = getGameFormat(state.config.formatId);
  const totalQuestions = format.rounds.reduce((sum, round) => sum + round.questionCount, 0);
  const round = state.rounds[state.roundIndex];
  const milestone = currentMilestone(state.streak.current);
  const shown = Math.min(state.questionIndex + 1, totalQuestions);

  return (
    <div className="azulejo sticky top-0 z-20 border-b-2">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2">
        <div className="flex items-baseline gap-2">
          <span className="texto-sello text-verde-portal/80">{GAME.score}</span>
          <span className="marcador text-2xl text-verde-portal sm:text-3xl" aria-live="polite">
            {state.score}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {state.streak.current >= 2 ? (
            <Chip className="border-rojo-buzon bg-mostaza text-rojo-buzon" title={milestone?.line}>
              🔥 {STREAK_LABEL} {state.streak.current}
            </Chip>
          ) : null}
          <Chip>
            {GAME.round} {state.roundIndex + 1}/{format.rounds.length}
          </Chip>
          <Chip>
            {GAME.question} {shown}/{totalQuestions}
          </Chip>
        </div>
      </div>

      {round ? (
        <div className="mx-auto max-w-3xl px-3 pb-1.5">
          <p className="texto-sello truncate text-verde-portal/80">{round.title}</p>
        </div>
      ) : null}
    </div>
  );
}
