/**
 * MOTOR DE JUEGO — máquina de estados pura.
 *
 *   applyAction(estado, acción, { banco }) → { estado nuevo, eventos emitidos }
 *
 * Propiedades que se mantienen a propósito, porque son las que permiten que Fase 3
 * (servidor autoritativo + WebSockets) reutilice este fichero sin reescribirlo:
 *
 *   · PURA: no lee el reloj (el tiempo llega en `action.at`), no toca red ni almacenamiento.
 *   · DETERMINISTA: todo el azar sale de `createRng(seed, rngCursor)`, y el cursor vive
 *     en el estado. Misma semilla + mismo banco = misma partida, en cliente y servidor.
 *   · SERIALIZABLE: el estado es JSON plano.
 *   · EXPLÍCITA: una acción inválida para la fase actual se ignora sin efectos.
 *
 * Flujo de fases:
 *
 *   INTRO ──START_GAME──▶ ROUND_INTRO ──NEXT──▶ QUESTION ──SUBMIT/TIME_UP──▶ ANSWER_LOCKED
 *                                │                                                │
 *                                │ (ronda final)                              REVEAL
 *                                ▼                                                │
 *                          FINAL_ROUND ──PLACE_BET──▶ QUESTION            ┌───────┴────────┐
 *                                                                        ▼                ▼
 *                                                       EVENT / QUESTION (siguiente)  ROUND_RESULTS
 *                                                                                          │
 *                                                                    ROUND_INTRO ◀─NEXT────┤
 *                                                                                          ▼
 *                                                                                   GAME_RESULTS
 */

import { createAdaptiveState, targetDifficulty, updateAdaptiveState } from '../difficulty/adaptive';
import { getDifficultyLevel } from '../difficulty/levels';
import {
  eventModifiers,
  eventTimeScale,
  getGameEvent,
  rollGameEvent,
  type GameEventDefinition,
} from '../events/game-events';
import {
  CORRECT_LINES,
  PARTIAL_LINES,
  TIMEOUT_LINES,
  WRONG_LINES,
  pickLine,
} from '../copy/feedback';
import { allowsPartialCredit, extendsStreak, gradeAnswer } from '../questions/grading';
import { canUsePowerUp, createInventory, getPowerUp, spendCharge, type PowerUpId } from '../powerups/powerups';
import { clampWager, maxPointsFor, scoreAnswer, type ScoreModifier } from '../scoring/scoring';
import { createRng, shuffle, type Rng } from '../rng';
import { getGameFormat, type RoundDefinition } from '../rounds/formats';
import { applyStreak, createStreakState } from '../streaks/streaks';
import { buildSummary } from '../results/summary';
import { selectQuestion } from '../selection/select';
import type { AnswerSubmission, Question } from '../questions/types';
import type { DistributiveOmit } from '../types';
import type { EngineEvent } from './engine-events';
import type { GameAction } from './actions';
import type {
  ActiveQuestion,
  GameConfig,
  GameState,
  RoundProgress,
} from './state';

export type EngineDeps = {
  /** Banco de preguntas disponible para esta partida. */
  pool: readonly Question[];
};

export type EngineResult = {
  state: GameState;
  events: EngineEvent[];
};

/** Un evento sin los campos que rellena el motor (seq, gameId, at). */
type EngineEventInput = DistributiveOmit<EngineEvent, 'seq' | 'gameId' | 'at'>;

const DEFAULT_WAGER_RATIO = 0.5;

// ── Creación ────────────────────────────────────────────────────────────────────

export function createGameState(input: {
  gameId: string;
  config: GameConfig;
  inventory?: Partial<Record<PowerUpId, number>>;
}): GameState {
  const format = getGameFormat(input.config.formatId);

  const rounds: RoundProgress[] = format.rounds.map((round, index) => ({
    roundId: round.id,
    roundIndex: index,
    title: round.title,
    subtitle: round.subtitle,
    questionCount: round.questionCount,
    answered: 0,
    correct: 0,
    points: 0,
  }));

  return {
    gameId: input.gameId,
    config: input.config,
    phase: 'INTRO',
    roundIndex: 0,
    questionInRound: 0,
    questionIndex: 0,
    score: 0,
    streak: createStreakState(),
    adaptive: createAdaptiveState(input.config.difficultyId),
    inventory: createInventory(input.inventory),
    usedQuestionIds: [],
    rounds,
    answers: [],
    rngCursor: 0,
    eventSeq: 0,
    notices: [],
  };
}

// ── Utilidades internas ─────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundDefinition(state: GameState): RoundDefinition | undefined {
  return getGameFormat(state.config.formatId).rounds[state.roundIndex];
}

function wagerRatioFor(question: Question): number {
  return question.type === 'FINAL_BET' ? question.maxWagerRatio : DEFAULT_WAGER_RATIO;
}

function presentationOrder(question: Question, rng: Rng): string[] {
  switch (question.type) {
    case 'MULTIPLE_CHOICE':
    case 'WHO_IS_IT':
    case 'FINAL_BET':
      return shuffle(
        question.options.map((option) => option.id),
        rng,
      );
    case 'IMPOSTOR':
      return shuffle(
        question.items.map((item) => item.id),
        rng,
      );
    case 'ORDER_CHAOS': {
      const correct = question.steps.map((step) => step.id);
      const shuffled = shuffle(correct, rng);
      // Que el orden inicial coincida con el correcto sería un regalo: lo rotamos.
      const isSameOrder = shuffled.every((id, index) => id === correct[index]);
      if (isSameOrder && shuffled.length > 1) {
        const [first, ...rest] = shuffled;
        return first ? [...rest, first] : shuffled;
      }
      return shuffled;
    }
    case 'TRUE_FALSE':
      return [];
  }
}

function totalCluesOf(question: Question): number | undefined {
  return question.type === 'WHO_IS_IT' ? question.clues.length : undefined;
}

// ── Reducer ─────────────────────────────────────────────────────────────────────

export function applyAction(state: GameState, action: GameAction, deps: EngineDeps): EngineResult {
  const events: EngineEvent[] = [];
  let seq = state.eventSeq;
  let next: GameState = state;
  let cursor = state.rngCursor;

  const emit = (input: EngineEventInput): void => {
    seq += 1;
    // Reconstrucción estructural del evento: TS no puede verificar el spread sobre una
    // unión distribuida, pero los tres campos añadidos son exactamente los omitidos.
    events.push({ ...input, seq, gameId: state.gameId, at: action.at } as EngineEvent);
  };

  /** Siguiente stream de azar. Cada operación consume un cursor distinto. */
  const nextRng = (): Rng => {
    const rng = createRng(next.config.seed, cursor);
    cursor += 1;
    return rng;
  };

  const finishGame = (): void => {
    const summary = buildSummary({
      answers: next.answers,
      rounds: next.rounds,
      totalScore: next.score,
      bestStreak: next.streak.best,
      startedAt: next.startedAt,
      finishedAt: action.at,
    });
    next = { ...next, phase: 'GAME_RESULTS', finishedAt: action.at, summary, currentQuestion: undefined };
    emit({
      type: 'GAME_FINISHED',
      totalScore: summary.totalScore,
      correctAnswers: summary.correctAnswers,
      rankId: summary.rankId,
    });
  };

  const finishRound = (): void => {
    const progress = next.rounds[next.roundIndex];
    next = { ...next, phase: 'ROUND_RESULTS', currentQuestion: undefined, pendingSubmission: undefined };
    if (progress) {
      emit({
        type: 'ROUND_FINISHED',
        roundId: progress.roundId,
        roundIndex: progress.roundIndex,
        points: progress.points,
        correct: progress.correct,
      });
    }
  };

  /** Selecciona y arranca la siguiente pregunta de la ronda en curso. */
  const startQuestion = (): void => {
    const round = roundDefinition(next);
    if (!round) {
      finishGame();
      return;
    }

    const level = getDifficultyLevel(next.config.difficultyId);
    const target = clamp(
      targetDifficulty(next.adaptive, level) + (round.difficultyOffset ?? 0),
      1,
      10,
    );

    const selection = selectQuestion(
      deps.pool,
      {
        targetDifficulty: target,
        allowedTypes: round.allowedTypes,
        category: next.config.category,
        excludeIds: new Set(next.usedQuestionIds),
      },
      nextRng(),
    );

    if (!selection) {
      // Banco agotado: se cierra la ronda (o la partida) sin dejar al jugador colgado.
      next = {
        ...next,
        notices: [...next.notices, 'No quedan preguntas disponibles con esta configuración.'],
      };
      finishRound();
      return;
    }

    const question = selection.question;
    const activeEvent: GameEventDefinition | undefined =
      next.pendingEvent && next.pendingEvent.appliesToQuestionIndex === next.questionIndex
        ? getGameEvent(next.pendingEvent.id)
        : undefined;

    const timeLimitSeconds = Math.max(
      5,
      Math.round(
        question.timeLimitSeconds *
          level.timeScale *
          (round.timeScale ?? 1) *
          eventTimeScale(activeEvent),
      ),
    );

    const modifiers: ScoreModifier[] = [...(round.modifiers ?? []), ...eventModifiers(activeEvent)];

    const active: ActiveQuestion = {
      question,
      roundId: round.id,
      indexInGame: next.questionIndex,
      timeLimitSeconds,
      optionOrder: presentationOrder(question, nextRng()),
      modifiers,
      eliminatedOptionIds: [],
      cluesRevealed: question.type === 'WHO_IS_IT' ? 1 : 0,
      powerUpsUsed: [],
      wager: 0,
      ...(activeEvent ? { eventId: activeEvent.id } : {}),
      startedAt: action.at,
    };

    const isFinal = round.isFinal === true;

    next = {
      ...next,
      phase: isFinal ? 'FINAL_ROUND' : 'QUESTION',
      currentQuestion: active,
      pendingSubmission: undefined,
      lastReveal: undefined,
      usedQuestionIds: [...next.usedQuestionIds, question.id],
    };

    if (!isFinal) {
      emit({
        type: 'QUESTION_STARTED',
        questionId: question.id,
        questionType: question.type,
        roundId: round.id,
        indexInGame: active.indexInGame,
        difficulty: question.difficulty,
        timeLimitSeconds,
      });
    }
  };

  const lockAnswer = (submission: AnswerSubmission, timedOut: boolean): void => {
    const active = next.currentQuestion;
    if (!active) return;
    const limitMs = active.timeLimitSeconds * 1000;
    const responseMs = timedOut
      ? limitMs
      : clamp(action.at - active.startedAt, 0, limitMs);

    next = {
      ...next,
      phase: 'ANSWER_LOCKED',
      pendingSubmission: { submission, responseMs, timedOut },
    };

    emit({
      type: 'ANSWER_SUBMITTED',
      questionId: active.question.id,
      submission,
      responseMs,
      timedOut,
    });
  };

  const revealAnswer = (): void => {
    const active = next.currentQuestion;
    const pending = next.pendingSubmission;
    if (!active || !pending) return;

    const question = active.question;
    const grade = gradeAnswer(question, pending.submission);
    const accuracy = allowsPartialCredit(question) ? grade.accuracy : grade.isCorrect ? 1 : 0;
    const totalClues = totalCluesOf(question);
    const streakBefore = next.streak.current;

    const breakdown = scoreAnswer({
      basePoints: question.basePoints,
      accuracy,
      isCorrect: grade.isCorrect,
      difficulty: question.difficulty,
      timeLimitSeconds: active.timeLimitSeconds,
      responseMs: pending.responseMs,
      streakBefore,
      modifiers: active.modifiers,
      ...(totalClues ? { cluesRevealed: active.cluesRevealed, totalClues } : {}),
      wager: active.wager,
    });

    const streakUpdate = applyStreak(next.streak, extendsStreak(grade));
    const activeEvent = active.eventId ? getGameEvent(active.eventId) : undefined;
    const eventPenalty =
      activeEvent?.effect.mustPass && !grade.isCorrect
        ? -(activeEvent.effect.failurePenalty ?? 0)
        : 0;

    const adaptiveUpdate = updateAdaptiveState(
      next.adaptive,
      { correct: grade.isCorrect },
      {
        level: getDifficultyLevel(next.config.difficultyId),
        enabled: next.config.adaptiveDifficulty,
      },
    );

    const netPoints = breakdown.total + streakUpdate.bonusPoints + eventPenalty;
    const scoreBefore = next.score;
    const scoreAfter = Math.max(0, scoreBefore + netPoints);

    const lines = pending.timedOut
      ? TIMEOUT_LINES
      : grade.isCorrect
        ? CORRECT_LINES
        : accuracy > 0
          ? PARTIAL_LINES
          : WRONG_LINES;
    const line = pickLine(lines, nextRng().next());

    const rounds = next.rounds.map((progress, index) =>
      index === next.roundIndex
        ? {
            ...progress,
            answered: progress.answered + 1,
            correct: progress.correct + (grade.isCorrect ? 1 : 0),
            points: progress.points + netPoints,
          }
        : progress,
    );

    next = {
      ...next,
      phase: 'REVEAL',
      score: scoreAfter,
      streak: streakUpdate.state,
      adaptive: adaptiveUpdate.state,
      rounds,
      questionIndex: next.questionIndex + 1,
      questionInRound: next.questionInRound + 1,
      pendingSubmission: undefined,
      pendingEvent: undefined,
      answers: [
        ...next.answers,
        {
          questionId: question.id,
          roundId: active.roundId,
          indexInGame: active.indexInGame,
          type: question.type,
          difficulty: question.difficulty,
          answered: !pending.timedOut,
          correct: grade.isCorrect,
          accuracy,
          responseMs: pending.responseMs,
          pointsAwarded: netPoints,
          basePoints: breakdown.base,
          timeBonus: breakdown.timeBonus,
          streakBonus: breakdown.streakBonus,
          multiplier: breakdown.difficultyMultiplier * breakdown.modifierMultiplier * breakdown.clueMultiplier,
          streakAfter: streakUpdate.state.current,
          wager: active.wager,
          powerUpsUsed: active.powerUpsUsed,
          submitted: pending.submission,
          maxPoints: maxPointsFor({
            basePoints: question.basePoints,
            difficulty: question.difficulty,
            modifiers: active.modifiers,
          }),
        },
      ],
      lastReveal: {
        questionId: question.id,
        question,
        submitted: pending.submission,
        grade,
        breakdown,
        eventPenalty,
        milestoneBonus: streakUpdate.bonusPoints,
        ...(streakUpdate.milestone
          ? { milestoneTitle: streakUpdate.milestone.title, milestoneLine: streakUpdate.milestone.line }
          : {}),
        streakBefore,
        streakAfter: streakUpdate.state.current,
        streakBroken: streakUpdate.broken,
        scoreBefore,
        scoreAfter,
        netPoints,
        responseMs: pending.responseMs,
        timedOut: pending.timedOut,
        line,
        adaptiveDelta: adaptiveUpdate.delta,
        cluesRevealed: active.cluesRevealed,
      },
    };

    emit({
      type: 'ANSWER_REVEALED',
      questionId: question.id,
      correct: grade.isCorrect,
      accuracy,
      pointsAwarded: netPoints,
      scoreAfter,
      streakAfter: streakUpdate.state.current,
    });
  };

  /** Avance tras el revelado: evento intermedio, siguiente pregunta o fin de ronda. */
  const advanceAfterReveal = (): void => {
    const round = roundDefinition(next);
    if (!round) {
      finishGame();
      return;
    }

    if (next.questionInRound >= round.questionCount) {
      finishRound();
      return;
    }

    const shouldTriggerEvent = round.eventChance > 0 && nextRng().next() < round.eventChance;
    if (shouldTriggerEvent) {
      const event = rollGameEvent(nextRng());
      if (event) {
        next = {
          ...next,
          phase: 'EVENT',
          currentQuestion: undefined,
          pendingEvent: { id: event.id, appliesToQuestionIndex: next.questionIndex },
        };
        emit({
          type: 'EVENT_TRIGGERED',
          eventId: event.id,
          appliesToQuestionIndex: next.questionIndex,
        });
        return;
      }
    }

    startQuestion();
  };

  const advanceAfterRoundResults = (): void => {
    const format = getGameFormat(next.config.formatId);
    const nextRoundIndex = next.roundIndex + 1;
    const round = format.rounds[nextRoundIndex];

    if (!round) {
      finishGame();
      return;
    }

    next = {
      ...next,
      phase: 'ROUND_INTRO',
      roundIndex: nextRoundIndex,
      questionInRound: 0,
      lastReveal: undefined,
    };

    emit({
      type: 'ROUND_STARTED',
      roundId: round.id,
      roundIndex: nextRoundIndex,
      questionCount: round.questionCount,
    });
  };

  switch (action.type) {
    case 'START_GAME': {
      if (next.phase !== 'INTRO') break;
      const format = getGameFormat(next.config.formatId);
      const firstRound = format.rounds[0];
      next = { ...next, phase: 'ROUND_INTRO', startedAt: action.at };
      emit({
        type: 'PLAYER_JOINED',
        playerId: 'local',
        displayName: next.config.playerName ?? null,
      });
      emit({
        type: 'GAME_STARTED',
        formatId: format.id,
        difficultyId: next.config.difficultyId,
        totalQuestions: format.rounds.reduce((sum, round) => sum + round.questionCount, 0),
      });
      if (firstRound) {
        emit({
          type: 'ROUND_STARTED',
          roundId: firstRound.id,
          roundIndex: 0,
          questionCount: firstRound.questionCount,
        });
      }
      break;
    }

    case 'NEXT': {
      switch (next.phase) {
        case 'ROUND_INTRO':
        case 'EVENT':
          startQuestion();
          break;
        case 'ANSWER_LOCKED':
          revealAnswer();
          break;
        case 'REVEAL':
          advanceAfterReveal();
          break;
        case 'ROUND_RESULTS':
          advanceAfterRoundResults();
          break;
        default:
          break;
      }
      break;
    }

    case 'REVEAL': {
      if (next.phase !== 'ANSWER_LOCKED') break;
      revealAnswer();
      break;
    }

    case 'REVEAL_CLUE': {
      const active = next.currentQuestion;
      if (next.phase !== 'QUESTION' || !active) break;
      if (active.question.type !== 'WHO_IS_IT') break;
      if (active.cluesRevealed >= active.question.clues.length) break;
      const cluesRevealed = active.cluesRevealed + 1;
      next = { ...next, currentQuestion: { ...active, cluesRevealed } };
      emit({ type: 'CLUE_REVEALED', questionId: active.question.id, clueIndex: cluesRevealed - 1 });
      break;
    }

    case 'PLACE_BET': {
      const active = next.currentQuestion;
      if (next.phase !== 'FINAL_ROUND' || !active) break;
      const wager = clampWager(action.wager, next.score, wagerRatioFor(active.question));
      next = {
        ...next,
        phase: 'QUESTION',
        currentQuestion: { ...active, wager, startedAt: action.at },
      };
      emit({ type: 'BET_PLACED', questionId: active.question.id, wager });
      emit({
        type: 'QUESTION_STARTED',
        questionId: active.question.id,
        questionType: active.question.type,
        roundId: active.roundId,
        indexInGame: active.indexInGame,
        difficulty: active.question.difficulty,
        timeLimitSeconds: active.timeLimitSeconds,
      });
      break;
    }

    case 'USE_POWER_UP': {
      const active = next.currentQuestion;
      if (next.phase !== 'QUESTION' || !active) break;

      const context = {
        question: active.question,
        eliminatedOptionIds: active.eliminatedOptionIds,
        answerLocked: false,
      };
      const availability = canUsePowerUp(action.powerUpId, next.inventory, context);
      if (!availability.ok) break;

      const effect = getPowerUp(action.powerUpId).resolveEffect(context, nextRng());
      if (!effect) break;

      let updated: ActiveQuestion = {
        ...active,
        powerUpsUsed: [...active.powerUpsUsed, action.powerUpId],
      };
      let detail = '';

      switch (effect.kind) {
        case 'ADD_TIME':
          updated = { ...updated, timeLimitSeconds: updated.timeLimitSeconds + effect.seconds };
          detail = `+${effect.seconds}s`;
          break;
        case 'ELIMINATE_OPTION':
          updated = {
            ...updated,
            eliminatedOptionIds: [...updated.eliminatedOptionIds, effect.optionId],
          };
          detail = 'Opción descartada';
          break;
      }

      next = {
        ...next,
        currentQuestion: updated,
        inventory: spendCharge(next.inventory, action.powerUpId),
      };

      emit({
        type: 'POWERUP_USED',
        questionId: active.question.id,
        powerUpId: action.powerUpId,
        detail,
      });
      break;
    }

    case 'SUBMIT_ANSWER': {
      if (next.phase !== 'QUESTION') break;
      lockAnswer(action.submission, false);
      break;
    }

    case 'TIME_UP': {
      if (next.phase === 'FINAL_ROUND') {
        // Se agotó el tiempo de decidir la apuesta: se juega sin apostar.
        const active = next.currentQuestion;
        if (!active) break;
        next = { ...next, phase: 'QUESTION', currentQuestion: { ...active, startedAt: action.at } };
        emit({
          type: 'QUESTION_STARTED',
          questionId: active.question.id,
          questionType: active.question.type,
          roundId: active.roundId,
          indexInGame: active.indexInGame,
          difficulty: active.question.difficulty,
          timeLimitSeconds: active.timeLimitSeconds,
        });
        break;
      }
      if (next.phase !== 'QUESTION') break;
      lockAnswer({ kind: 'NONE' }, true);
      break;
    }

    case 'FINISH_GAME': {
      if (next.phase === 'GAME_RESULTS') break;
      finishGame();
      break;
    }
  }

  if (next === state && events.length === 0 && cursor === state.rngCursor) {
    return { state, events };
  }

  return {
    state: { ...next, rngCursor: cursor, eventSeq: seq },
    events,
  };
}

/** Aplica varias acciones seguidas. Útil en tests y para reproducir una partida. */
export function applyActions(
  state: GameState,
  actions: readonly GameAction[],
  deps: EngineDeps,
): EngineResult {
  let current = state;
  const events: EngineEvent[] = [];
  for (const action of actions) {
    const result = applyAction(current, action, deps);
    current = result.state;
    events.push(...result.events);
  }
  return { state: current, events };
}
