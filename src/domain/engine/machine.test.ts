import { describe, expect, it } from 'vitest';

import { applyAction, createGameState, type EngineDeps } from './machine';
import { GAME_EVENTS } from '../events/game-events';
import { getGameFormat, totalQuestions } from '../rounds/formats';
import { EXTRA_TIME_SECONDS } from '../powerups/powerups';
import {
  correctSubmissionFor,
  makeConfig,
  makeFinalBet,
  makeMultipleChoice,
  makePool,
  playGame,
  wrongSubmissionFor,
} from '@/test/fixtures';
import type { GameState } from './state';

const deps: EngineDeps = { pool: makePool() };
const AT = 1_700_000_000_000;

function start(config = makeConfig()): GameState {
  const initial = createGameState({ gameId: 'g1', config });
  return applyAction(initial, { type: 'START_GAME', at: AT }, deps).state;
}

describe('transiciones de fase', () => {
  it('empieza en INTRO y pasa a ROUND_INTRO al arrancar', () => {
    const initial = createGameState({ gameId: 'g1', config: makeConfig() });
    expect(initial.phase).toBe('INTRO');

    const result = applyAction(initial, { type: 'START_GAME', at: AT }, deps);
    expect(result.state.phase).toBe('ROUND_INTRO');
    expect(result.state.startedAt).toBe(AT);
    expect(result.events.map((event) => event.type)).toEqual([
      'PLAYER_JOINED',
      'GAME_STARTED',
      'ROUND_STARTED',
    ]);
  });

  it('recorre pregunta → bloqueo → revelado', () => {
    let state = start();
    state = applyAction(state, { type: 'NEXT', at: AT }, deps).state;
    expect(state.phase).toBe('QUESTION');
    expect(state.currentQuestion).toBeDefined();

    const question = state.currentQuestion!.question;
    const submitted = applyAction(
      state,
      { type: 'SUBMIT_ANSWER', submission: correctSubmissionFor(question), at: AT + 2000 },
      deps,
    );
    expect(submitted.state.phase).toBe('ANSWER_LOCKED');
    expect(submitted.state.pendingSubmission?.responseMs).toBe(2000);
    expect(submitted.events.at(-1)?.type).toBe('ANSWER_SUBMITTED');

    const revealed = applyAction(submitted.state, { type: 'REVEAL', at: AT + 2100 }, deps);
    expect(revealed.state.phase).toBe('REVEAL');
    expect(revealed.state.lastReveal?.grade.isCorrect).toBe(true);
    expect(revealed.state.score).toBeGreaterThan(0);
    expect(revealed.events.at(-1)?.type).toBe('ANSWER_REVEALED');
  });

  it('el tiempo agotado cuenta como respuesta no dada', () => {
    let state = start();
    state = applyAction(state, { type: 'NEXT', at: AT }, deps).state;
    const limitMs = state.currentQuestion!.timeLimitSeconds * 1000;

    state = applyAction(state, { type: 'TIME_UP', at: AT + limitMs }, deps).state;
    expect(state.pendingSubmission).toEqual({
      submission: { kind: 'NONE' },
      responseMs: limitMs,
      timedOut: true,
    });

    state = applyAction(state, { type: 'REVEAL', at: AT + limitMs + 10 }, deps).state;
    expect(state.score).toBe(0);
    expect(state.answers[0]?.answered).toBe(false);
    expect(state.streak.current).toBe(0);
  });

  it('ignora acciones que no corresponden a la fase', () => {
    const initial = createGameState({ gameId: 'g1', config: makeConfig() });

    const submitEnIntro = applyAction(
      initial,
      { type: 'SUBMIT_ANSWER', submission: { kind: 'NONE' }, at: AT },
      deps,
    );
    expect(submitEnIntro.state).toBe(initial);
    expect(submitEnIntro.events).toHaveLength(0);

    const startDosVeces = applyAction(start(), { type: 'START_GAME', at: AT }, deps);
    expect(startDosVeces.events).toHaveLength(0);

    const revealSinRespuesta = applyAction(start(), { type: 'REVEAL', at: AT }, deps);
    expect(revealSinRespuesta.state.phase).toBe('ROUND_INTRO');
  });

  it('cierra la ronda cuando se agotan sus preguntas y avanza a la siguiente', () => {
    const format = getGameFormat('express');
    const primeraRonda = format.rounds[0]!;

    let state = start();
    for (let index = 0; index < primeraRonda.questionCount; index += 1) {
      state = applyAction(state, { type: 'NEXT', at: AT }, deps).state;
      // Puede haber una cartela de evento entre preguntas.
      if (state.phase === 'EVENT') state = applyAction(state, { type: 'NEXT', at: AT }, deps).state;
      const question = state.currentQuestion!.question;
      state = applyAction(
        state,
        { type: 'SUBMIT_ANSWER', submission: correctSubmissionFor(question), at: AT + 1000 },
        deps,
      ).state;
      state = applyAction(state, { type: 'REVEAL', at: AT + 1100 }, deps).state;
      if (index < primeraRonda.questionCount - 1) expect(state.phase).toBe('REVEAL');
    }

    state = applyAction(state, { type: 'NEXT', at: AT }, deps).state;
    expect(state.phase).toBe('ROUND_RESULTS');
    expect(state.rounds[0]?.answered).toBe(primeraRonda.questionCount);

    state = applyAction(state, { type: 'NEXT', at: AT }, deps).state;
    expect(state.phase).toBe('ROUND_INTRO');
    expect(state.roundIndex).toBe(1);
    expect(state.questionInRound).toBe(0);
  });
});

describe('comodines', () => {
  it('«un poquito de por favor» añade tiempo y gasta una carga', () => {
    let state = start();
    state = applyAction(state, { type: 'NEXT', at: AT }, deps).state;
    const before = state.currentQuestion!.timeLimitSeconds;

    const result = applyAction(
      state,
      { type: 'USE_POWER_UP', powerUpId: 'UN_POQUITO_DE_POR_FAVOR', at: AT },
      deps,
    );
    expect(result.state.currentQuestion?.timeLimitSeconds).toBe(before + EXTRA_TIME_SECONDS);
    expect(result.state.inventory.UN_POQUITO_DE_POR_FAVOR).toBe(1);
    expect(result.state.currentQuestion?.powerUpsUsed).toEqual(['UN_POQUITO_DE_POR_FAVOR']);
    expect(result.events.at(-1)?.type).toBe('POWERUP_USED');
  });

  it('«radio patio» descarta una incorrecta y nunca la correcta', () => {
    let state = start();
    state = applyAction(state, { type: 'NEXT', at: AT }, deps).state;

    const question = state.currentQuestion!.question;
    const result = applyAction(state, { type: 'USE_POWER_UP', powerUpId: 'RADIO_PATIO', at: AT }, deps);
    const eliminated = result.state.currentQuestion?.eliminatedOptionIds ?? [];

    if (question.type === 'MULTIPLE_CHOICE' || question.type === 'WHO_IS_IT') {
      expect(eliminated).toHaveLength(1);
      expect(eliminated).not.toContain(question.correctOptionId);
    } else {
      // En un tipo incompatible el motor ignora la acción sin gastar carga.
      expect(result.state.inventory.RADIO_PATIO).toBe(2);
    }
  });

  it('no se puede usar un comodín sin cargas', () => {
    let state = start();
    state = applyAction(state, { type: 'NEXT', at: AT }, deps).state;
    state = { ...state, inventory: { ...state.inventory, UN_POQUITO_DE_POR_FAVOR: 0 } };

    const result = applyAction(
      state,
      { type: 'USE_POWER_UP', powerUpId: 'UN_POQUITO_DE_POR_FAVOR', at: AT },
      deps,
    );
    expect(result.events).toHaveLength(0);
  });

  it('los comodines usados quedan registrados en la respuesta', () => {
    let state = start();
    state = applyAction(state, { type: 'NEXT', at: AT }, deps).state;
    state = applyAction(
      state,
      { type: 'USE_POWER_UP', powerUpId: 'UN_POQUITO_DE_POR_FAVOR', at: AT },
      deps,
    ).state;
    const question = state.currentQuestion!.question;
    state = applyAction(
      state,
      { type: 'SUBMIT_ANSWER', submission: correctSubmissionFor(question), at: AT + 500 },
      deps,
    ).state;
    state = applyAction(state, { type: 'REVEAL', at: AT + 600 }, deps).state;

    expect(state.answers[0]?.powerUpsUsed).toEqual(['UN_POQUITO_DE_POR_FAVOR']);
  });
});

describe('ronda final con apuesta', () => {
  const soloBet: EngineDeps = { pool: [makeFinalBet({ id: 'final', maxWagerRatio: 0.5 })] };
  const finalConfig = makeConfig({ formatId: 'express' });

  /** Coloca la partida directamente en la ronda final con un marcador dado. */
  function atFinalRound(score: number): GameState {
    const base = createGameState({ gameId: 'g-final', config: finalConfig });
    const format = getGameFormat(finalConfig.formatId);
    const finalIndex = format.rounds.length - 1;
    const state: GameState = {
      ...base,
      phase: 'ROUND_INTRO',
      roundIndex: finalIndex,
      score,
      startedAt: AT,
    };
    return applyAction(state, { type: 'NEXT', at: AT }, soloBet).state;
  }

  it('la ronda final pide la apuesta antes de la pregunta', () => {
    const state = atFinalRound(1000);
    expect(state.phase).toBe('FINAL_ROUND');
    expect(state.currentQuestion?.question.type).toBe('FINAL_BET');
  });

  it('acertar suma lo apostado', () => {
    let state = atFinalRound(1000);
    state = applyAction(state, { type: 'PLACE_BET', wager: 500, at: AT }, soloBet).state;
    expect(state.phase).toBe('QUESTION');
    expect(state.currentQuestion?.wager).toBe(500);

    const question = state.currentQuestion!.question;
    state = applyAction(
      state,
      { type: 'SUBMIT_ANSWER', submission: correctSubmissionFor(question), at: AT + 1000 },
      soloBet,
    ).state;
    state = applyAction(state, { type: 'REVEAL', at: AT + 1100 }, soloBet).state;

    expect(state.lastReveal?.breakdown.wagerDelta).toBe(500);
    expect(state.score).toBeGreaterThan(1500);
  });

  it('fallar resta lo apostado y no da puntos de pregunta', () => {
    let state = atFinalRound(1000);
    state = applyAction(state, { type: 'PLACE_BET', wager: 500, at: AT }, soloBet).state;
    const question = state.currentQuestion!.question;
    state = applyAction(
      state,
      { type: 'SUBMIT_ANSWER', submission: wrongSubmissionFor(question), at: AT + 1000 },
      soloBet,
    ).state;
    state = applyAction(state, { type: 'REVEAL', at: AT + 1100 }, soloBet).state;

    expect(state.lastReveal?.breakdown.questionPoints).toBe(0);
    expect(state.lastReveal?.breakdown.wagerDelta).toBe(-500);
    expect(state.score).toBe(500);
  });

  it('recorta la apuesta al máximo permitido', () => {
    let state = atFinalRound(1000);
    state = applyAction(state, { type: 'PLACE_BET', wager: 999_999, at: AT }, soloBet).state;
    expect(state.currentQuestion?.wager).toBe(500);
  });

  it('el marcador nunca baja de cero', () => {
    let state = atFinalRound(300);
    state = applyAction(state, { type: 'PLACE_BET', wager: 150, at: AT }, soloBet).state;
    state = { ...state, score: 100 }; // simula haber perdido puntos por otra vía
    const question = state.currentQuestion!.question;
    state = applyAction(
      state,
      { type: 'SUBMIT_ANSWER', submission: wrongSubmissionFor(question), at: AT + 1000 },
      soloBet,
    ).state;
    state = applyAction(state, { type: 'REVEAL', at: AT + 1100 }, soloBet).state;
    expect(state.score).toBe(0);
  });

  it('sin apostar, la pregunta se juega igual', () => {
    let state = atFinalRound(1000);
    state = applyAction(state, { type: 'PLACE_BET', wager: 0, at: AT }, soloBet).state;
    expect(state.phase).toBe('QUESTION');
    expect(state.currentQuestion?.wager).toBe(0);
  });
});

describe('eventos de partida', () => {
  it('el evento activo aporta su multiplicador y recorta el tiempo', () => {
    let state = start(makeConfig({ formatId: 'express' }));
    // Se fuerza el evento pendiente que afectará a la siguiente pregunta.
    state = {
      ...state,
      pendingEvent: { id: 'JUNTA_URGENTE', appliesToQuestionIndex: state.questionIndex },
    };
    state = applyAction(state, { type: 'NEXT', at: AT }, deps).state;

    const active = state.currentQuestion!;
    expect(active.eventId).toBe('JUNTA_URGENTE');
    expect(active.modifiers.some((modifier) => modifier.id === 'JUNTA_URGENTE')).toBe(true);
    expect(active.timeLimitSeconds).toBeLessThan(active.question.timeLimitSeconds);
  });

  it('el ascensor averiado penaliza si se falla la pregunta', () => {
    let state = start(makeConfig({ formatId: 'express' }));
    state = {
      ...state,
      score: 1000,
      pendingEvent: { id: 'ASCENSOR_AVERIADO', appliesToQuestionIndex: state.questionIndex },
    };
    state = applyAction(state, { type: 'NEXT', at: AT }, deps).state;

    const question = state.currentQuestion!.question;
    state = applyAction(
      state,
      { type: 'SUBMIT_ANSWER', submission: wrongSubmissionFor(question), at: AT + 1000 },
      deps,
    ).state;
    state = applyAction(state, { type: 'REVEAL', at: AT + 1100 }, deps).state;

    const penalty = GAME_EVENTS.ASCENSOR_AVERIADO.effect.failurePenalty!;
    expect(state.lastReveal?.eventPenalty).toBe(-penalty);
    expect(state.score).toBe(1000 - penalty);
  });

  it('el ascensor averiado no penaliza si se acierta', () => {
    let state = start(makeConfig({ formatId: 'express' }));
    state = {
      ...state,
      score: 1000,
      pendingEvent: { id: 'ASCENSOR_AVERIADO', appliesToQuestionIndex: state.questionIndex },
    };
    state = applyAction(state, { type: 'NEXT', at: AT }, deps).state;
    const question = state.currentQuestion!.question;
    state = applyAction(
      state,
      { type: 'SUBMIT_ANSWER', submission: correctSubmissionFor(question), at: AT + 1000 },
      deps,
    ).state;
    state = applyAction(state, { type: 'REVEAL', at: AT + 1100 }, deps).state;

    expect(state.lastReveal?.eventPenalty).toBe(0);
    expect(state.score).toBeGreaterThan(1000);
  });

  it('en una maratón terminan apareciendo eventos entre preguntas', () => {
    const conEventos = Array.from({ length: 6 }, (_, index) => {
      const result = playGame(
        makeConfig({ formatId: 'maraton', seed: `eventos-${index}` }),
        deps,
      );
      return result.events.some((event) => event.type === 'EVENT_TRIGGERED');
    });
    expect(conEventos.some(Boolean)).toBe(true);
  });
});

describe('partida completa', () => {
  it('termina, no repite preguntas y cuadra el resumen', () => {
    const config = makeConfig({ formatId: 'express' });
    const { state, events } = playGame(config, deps);

    expect(state.phase).toBe('GAME_RESULTS');
    expect(state.finishedAt).toBeDefined();
    expect(state.summary).toBeDefined();

    const summary = state.summary!;
    const expected = totalQuestions(getGameFormat('express'));
    expect(summary.totalQuestions).toBe(expected);
    expect(summary.correctAnswers).toBe(expected);
    expect(summary.accuracyPercent).toBe(100);
    expect(summary.totalScore).toBe(state.score);

    const ids = state.answers.map((answer) => answer.questionId);
    expect(new Set(ids).size).toBe(ids.length);

    expect(events.at(-1)?.type).toBe('GAME_FINISHED');
    expect(events.map((event) => event.seq)).toEqual(events.map((_, index) => index + 1));
  });

  it('fallar todo deja 0 puntos y el rango más bajo', () => {
    const { state } = playGame(makeConfig({ formatId: 'express' }), deps, {
      answer: () => 'wrong',
    });
    expect(state.score).toBe(0);
    expect(state.summary?.correctAnswers).toBe(0);
    expect(state.summary?.rankId).toBe('visitante');
    expect(state.summary?.bestStreak).toBe(0);
  });

  it('acertarlo todo da el rango más alto', () => {
    const { state } = playGame(makeConfig({ formatId: 'express' }), deps, { responseMs: 500 });
    expect(state.summary?.rankId).toBe('leyenda-radio-patio');
  });

  it('las preguntas sin responder cuentan como abandonos', () => {
    const { state } = playGame(makeConfig({ formatId: 'express' }), deps, {
      answer: () => 'timeout',
    });
    expect(state.summary?.timeouts).toBe(state.summary?.totalQuestions);
    expect(state.summary?.answeredQuestions).toBe(0);
  });

  it('la mejor racha se conserva aunque después se rompa', () => {
    const { state } = playGame(makeConfig({ formatId: 'normal' }), deps, {
      answer: (_question, index) => (index < 5 ? 'correct' : 'wrong'),
    });
    expect(state.summary?.bestStreak).toBe(5);
    expect(state.streak.current).toBe(0);
  });

  it('es reproducible: misma semilla, mismas preguntas y mismos puntos', () => {
    const config = makeConfig({ formatId: 'normal', seed: 'reproducible' });
    const primera = playGame(config, deps);
    const segunda = playGame(config, deps);

    expect(segunda.state.answers.map((answer) => answer.questionId)).toEqual(
      primera.state.answers.map((answer) => answer.questionId),
    );
    expect(segunda.state.score).toBe(primera.state.score);
  });

  it('semillas distintas dan partidas distintas', () => {
    const a = playGame(makeConfig({ formatId: 'normal', seed: 'una' }), deps);
    const b = playGame(makeConfig({ formatId: 'normal', seed: 'otra' }), deps);
    expect(a.state.answers.map((answer) => answer.questionId)).not.toEqual(
      b.state.answers.map((answer) => answer.questionId),
    );
  });

  it('con un banco diminuto la partida acaba igualmente, sin repetir', () => {
    const pobre: EngineDeps = {
      pool: [makeMultipleChoice({ id: 'p1' }), makeMultipleChoice({ id: 'p2' })],
    };
    const { state } = playGame(makeConfig({ formatId: 'maraton' }), pobre);
    expect(state.phase).toBe('GAME_RESULTS');
    expect(state.answers).toHaveLength(2);
    expect(state.notices.length).toBeGreaterThan(0);
  });

  it('se puede abandonar en cualquier momento y queda resumen', () => {
    let state = start();
    state = applyAction(state, { type: 'NEXT', at: AT }, deps).state;
    const result = applyAction(state, { type: 'FINISH_GAME', at: AT + 5000 }, deps);

    expect(result.state.phase).toBe('GAME_RESULTS');
    expect(result.state.summary?.totalQuestions).toBe(0);
    expect(result.events.at(-1)?.type).toBe('GAME_FINISHED');
  });

  it('la dificultad adaptativa se mueve durante la partida', () => {
    const config = makeConfig({ formatId: 'normal', difficultyId: 'presidente' });
    const { state } = playGame(config, deps);
    expect(state.adaptive.skillRating).toBeGreaterThan(6);

    const fija = playGame({ ...config, adaptiveDifficulty: false }, deps);
    expect(fija.state.adaptive.skillRating).toBe(6);
  });
});
