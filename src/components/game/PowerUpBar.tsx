'use client';

import {
  POWER_UP_LIST,
  POWER_UP_UNAVAILABLE_REASONS,
  canUsePowerUp,
  chargesOf,
  type PowerUpId,
} from '@/domain/powerups/powerups';
import { GAME } from '@/domain/copy/ui';
import type { ActiveQuestion, GameState } from '@/domain/engine/state';

/**
 * Comodines. La barra no sabe qué hace cada uno: pregunta al dominio si se puede usar
 * y muestra el motivo cuando no. Añadir un power-up en Fase 2 no toca este componente.
 */
export function PowerUpBar({
  state,
  active,
  onUse,
}: {
  state: GameState;
  active: ActiveQuestion | undefined;
  onUse: (id: PowerUpId) => void;
}) {
  return (
    <div>
      <p className="texto-sello mb-1 text-tinta-suave">{GAME.powerUps}</p>
      <div className="flex flex-wrap gap-2">
        {POWER_UP_LIST.map((powerUp) => {
          const charges = chargesOf(state.inventory, powerUp.id);
          const availability = active
            ? canUsePowerUp(powerUp.id, state.inventory, {
                question: active.question,
                eliminatedOptionIds: active.eliminatedOptionIds,
                answerLocked: state.phase !== 'QUESTION' && state.phase !== 'FINAL_ROUND',
                usedThisQuestion: active.powerUpsUsed,
                cluesRevealed: active.cluesRevealed,
                hasWager: active.wager > 0 || state.phase === 'FINAL_ROUND',
                powerUpsBlocked: active.powerUpsBlocked,
              })
            : ({ ok: false, reason: 'ANSWER_LOCKED' } as const);

          const reason = availability.ok ? null : POWER_UP_UNAVAILABLE_REASONS[availability.reason];

          return (
            <button
              key={powerUp.id}
              type="button"
              className="btn btn-mostaza btn-sm"
              disabled={!availability.ok}
              onClick={() => onUse(powerUp.id)}
              title={reason ? `${powerUp.description} — ${reason}` : powerUp.description}
            >
              <span aria-hidden>{powerUp.icon}</span>
              <span className="hidden sm:inline">{powerUp.label}</span>
              <span className="sm:hidden">{powerUp.short}</span>
              <span className="chip ml-1 border-tinta">{charges}</span>
              <span className="sr-only">
                {powerUp.description}
                {reason ? ` (no disponible: ${reason})` : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
