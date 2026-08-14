/**
 * Utilidades para los tests: preguntas de mentira, un reloj falso y un "jugador
 * automático" capaz de terminar una partida entera contra el motor real.
 */

import { bet, escrita, imp, mc, ord, tf, who } from '@/content/builders';
import { assembleQuestion } from '@/domain/questions/schemas';
import { applyAction, createGameState, type EngineDeps } from '@/domain/engine/machine';
import type { GameAction } from '@/domain/engine/actions';
import type { GameConfig, GameState } from '@/domain/engine/state';
import type { EngineEvent } from '@/domain/engine/engine-events';
import type { CategoryId } from '@/domain/questions/categories';
import type {
  AnswerSubmission,
  FinalBetQuestion,
  ImpostorQuestion,
  MultipleChoiceQuestion,
  OrderChaosQuestion,
  Question,
  QuestionType,
  ShortAnswerQuestion,
  TrueFalseQuestion,
  WhoIsItQuestion,
} from '@/domain/questions/types';

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

/**
 * Estrecha una pregunta a su tipo concreto para que los tests puedan leer sus campos
 * sin `if` de narrowing. Comprueba en tiempo de ejecución antes de afirmar el tipo.
 */
function narrow<T extends QuestionType>(question: Question, type: T): Extract<Question, { type: T }> {
  if (question.type !== type) {
    throw new Error(`La pregunta ${question.id} es ${question.type}, se esperaba ${type}`);
  }
  return question as Extract<Question, { type: T }>;
}

export function makeMultipleChoice(overrides?: {
  id?: string;
  difficulty?: number;
  category?: CategoryId;
  timeLimitSeconds?: number;
  basePoints?: number;
}): MultipleChoiceQuestion {
  return narrow(
    assembleQuestion(
      mc({
      id: overrides?.id ?? nextId('mc'),
      prompt: '¿Quién es el presidente de la comunidad de Desengaño 21?',
      options: ['Juan Cuesta', 'Emilio Delgado', 'Mariano Delgado', 'Andrés Guerra'],
      correct: 0,
      difficulty: overrides?.difficulty ?? 5,
      category: overrides?.category ?? 'general',
        ...(overrides?.timeLimitSeconds ? { time: overrides.timeLimitSeconds } : {}),
        ...(overrides?.basePoints ? { points: overrides.basePoints } : {}),
      }),
    ),
    'MULTIPLE_CHOICE',
  );
}

export function makeTrueFalse(overrides?: {
  id?: string;
  difficulty?: number;
  answer?: boolean;
}): TrueFalseQuestion {
  return narrow(
    assembleQuestion(
      tf({
        id: overrides?.id ?? nextId('tf'),
        prompt: 'Emilio Delgado es el portero de Desengaño 21.',
        answer: overrides?.answer ?? true,
        difficulty: overrides?.difficulty ?? 4,
        category: 'general',
      }),
    ),
    'TRUE_FALSE',
  );
}

export function makeWhoIsIt(overrides?: {
  id?: string;
  difficulty?: number;
  clues?: string[];
}): WhoIsItQuestion {
  return narrow(
    assembleQuestion(
      who({
        id: overrides?.id ?? nextId('who'),
        prompt: '¿Quién es?',
        clues: overrides?.clues ?? [
          'Se asocia con el 1.º A',
          'Forma parte de Radio Patio',
          'La interpreta Mariví Bilbao',
        ],
        options: ['Marisa', 'Vicenta', 'Concha', 'Paloma'],
        correct: 0,
        difficulty: overrides?.difficulty ?? 6,
        category: 'personajes',
      }),
    ),
    'WHO_IS_IT',
  );
}

export function makeImpostor(overrides?: { id?: string; difficulty?: number }): ImpostorQuestion {
  return narrow(
    assembleQuestion(
      imp({
        id: overrides?.id ?? nextId('imp'),
        prompt: '¿Cuál no encaja entre los vecinos del 2.º A?',
        setLabel: 'Familia Cuesta',
        items: ['Juan', 'Paloma', 'Natalia', 'Mauri'],
        impostor: 3,
        difficulty: overrides?.difficulty ?? 5,
        category: 'lugares',
      }),
    ),
    'IMPOSTOR',
  );
}

export function makeOrderChaos(overrides?: { id?: string; difficulty?: number }): OrderChaosQuestion {
  return narrow(
    assembleQuestion(
      ord({
        id: overrides?.id ?? nextId('ord'),
        prompt: 'Ordena el desastre',
        steps: [
          'Llegan Lucía y Roberto al portal',
          'Entra la familia Guerra',
          'Las termitas fuerzan el desalojo',
        ],
        difficulty: overrides?.difficulty ?? 6,
        category: 'situaciones',
      }),
    ),
    'ORDER_CHAOS',
  );
}

export function makeFinalBet(overrides?: {
  id?: string;
  difficulty?: number;
  maxWagerRatio?: number;
}): FinalBetQuestion {
  return narrow(
    assembleQuestion(
      bet({
        id: overrides?.id ?? nextId('bet'),
        prompt: 'Apuesta final: ¿en qué año se estrenó la serie?',
        options: ['2003', '2001', '2006', '1999'],
        correct: 0,
        difficulty: overrides?.difficulty ?? 8,
        category: 'general',
        ...(overrides?.maxWagerRatio ? { maxWagerRatio: overrides.maxWagerRatio } : {}),
      }),
    ),
    'FINAL_BET',
  );
}

export function makeShortAnswer(overrides?: {
  id?: string;
  difficulty?: number;
  answer?: string;
}): ShortAnswerQuestion {
  return narrow(
    assembleQuestion(
      escrita({
        id: overrides?.id ?? nextId('esc'),
        prompt: '¿Qué actor interpreta a Juan Cuesta?',
        answer: overrides?.answer ?? 'José Luis Gil',
        accepted: ['Gil'],
        difficulty: overrides?.difficulty ?? 5,
        category: 'reparto',
      }),
    ),
    'SHORT_ANSWER',
  );
}

/** Banco variado y suficientemente grande para cualquier formato de partida. */
export function makePool(): Question[] {
  const pool: Question[] = [];
  for (let index = 0; index < 30; index += 1) {
    pool.push(makeMultipleChoice({ id: `pool-mc-${index}`, difficulty: (index % 10) + 1 }));
    pool.push(makeTrueFalse({ id: `pool-tf-${index}`, difficulty: (index % 10) + 1 }));
  }
  for (let index = 0; index < 12; index += 1) {
    pool.push(makeWhoIsIt({ id: `pool-who-${index}`, difficulty: (index % 8) + 2 }));
    pool.push(makeImpostor({ id: `pool-imp-${index}`, difficulty: (index % 8) + 2 }));
    pool.push(makeOrderChaos({ id: `pool-ord-${index}`, difficulty: (index % 8) + 2 }));
    pool.push(makeFinalBet({ id: `pool-bet-${index}`, difficulty: (index % 4) + 6 }));
    pool.push(makeShortAnswer({ id: `pool-esc-${index}`, difficulty: (index % 8) + 2 }));
  }
  return pool;
}

export function makeConfig(overrides?: Partial<GameConfig>): GameConfig {
  return {
    mode: 'SOLO',
    formatId: 'express',
    difficultyId: 'vecino',
    category: 'mezcla',
    adaptiveDifficulty: true,
    sinSpoilers: false,
    seed: 'semilla-de-test',
    ...overrides,
  };
}

/** Respuesta correcta para cualquier tipo de pregunta. */
export function correctSubmissionFor(question: Question): AnswerSubmission {
  switch (question.type) {
    case 'MULTIPLE_CHOICE':
    case 'WHO_IS_IT':
    case 'FINAL_BET':
    case 'MEMORY_GRID':
    case 'MISSING_ITEM':
      return { kind: 'OPTION', optionId: question.correctOptionId };
    case 'DECISION':
      return { kind: 'OPTION', optionId: question.bestOptionId };
    case 'SEQUENCE':
      return { kind: 'ORDER', orderedIds: [...question.sequence] };
    case 'TRUE_FALSE':
      return { kind: 'BOOLEAN', value: question.correctValue };
    case 'IMPOSTOR':
      return { kind: 'ITEM', itemId: question.impostorItemId };
    case 'ORDER_CHAOS':
      return { kind: 'ORDER', orderedIds: question.steps.map((step) => step.id) };
    case 'SHORT_ANSWER':
      return { kind: 'TEXT', text: question.answer };
  }
}

/** Respuesta deliberadamente equivocada. */
export function wrongSubmissionFor(question: Question): AnswerSubmission {
  switch (question.type) {
    case 'MULTIPLE_CHOICE':
    case 'WHO_IS_IT':
    case 'FINAL_BET':
    case 'MEMORY_GRID':
    case 'MISSING_ITEM': {
      const wrong = question.options.find((option) => option.id !== question.correctOptionId);
      return { kind: 'OPTION', optionId: wrong?.id ?? 'zzz' };
    }
    case 'DECISION': {
      const peor = [...question.options].sort((a, b) => a.weight - b.weight)[0];
      return { kind: 'OPTION', optionId: peor?.id ?? 'zzz' };
    }
    case 'SEQUENCE':
      return { kind: 'ORDER', orderedIds: [...question.sequence].reverse() };
    case 'TRUE_FALSE':
      return { kind: 'BOOLEAN', value: !question.correctValue };
    case 'IMPOSTOR': {
      const wrong = question.items.find((item) => item.id !== question.impostorItemId);
      return { kind: 'ITEM', itemId: wrong?.id ?? 'zzz' };
    }
    case 'ORDER_CHAOS':
      return { kind: 'ORDER', orderedIds: [...question.steps].reverse().map((step) => step.id) };
    case 'SHORT_ANSWER':
      return { kind: 'TEXT', text: 'la respuesta que no es' };
  }
}

export type PlayOptions = {
  /** Qué hacer en cada pregunta. Por defecto, acertar siempre. */
  answer?: (question: Question, index: number) => 'correct' | 'wrong' | 'timeout';
  /** Cuánto apostar en la ronda final. */
  wager?: (state: GameState) => number;
  /** Milisegundos que tarda en responder. */
  responseMs?: number;
  maxSteps?: number;
};

export type PlayResult = {
  state: GameState;
  events: EngineEvent[];
  steps: number;
};

/**
 * Juega una partida completa contra el motor real, sin React ni red.
 * Devuelve el estado final y todos los eventos emitidos.
 */
export function playGame(
  config: GameConfig,
  deps: EngineDeps,
  options: PlayOptions = {},
): PlayResult {
  const answerPolicy = options.answer ?? (() => 'correct' as const);
  const responseMs = options.responseMs ?? 3000;
  const maxSteps = options.maxSteps ?? 2000;

  let state = createGameState({ gameId: 'partida-test', config });
  const events: EngineEvent[] = [];
  let clock = 1_700_000_000_000;
  let steps = 0;
  let questionCounter = 0;

  const send = (action: GameAction) => {
    const result = applyAction(state, action, deps);
    state = result.state;
    events.push(...result.events);
  };

  while (state.phase !== 'GAME_RESULTS' && steps < maxSteps) {
    steps += 1;
    clock += 500;

    switch (state.phase) {
      case 'INTRO':
        send({ type: 'START_GAME', at: clock });
        break;
      case 'ROUND_INTRO':
      case 'EVENT':
      case 'ROUND_RESULTS':
        send({ type: 'NEXT', at: clock });
        break;
      case 'FINAL_ROUND':
        send({ type: 'PLACE_BET', wager: options.wager?.(state) ?? 0, at: clock });
        break;
      case 'QUESTION': {
        const active = state.currentQuestion;
        if (!active) throw new Error('QUESTION sin pregunta activa');
        const decision = answerPolicy(active.question, questionCounter);
        questionCounter += 1;
        if (decision === 'timeout') {
          send({ type: 'TIME_UP', at: active.startedAt + active.timeLimitSeconds * 1000 });
        } else {
          const submission =
            decision === 'correct'
              ? correctSubmissionFor(active.question)
              : wrongSubmissionFor(active.question);
          send({ type: 'SUBMIT_ANSWER', submission, at: active.startedAt + responseMs });
        }
        break;
      }
      case 'ANSWER_LOCKED':
        send({ type: 'REVEAL', at: clock });
        break;
      case 'REVEAL':
        send({ type: 'NEXT', at: clock });
        break;
      default:
        throw new Error(`Fase inesperada en una partida: ${state.phase}`);
    }
  }

  return { state, events, steps };
}
