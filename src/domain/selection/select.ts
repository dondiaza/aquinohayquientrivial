/**
 * SELECCIÓN DE PREGUNTAS — pura y determinista (mismo pool + misma semilla = misma partida).
 *
 * Garantía dura: NUNCA se repite una pregunta dentro de la misma partida. `excludeIds`
 * no se relaja jamás.
 *
 * Si con los filtros pedidos no queda nada, se relajan EN ESTE ORDEN y se informa de
 * ello en el resultado (`relaxed`), para que el motor pueda registrarlo:
 *
 *   1. se amplía la ventana de dificultad,
 *   2. se ignora la categoría,
 *   3. se ignoran los tipos permitidos,
 *   4. se admite repetir el HECHO (no la pregunta) preguntado de otra forma.
 *
 * Dos filtros NUNCA se relajan, porque son promesas al jugador y no preferencias:
 *
 *   · `excludeIds` — una pregunta no se repite dentro de la misma partida;
 *   · `sinSpoilers` — si el jugador ha pedido no destriparse la serie, no se le destripa.
 *
 * Solo devuelve `undefined` cuando el pool está realmente agotado.
 */

import { pickWeighted, type Rng } from '../rng';
import { CATEGORY_MIX, type CategorySelection } from '../questions/categories';
import type { Question, QuestionType } from '../questions/types';

export type SelectionCriteria = {
  targetDifficulty: number;
  allowedTypes?: readonly QuestionType[];
  category?: CategorySelection;
  excludeIds?: ReadonlySet<string>;
  /**
   * Huellas de hechos ya preguntados. El pack trae el mismo dato en tres formas
   * (escrita, opción múltiple y verdadero/falso): esto evita que salgan dos en la misma
   * partida, que es la sensación de «esta ya me la has preguntado».
   */
  excludeFactKeys?: ReadonlySet<string>;
  /** true = fuera las preguntas marcadas como destripe grave. */
  sinSpoilers?: boolean;
  /** Ventana de dificultad aceptable alrededor del objetivo. */
  difficultyWindow?: number;
  /** Cuántos candidatos entran en el sorteo ponderado. */
  candidatePoolSize?: number;
};

export type SelectionResult = {
  question: Question;
  /** Qué filtros hubo que relajar para encontrarla. */
  relaxed: ('difficulty' | 'category' | 'type' | 'fact')[];
  /** Distancia entre la dificultad de la pregunta y la objetivo. */
  distance: number;
};

export const SELECTION_DEFAULTS = {
  difficultyWindow: 2,
  candidatePoolSize: 6,
} as const;

function isPlayable(question: Question): boolean {
  return question.status === 'ACTIVE' && question.needsReview !== true;
}

function matchesCategory(question: Question, category: CategorySelection | undefined): boolean {
  if (!category || category === CATEGORY_MIX) return true;
  return question.category === category;
}

function matchesType(question: Question, allowedTypes: readonly QuestionType[] | undefined): boolean {
  if (!allowedTypes || allowedTypes.length === 0) return true;
  return allowedTypes.includes(question.type);
}

export function eligibleQuestions(
  pool: readonly Question[],
  criteria: SelectionCriteria,
  ignore: { difficulty?: boolean; category?: boolean; type?: boolean; fact?: boolean } = {},
): Question[] {
  const window = criteria.difficultyWindow ?? SELECTION_DEFAULTS.difficultyWindow;
  const exclude = criteria.excludeIds;
  const huellas = criteria.excludeFactKeys;

  return pool.filter((question) => {
    if (!isPlayable(question)) return false;
    if (exclude?.has(question.id)) return false;
    if (criteria.sinSpoilers && question.spoiler === 'major') return false;
    if (!ignore.fact && question.factKey && huellas?.has(question.factKey)) return false;
    if (!ignore.type && !matchesType(question, criteria.allowedTypes)) return false;
    if (!ignore.category && !matchesCategory(question, criteria.category)) return false;
    if (!ignore.difficulty && Math.abs(question.difficulty - criteria.targetDifficulty) > window) {
      return false;
    }
    return true;
  });
}

/** Elige una pregunta cercana a la dificultad objetivo, con algo de variedad. */
export function selectQuestion(
  pool: readonly Question[],
  criteria: SelectionCriteria,
  rng: Rng,
): SelectionResult | undefined {
  const attempts: {
    ignore: { difficulty?: boolean; category?: boolean; type?: boolean; fact?: boolean };
    relaxed: SelectionResult['relaxed'];
  }[] = [
    { ignore: {}, relaxed: [] },
    { ignore: { difficulty: true }, relaxed: ['difficulty'] },
    { ignore: { difficulty: true, category: true }, relaxed: ['difficulty', 'category'] },
    { ignore: { difficulty: true, category: true, type: true }, relaxed: ['difficulty', 'category', 'type'] },
    {
      ignore: { difficulty: true, category: true, type: true, fact: true },
      relaxed: ['difficulty', 'category', 'type', 'fact'],
    },
  ];

  for (const attempt of attempts) {
    const candidates = eligibleQuestions(pool, criteria, attempt.ignore);
    if (candidates.length === 0) continue;

    const ranked = [...candidates].sort((a, b) => {
      const distanceA = Math.abs(a.difficulty - criteria.targetDifficulty);
      const distanceB = Math.abs(b.difficulty - criteria.targetDifficulty);
      if (distanceA !== distanceB) return distanceA - distanceB;
      return a.id < b.id ? -1 : 1;
    });

    const shortlist = ranked.slice(0, criteria.candidatePoolSize ?? SELECTION_DEFAULTS.candidatePoolSize);
    const chosen = pickWeighted(
      shortlist,
      (question) => 1 / (1 + Math.abs(question.difficulty - criteria.targetDifficulty)),
      rng,
    );
    if (!chosen) continue;

    return {
      question: chosen,
      relaxed: attempt.relaxed,
      distance: Math.abs(chosen.difficulty - criteria.targetDifficulty),
    };
  }

  return undefined;
}

/**
 * Elige `count` preguntas distintas de una tacada (para una ronda completa).
 * Útil para pre-visualizar una ronda o para modos futuros sin adaptación.
 */
export function selectQuestions(
  pool: readonly Question[],
  criteria: SelectionCriteria & { count: number },
  rng: Rng,
): Question[] {
  const used = new Set(criteria.excludeIds ?? []);
  const huellas = new Set(criteria.excludeFactKeys ?? []);
  const result: Question[] = [];

  for (let index = 0; index < criteria.count; index += 1) {
    const selection = selectQuestion(
      pool,
      { ...criteria, excludeIds: used, excludeFactKeys: huellas },
      rng,
    );
    if (!selection) break;
    used.add(selection.question.id);
    if (selection.question.factKey) huellas.add(selection.question.factKey);
    result.push(selection.question);
  }

  return result;
}

/** Huellas de hecho de las preguntas ya usadas. Lo necesita el motor en cada selección. */
export function factKeysOf(pool: readonly Question[], usedIds: readonly string[]): Set<string> {
  const usados = new Set(usedIds);
  const huellas = new Set<string>();
  for (const question of pool) {
    if (usados.has(question.id) && question.factKey) huellas.add(question.factKey);
  }
  return huellas;
}
