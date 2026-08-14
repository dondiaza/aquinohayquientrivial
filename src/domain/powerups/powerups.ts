/**
 * POWER-UPS — sistema extensible: definición + inventario + efecto.
 *
 * El motor no sabe qué hace cada power-up: pregunta a la definición si se puede usar
 * (`isCompatible`) y le pide un EFECTO (`resolveEffect`), que sí sabe aplicar.
 *
 * Equilibrio (Fase 2, §12):
 *   · Los comunes tienen varias cargas; los raros, una.
 *   · Como máximo DOS comodines por pregunta (`MAX_COMODINES_POR_PREGUNTA`): sin esto,
 *     apilar tiempo + multiplicador + riesgo en la misma pregunta rompe la puntuación.
 *   · Cada uno declara en qué tipos tiene sentido, así que no hay usos absurdos
 *     (descartar opciones en un verdadero/falso, proteger una apuesta que no existe…).
 */

import type { Rng } from '../rng';
import { questionTypeMeta } from '../questions/registry';
import { wrongOptionIds, type Question } from '../questions/types';

export const POWER_UP_IDS = [
  'UN_POQUITO_DE_POR_FAVOR',
  'RADIO_PATIO',
  'JUNTA_EXTRAORDINARIA',
  'SE_HA_IDO_LA_LUZ',
  'CAMBIO_DE_PRESIDENTE',
  'FONDO_DE_RESERVA',
] as const;

export type PowerUpId = (typeof POWER_UP_IDS)[number];

export type Rareza = 'comun' | 'curioso' | 'raro' | 'legendario';

export type PowerUpEffect =
  | { kind: 'ADD_TIME'; seconds: number }
  | { kind: 'ELIMINATE_OPTION'; optionId: string }
  | { kind: 'REVEAL_CLUE' }
  | { kind: 'ADD_MULTIPLIER'; id: string; label: string; multiplier: number }
  | { kind: 'RISK_MODE'; multiplier: number }
  | { kind: 'SWAP_QUESTION' }
  | { kind: 'PROTECT_WAGER'; ratio: number };

export type PowerUpContext = {
  question: Question;
  /** Opciones ya descartadas en esta pregunta. */
  eliminatedOptionIds: readonly string[];
  /** ¿La respuesta ya está bloqueada? */
  answerLocked: boolean;
  /** Comodines ya usados en esta pregunta. */
  usedThisQuestion: readonly PowerUpId[];
  /** Pistas reveladas / totales (¿QUIÉN ES?). */
  cluesRevealed?: number;
  /** ¿Estamos en una pregunta con apuesta? */
  hasWager?: boolean;
  /** ¿El suceso activo bloquea los comodines? */
  powerUpsBlocked?: boolean;
};

export type PowerUpDefinition = {
  id: PowerUpId;
  label: string;
  description: string;
  /** Frase corta para el botón. */
  short: string;
  icon: string;
  rareza: Rareza;
  /** Cargas iniciales por partida. */
  defaultCharges: number;
  /** ¿Tiene sentido este power-up en esta pregunta y en este momento? */
  isCompatible: (context: PowerUpContext) => boolean;
  /** Efecto concreto a aplicar. `null` si no procede. */
  resolveEffect: (context: PowerUpContext, rng: Rng) => PowerUpEffect | null;
};

export const EXTRA_TIME_SECONDS = 5;
export const MAX_COMODINES_POR_PREGUNTA = 2;
export const MULTIPLICADOR_JUNTA = 2;
export const MULTIPLICADOR_RIESGO = 3;
export const PROTECCION_FONDO = 0.5;

/**
 * Opciones incorrectas que quedan por descartar, dejando siempre al menos una
 * incorrecta en pie: descartar todas convertiría la pregunta en trivial.
 */
function remainingWrongOptions(context: PowerUpContext): string[] {
  const wrong = wrongOptionIds(context.question);
  const remaining = wrong.filter((id) => !context.eliminatedOptionIds.includes(id));
  return remaining.length <= 1 ? [] : remaining;
}

/** Reglas comunes: respuesta bloqueada, tope por pregunta y bloqueo por suceso. */
function usoBasicoPermitido(context: PowerUpContext): boolean {
  if (context.answerLocked) return false;
  if (context.powerUpsBlocked) return false;
  return context.usedThisQuestion.length < MAX_COMODINES_POR_PREGUNTA;
}

export const POWER_UPS: Record<PowerUpId, PowerUpDefinition> = {
  UN_POQUITO_DE_POR_FAVOR: {
    id: 'UN_POQUITO_DE_POR_FAVOR',
    label: 'Un poquito de por favor',
    description: `Pide calma al portal y gana ${EXTRA_TIME_SECONDS} segundos en esta pregunta.`,
    short: `+${EXTRA_TIME_SECONDS}s`,
    icon: '🙏',
    rareza: 'comun',
    defaultCharges: 3,
    isCompatible: (context) => usoBasicoPermitido(context),
    resolveEffect: (context) =>
      usoBasicoPermitido(context) ? { kind: 'ADD_TIME', seconds: EXTRA_TIME_SECONDS } : null,
  },

  RADIO_PATIO: {
    id: 'RADIO_PATIO',
    label: 'Radio Patio',
    description:
      'Alguien te sopla desde el rellano: descarta una respuesta incorrecta o te adelanta una pista.',
    short: 'Soplo',
    icon: '📡',
    rareza: 'comun',
    defaultCharges: 2,
    isCompatible: (context) => {
      if (!usoBasicoPermitido(context)) return false;
      if (context.question.type === 'WHO_IS_IT') {
        return (context.cluesRevealed ?? 0) < context.question.clues.length;
      }
      if (!questionTypeMeta(context.question.type).supportsOptionElimination) return false;
      return remainingWrongOptions(context).length > 0;
    },
    resolveEffect: (context, rng) => {
      if (!usoBasicoPermitido(context)) return null;
      // En ¿QUIÉN ES? el soplo es una pista más: descartar opciones sería menos temático.
      if (context.question.type === 'WHO_IS_IT') {
        return (context.cluesRevealed ?? 0) < context.question.clues.length
          ? { kind: 'REVEAL_CLUE' }
          : null;
      }
      const candidates = remainingWrongOptions(context);
      if (candidates.length === 0) return null;
      const optionId = candidates[rng.int(0, candidates.length - 1)];
      return optionId ? { kind: 'ELIMINATE_OPTION', optionId } : null;
    },
  },

  JUNTA_EXTRAORDINARIA: {
    id: 'JUNTA_EXTRAORDINARIA',
    label: 'Junta extraordinaria',
    description: `Convocas junta y esta pregunta pasa a valer ×${MULTIPLICADOR_JUNTA}.`,
    short: `×${MULTIPLICADOR_JUNTA}`,
    icon: '📣',
    rareza: 'curioso',
    defaultCharges: 1,
    isCompatible: (context) =>
      usoBasicoPermitido(context) && !context.usedThisQuestion.includes('SE_HA_IDO_LA_LUZ'),
    resolveEffect: (context) =>
      usoBasicoPermitido(context)
        ? {
            kind: 'ADD_MULTIPLIER',
            id: 'JUNTA_EXTRAORDINARIA',
            label: 'Junta extraordinaria',
            multiplier: MULTIPLICADOR_JUNTA,
          }
        : null,
  },

  SE_HA_IDO_LA_LUZ: {
    id: 'SE_HA_IDO_LA_LUZ',
    label: 'Se ha ido la luz',
    description: `A oscuras no se leen las respuestas, pero si aciertas vale ×${MULTIPLICADOR_RIESGO}.`,
    short: `A ciegas ×${MULTIPLICADOR_RIESGO}`,
    icon: '💡',
    rareza: 'raro',
    defaultCharges: 1,
    isCompatible: (context) => {
      if (!usoBasicoPermitido(context)) return false;
      if (context.usedThisQuestion.includes('JUNTA_EXTRAORDINARIA')) return false;
      // Solo tiene sentido donde hay texto que ocultar.
      return ['MULTIPLE_CHOICE', 'WHO_IS_IT', 'MEMORY_GRID', 'MISSING_ITEM', 'FINAL_BET'].includes(
        context.question.type,
      );
    },
    resolveEffect: (context) =>
      usoBasicoPermitido(context) ? { kind: 'RISK_MODE', multiplier: MULTIPLICADOR_RIESGO } : null,
  },

  CAMBIO_DE_PRESIDENTE: {
    id: 'CAMBIO_DE_PRESIDENTE',
    label: 'Cambio de presidente',
    description: 'Esta pregunta no te gusta: se cambia por otra distinta. Una vez por partida.',
    short: 'Otra',
    icon: '🔄',
    rareza: 'raro',
    defaultCharges: 1,
    isCompatible: (context) => usoBasicoPermitido(context) && context.usedThisQuestion.length === 0,
    resolveEffect: (context) =>
      usoBasicoPermitido(context) && context.usedThisQuestion.length === 0
        ? { kind: 'SWAP_QUESTION' }
        : null,
  },

  FONDO_DE_RESERVA: {
    id: 'FONDO_DE_RESERVA',
    label: 'Fondo de reserva',
    description: `Si pierdes la apuesta, la comunidad te cubre el ${Math.round(PROTECCION_FONDO * 100)} %.`,
    short: 'Protege',
    icon: '🏦',
    rareza: 'curioso',
    defaultCharges: 1,
    isCompatible: (context) => usoBasicoPermitido(context) && context.hasWager === true,
    resolveEffect: (context) =>
      usoBasicoPermitido(context) && context.hasWager
        ? { kind: 'PROTECT_WAGER', ratio: PROTECCION_FONDO }
        : null,
  },
};

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
  | {
      ok: false;
      reason: 'NO_CHARGES' | 'NOT_COMPATIBLE' | 'ANSWER_LOCKED' | 'LIMITE_POR_PREGUNTA' | 'BLOQUEADO';
    };

export function canUsePowerUp(
  id: PowerUpId,
  inventory: PowerUpInventory,
  context: PowerUpContext,
): PowerUpAvailability {
  if (chargesOf(inventory, id) <= 0) return { ok: false, reason: 'NO_CHARGES' };
  if (context.answerLocked) return { ok: false, reason: 'ANSWER_LOCKED' };
  if (context.powerUpsBlocked) return { ok: false, reason: 'BLOQUEADO' };
  if (context.usedThisQuestion.length >= MAX_COMODINES_POR_PREGUNTA) {
    return { ok: false, reason: 'LIMITE_POR_PREGUNTA' };
  }
  if (!getPowerUp(id).isCompatible(context)) return { ok: false, reason: 'NOT_COMPATIBLE' };
  return { ok: true };
}

export function spendCharge(inventory: PowerUpInventory, id: PowerUpId): PowerUpInventory {
  return { ...inventory, [id]: Math.max(0, chargesOf(inventory, id) - 1) };
}

export function grantCharge(inventory: PowerUpInventory, id: PowerUpId, cantidad = 1): PowerUpInventory {
  return { ...inventory, [id]: chargesOf(inventory, id) + cantidad };
}

export const POWER_UP_UNAVAILABLE_REASONS: Record<
  Exclude<PowerUpAvailability, { ok: true }>['reason'],
  string
> = {
  NO_CHARGES: 'No te quedan usos',
  NOT_COMPATIBLE: 'Aquí no sirve',
  ANSWER_LOCKED: 'Ya has respondido',
  LIMITE_POR_PREGUNTA: 'Máximo dos por pregunta',
  BLOQUEADO: 'El portero está de vacaciones',
};

export const RAREZAS: { id: Rareza; label: string }[] = [
  { id: 'comun', label: 'Común' },
  { id: 'curioso', label: 'Curioso' },
  { id: 'raro', label: 'Raro' },
  { id: 'legendario', label: 'Legendario' },
];
