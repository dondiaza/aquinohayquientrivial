/**
 * POWER-UPS — sistema extensible: definición + inventario + efecto.
 *
 * El motor no sabe qué hace cada power-up: pregunta a la definición si se puede usar
 * (`isCompatible`) y le pide un EFECTO (`resolveEffect`), que sí sabe aplicar. Añadir
 * un power-up en Fase 2 es añadir una definición aquí y, si hace falta, un tipo de
 * efecto nuevo en `PowerUpEffect`.
 *
 * Fase 1 trae dos:
 *   · UN POQUITO DE POR FAVOR → suma tiempo a la pregunta actual.
 *   · RADIO PATIO             → descarta una respuesta incorrecta.
 */

import type { Rng } from '../rng';
import { questionTypeMeta } from '../questions/registry';
import { wrongOptionIds, type Question } from '../questions/types';

export const POWER_UP_IDS = ['UN_POQUITO_DE_POR_FAVOR', 'RADIO_PATIO'] as const;
export type PowerUpId = (typeof POWER_UP_IDS)[number];

export type PowerUpEffect =
  | { kind: 'ADD_TIME'; seconds: number }
  | { kind: 'ELIMINATE_OPTION'; optionId: string };

export type PowerUpContext = {
  question: Question;
  /** Opciones ya descartadas en esta pregunta. */
  eliminatedOptionIds: readonly string[];
  /** ¿La respuesta ya está bloqueada? */
  answerLocked: boolean;
};

export type PowerUpDefinition = {
  id: PowerUpId;
  label: string;
  description: string;
  /** Frase corta para el botón. */
  short: string;
  icon: string;
  /** Cargas iniciales por partida. */
  defaultCharges: number;
  /** ¿Tiene sentido este power-up en esta pregunta y en este momento? */
  isCompatible: (context: PowerUpContext) => boolean;
  /** Efecto concreto a aplicar. `null` si no procede. */
  resolveEffect: (context: PowerUpContext, rng: Rng) => PowerUpEffect | null;
};

export const EXTRA_TIME_SECONDS = 10;

export const POWER_UPS: Record<PowerUpId, PowerUpDefinition> = {
  UN_POQUITO_DE_POR_FAVOR: {
    id: 'UN_POQUITO_DE_POR_FAVOR',
    label: 'Un poquito de por favor',
    description: `Pide calma al portal y gana ${EXTRA_TIME_SECONDS} segundos en esta pregunta.`,
    short: `+${EXTRA_TIME_SECONDS}s`,
    icon: '🙏',
    defaultCharges: 2,
    isCompatible: (context) => !context.answerLocked,
    resolveEffect: (context) =>
      context.answerLocked ? null : { kind: 'ADD_TIME', seconds: EXTRA_TIME_SECONDS },
  },
  RADIO_PATIO: {
    id: 'RADIO_PATIO',
    label: 'Radio Patio',
    description: 'Alguien te sopla desde el rellano: se descarta una respuesta incorrecta.',
    short: 'Descarta una',
    icon: '📡',
    defaultCharges: 2,
    isCompatible: (context) => {
      if (context.answerLocked) return false;
      if (!questionTypeMeta(context.question.type).supportsOptionElimination) return false;
      return remainingWrongOptions(context).length > 0;
    },
    resolveEffect: (context, rng) => {
      const candidates = remainingWrongOptions(context);
      if (candidates.length === 0) return null;
      const index = rng.int(0, candidates.length - 1);
      const optionId = candidates[index];
      return optionId ? { kind: 'ELIMINATE_OPTION', optionId } : null;
    },
  },
};

/**
 * Opciones incorrectas que quedan por descartar, dejando siempre al menos una
 * incorrecta en pie: descartar todas convertiría la pregunta en trivial.
 */
function remainingWrongOptions(context: PowerUpContext): string[] {
  const wrong = wrongOptionIds(context.question);
  const remaining = wrong.filter((id) => !context.eliminatedOptionIds.includes(id));
  return remaining.length <= 1 ? [] : remaining;
}

export const POWER_UP_LIST: PowerUpDefinition[] = Object.values(POWER_UPS);

export function getPowerUp(id: PowerUpId): PowerUpDefinition {
  return POWER_UPS[id];
}

// ── Inventario ──────────────────────────────────────────────────────────────────

export type PowerUpInventory = Record<PowerUpId, number>;

export function createInventory(overrides: Partial<PowerUpInventory> = {}): PowerUpInventory {
  const inventory = {} as PowerUpInventory;
  for (const definition of POWER_UP_LIST) {
    inventory[definition.id] = overrides[definition.id] ?? definition.defaultCharges;
  }
  return inventory;
}

export function chargesOf(inventory: PowerUpInventory, id: PowerUpId): number {
  return inventory[id] ?? 0;
}

export type PowerUpAvailability =
  | { ok: true }
  | { ok: false; reason: 'NO_CHARGES' | 'NOT_COMPATIBLE' | 'ANSWER_LOCKED' };

export function canUsePowerUp(
  id: PowerUpId,
  inventory: PowerUpInventory,
  context: PowerUpContext,
): PowerUpAvailability {
  if (chargesOf(inventory, id) <= 0) return { ok: false, reason: 'NO_CHARGES' };
  if (context.answerLocked) return { ok: false, reason: 'ANSWER_LOCKED' };
  if (!getPowerUp(id).isCompatible(context)) return { ok: false, reason: 'NOT_COMPATIBLE' };
  return { ok: true };
}

export function spendCharge(inventory: PowerUpInventory, id: PowerUpId): PowerUpInventory {
  return { ...inventory, [id]: Math.max(0, chargesOf(inventory, id) - 1) };
}

export const POWER_UP_UNAVAILABLE_REASONS: Record<
  Exclude<PowerUpAvailability, { ok: true }>['reason'],
  string
> = {
  NO_CHARGES: 'No te quedan usos',
  NOT_COMPATIBLE: 'Aquí no sirve',
  ANSWER_LOCKED: 'Ya has respondido',
};
