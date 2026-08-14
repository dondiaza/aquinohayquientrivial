/**
 * DIRECTOR DE PARTIDA — decide CUÁNDO pasa algo especial.
 *
 * El objetivo es que la partida no sea monótona y, a la vez, que los momentos especiales
 * se sientan especiales. Un dado tirado cada 20 segundos consigue lo contrario: cansa y
 * quita valor a los sucesos.
 *
 * Reglas (todas puras y testeables):
 *
 *   1. Nunca antes de la segunda pregunta ni en la ronda final: la partida necesita
 *      arrancar y el final ya tiene su propia ceremonia.
 *   2. Enfriamiento: mínimo 2 preguntas entre sucesos.
 *   3. La probabilidad base la marca la ronda, y se ajusta al contexto:
 *      · racha alta → un poco más probable (premiar el momento caliente);
 *      · rendimiento bajo → menos probable (no pisar a quien va mal);
 *      · sequía larga → más probable (evitar monotonía).
 *   4. Los sucesos con castigo solo salen si el jugador va bien; los que ayudan, cuando
 *      va mal. Así el director nunca decide la partida en tu contra.
 */

import { pickWeighted, type Rng } from '../rng';
import { GAME_EVENT_LIST, type GameEventDefinition, type GameEventId } from './game-events';

export type ContextoDirector = {
  /** Índice global de la pregunta que va a empezar (0 = primera). */
  questionIndex: number;
  /** Probabilidad base de la ronda (0..1). */
  roundEventChance: number;
  /** ¿Es la ronda final? */
  isFinalRound: boolean;
  /** Preguntas transcurridas desde el último suceso (grande si no ha habido ninguno). */
  questionsSinceEvent: number;
  /** Racha actual de aciertos. */
  streak: number;
  /** Tasa de acierto reciente (0..1) — últimas respuestas. */
  recentAccuracy: number;
  /** Sucesos ya vistos en esta partida (para no repetir en exceso). */
  seenEvents: readonly GameEventId[];
};

export const DIRECTOR = {
  /** Antes de esta pregunta no hay sucesos. */
  primeraPreguntaConSucesos: 2,
  /** Preguntas mínimas entre dos sucesos. */
  enfriamiento: 2,
  /** A partir de esta sequía, el director empuja. */
  sequiaQueEmpuja: 5,
  /** Ajustes de probabilidad. */
  bonusRacha: 0.15,
  penalizacionMalaRacha: 0.12,
  bonusSequia: 0.12,
  /** A partir de aquí se considera que el jugador «va bien». */
  umbralVaBien: 0.5,
  /** Por debajo de aquí, «va mal». */
  umbralVaMal: 0.4,
} as const;

/** Probabilidad final de disparar un suceso en este momento (0 = imposible). */
export function probabilidadDeSuceso(contexto: ContextoDirector): number {
  if (contexto.isFinalRound) return 0;
  if (contexto.questionIndex < DIRECTOR.primeraPreguntaConSucesos) return 0;
  if (contexto.questionsSinceEvent < DIRECTOR.enfriamiento) return 0;
  if (contexto.roundEventChance <= 0) return 0;

  let probabilidad = contexto.roundEventChance;

  if (contexto.streak >= 3) probabilidad += DIRECTOR.bonusRacha;
  if (contexto.recentAccuracy < DIRECTOR.umbralVaMal) probabilidad -= DIRECTOR.penalizacionMalaRacha;
  if (contexto.questionsSinceEvent >= DIRECTOR.sequiaQueEmpuja) probabilidad += DIRECTOR.bonusSequia;

  return Math.max(0, Math.min(0.9, Math.round(probabilidad * 100) / 100));
}

/** ¿Qué sucesos son admisibles con este contexto? */
export function sucesosCandidatos(contexto: ContextoDirector): GameEventDefinition[] {
  const vaBien = contexto.recentAccuracy >= DIRECTOR.umbralVaBien;
  const vaMal = contexto.recentAccuracy < DIRECTOR.umbralVaMal;

  const candidatos = GAME_EVENT_LIST.filter((suceso) => {
    if (suceso.soloSiVaBien && !vaBien) return false;
    if (suceso.soloSiVaMal && !vaMal) return false;
    return true;
  });

  // Se evita repetir lo ya visto, salvo que no quede nada nuevo.
  const nuevos = candidatos.filter((suceso) => !contexto.seenEvents.includes(suceso.id));
  return nuevos.length > 0 ? nuevos : candidatos;
}

export type DecisionDirector = {
  /** El suceso elegido, o null si no toca. */
  suceso: GameEventDefinition | null;
  /** Probabilidad que se ha usado (para depurar y para los tests). */
  probabilidad: number;
};

/**
 * Decide si aparece un suceso y cuál. Determinista con el RNG de la partida: la misma
 * semilla produce la misma dirección artística.
 */
export function dirigirSuceso(contexto: ContextoDirector, rng: Rng): DecisionDirector {
  const probabilidad = probabilidadDeSuceso(contexto);
  if (probabilidad <= 0) return { suceso: null, probabilidad };
  if (rng.next() >= probabilidad) return { suceso: null, probabilidad };

  const candidatos = sucesosCandidatos(contexto);
  if (candidatos.length === 0) return { suceso: null, probabilidad };

  const elegido = pickWeighted(candidatos, (suceso) => suceso.weight, rng) ?? null;
  return { suceso: elegido, probabilidad };
}
