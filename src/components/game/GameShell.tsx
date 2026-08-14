'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Aviso, Cargando, ErrorNote } from '@/components/ui/Feedback';
import { Papel } from '@/components/ui/Surfaces';
import { GAME } from '@/domain/copy/ui';
import { applyAction, createGameState, type EngineDeps } from '@/domain/engine/machine';
import { toEnvelope, type EngineEvent } from '@/domain/engine/engine-events';
import { getGameFormat } from '@/domain/rounds/formats';
import type { GameAction, GameActionInput } from '@/domain/engine/actions';
import type { GameConfig, GameState } from '@/domain/engine/state';
import type { AnswerSubmission, Question } from '@/domain/questions/types';
import type { PowerUpId } from '@/domain/powerups/powerups';

import { EventCartela, IntroCartela, RoundIntroCartela, RoundResultsCartela } from './Cartelas';
import { FinalBetSetup } from './FinalBetSetup';
import { Hud } from './Hud';
import { PowerUpBar } from './PowerUpBar';
import { QuestionStage } from './QuestionStage';
import { RevealPanel } from './RevealPanel';
import { TimeBar } from './TimeBar';

/** Tiempo que se muestra el "respuesta registrada" antes de revelar. */
const LOCK_TO_REVEAL_MS = 550;
/** Auto-avance del revelado (el botón siempre está disponible para ir antes). */
const REVEAL_AUTO_SECONDS = 7;
const STORAGE_VERSION = 2;

type StoredGame = { v: number; gameId: string; state: GameState };

/**
 * GAME SHELL — el único componente con estado de la partida.
 *
 * Aquí NO hay reglas de juego: todas las decisiones las toma `applyAction` (dominio
 * puro). Este componente se limita a:
 *   · despachar acciones con la hora actual,
 *   · llevar temporizadores y auto-avances,
 *   · guardar la partida en sessionStorage (recargar no la pierde),
 *   · sincronizar con el servidor (registro de respuestas y cierre).
 *
 * En Fase 3, `dispatch` pasará a enviar la acción por WebSocket y el estado llegará
 * del servidor; el resto de este fichero apenas cambia.
 */
export function GameShell({
  gameId,
  config,
  pool,
}: {
  gameId: string;
  config: GameConfig;
  pool: Question[];
}) {
  const router = useRouter();
  const deps = useMemo<EngineDeps>(() => ({ pool }), [pool]);
  const storageKey = `ahqv:partida:${gameId}`;

  const [state, setState] = useState<GameState>(() => createGameState({ gameId, config }));
  const stateRef = useRef(state);
  const [ready, setReady] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);
  const [closing, setClosing] = useState<'idle' | 'saving' | 'error'>('idle');
  const [now, setNow] = useState(() => Date.now());
  const [revealSecondsLeft, setRevealSecondsLeft] = useState(0);

  const postedRef = useRef<Set<string>>(new Set());
  const finishRef = useRef(false);
  const timeUpRef = useRef(-1);

  // ── Sincronización con el servidor ────────────────────────────────────────────

  const postAnswer = useCallback(
    async (next: GameState, events: EngineEvent[]) => {
      const answer = next.answers[next.answers.length - 1];
      if (!answer) return;
      if (postedRef.current.has(answer.questionId)) return;
      postedRef.current.add(answer.questionId);

      try {
        const response = await fetch(`/api/games/${gameId}/answers`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            answer,
            totalScore: next.score,
            events: events.map(toEnvelope),
          }),
        });
        if (!response.ok) setSyncFailed(true);
      } catch {
        setSyncFailed(true);
      }
    },
    [gameId],
  );

  const postFinish = useCallback(
    async (next: GameState, events: EngineEvent[]) => {
      setClosing('saving');
      try {
        const response = await fetch(`/api/games/${gameId}/finish`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            totalScore: next.score,
            bestStreak: next.streak.best,
            startedAt: next.startedAt,
            events: events.map(toEnvelope),
          }),
        });
        if (!response.ok) {
          setClosing('error');
          return;
        }
        try {
          sessionStorage.removeItem(storageKey);
        } catch {
          /* almacenamiento no disponible: da igual, la partida ya está cerrada */
        }
        router.replace(`/resultados/${gameId}`);
      } catch {
        setClosing('error');
      }
    },
    [gameId, router, storageKey],
  );

  // ── Despacho ─────────────────────────────────────────────────────────────────

  const dispatch = useCallback(
    (action: GameAction) => {
      const result = applyAction(stateRef.current, action, deps);
      if (result.state === stateRef.current && result.events.length === 0) return;

      stateRef.current = result.state;
      setState(result.state);

      if (result.events.some((event) => event.type === 'ANSWER_REVEALED')) {
        void postAnswer(result.state, result.events);
      }
      if (result.events.some((event) => event.type === 'GAME_FINISHED') && !finishRef.current) {
        finishRef.current = true;
        void postFinish(result.state, result.events);
      }
    },
    [deps, postAnswer, postFinish],
  );

  /** Despacha una acción poniéndole la hora actual: el motor nunca lee el reloj. */
  const act = useCallback(
    (action: GameActionInput) => {
      dispatch({ ...action, at: Date.now() });
    },
    [dispatch],
  );

  // ── Restauración de la partida en curso ──────────────────────────────────────

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const stored = JSON.parse(raw) as StoredGame;
        if (stored.v === STORAGE_VERSION && stored.gameId === gameId && stored.state) {
          stateRef.current = stored.state;
          setState(stored.state);
          for (const answer of stored.state.answers) postedRef.current.add(answer.questionId);
        }
      }
    } catch {
      /* si el almacenamiento falla, se empieza de cero */
    }
    setReady(true);
  }, [gameId, storageKey]);

  useEffect(() => {
    if (!ready) return;
    if (state.phase === 'GAME_RESULTS') return;
    try {
      const payload: StoredGame = { v: STORAGE_VERSION, gameId, state };
      sessionStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      /* sin almacenamiento la partida sigue, solo no se puede recargar */
    }
  }, [state, ready, gameId, storageKey]);

  // ── Reloj ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (state.phase !== 'QUESTION') return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [state.phase, state.questionIndex]);

  const active = state.currentQuestion;
  const totalMs = active ? active.timeLimitSeconds * 1000 : 0;
  const remainingMs =
    active && state.phase === 'QUESTION' ? Math.max(0, active.startedAt + totalMs - now) : totalMs;

  useEffect(() => {
    if (state.phase !== 'QUESTION' || !active) return;
    if (remainingMs > 0) return;
    if (timeUpRef.current === state.questionIndex) return;
    timeUpRef.current = state.questionIndex;
    act({ type: 'TIME_UP' });
  }, [remainingMs, state.phase, state.questionIndex, active, act]);

  // ── Bloqueo → revelado ──────────────────────────────────────────────────────

  useEffect(() => {
    if (state.phase !== 'ANSWER_LOCKED') return;
    const id = setTimeout(() => act({ type: 'REVEAL' }), LOCK_TO_REVEAL_MS);
    return () => clearTimeout(id);
  }, [state.phase, state.questionIndex, act]);

  // ── Auto-avance del revelado ────────────────────────────────────────────────

  useEffect(() => {
    if (state.phase !== 'REVEAL') {
      setRevealSecondsLeft(0);
      return;
    }
    let left = REVEAL_AUTO_SECONDS;
    setRevealSecondsLeft(left);
    const id = setInterval(() => {
      left -= 1;
      setRevealSecondsLeft(left);
      if (left <= 0) {
        clearInterval(id);
        act({ type: 'NEXT' });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [state.phase, state.questionIndex, act]);

  // ── Pistas automáticas de ¿QUIÉN ES? ────────────────────────────────────────

  useEffect(() => {
    if (state.phase !== 'QUESTION' || !active) return;
    if (active.question.type !== 'WHO_IS_IT') return;
    if (active.cluesRevealed >= active.question.clues.length) return;
    const id = setTimeout(
      () => act({ type: 'REVEAL_CLUE' }),
      active.question.clueIntervalSeconds * 1000,
    );
    return () => clearTimeout(id);
  }, [state.phase, active, act]);

  // ── Render ───────────────────────────────────────────────────────────────────

  if (!ready) return <Cargando />;

  const format = getGameFormat(state.config.formatId);
  const roundDefinition = format.rounds[state.roundIndex];
  const roundProgress = state.rounds[state.roundIndex];
  const isLastRound = state.roundIndex >= format.rounds.length - 1;
  const isLastQuestion =
    isLastRound && roundDefinition ? state.questionInRound >= roundDefinition.questionCount : false;

  const onSubmit = (submission: AnswerSubmission) => act({ type: 'SUBMIT_ANSWER', submission });
  const onUsePowerUp = (powerUpId: PowerUpId) => act({ type: 'USE_POWER_UP', powerUpId });

  const stagePhase =
    state.phase === 'QUESTION' || state.phase === 'ANSWER_LOCKED' || state.phase === 'REVEAL'
      ? state.phase
      : null;
  const playingPhase = stagePhase !== null;

  return (
    <div className="pb-10">
      {playingPhase || state.phase === 'FINAL_ROUND' ? <Hud state={state} /> : null}

      <div className="mx-auto max-w-3xl px-4 py-5">
        {syncFailed ? (
          <Aviso className="mb-4">
            <strong>Aviso:</strong> {GAME.syncError}
          </Aviso>
        ) : null}

        {state.notices.length > 0 && playingPhase ? (
          <Aviso className="mb-4">{state.notices[state.notices.length - 1]}</Aviso>
        ) : null}

        {state.phase === 'INTRO' ? (
          <IntroCartela state={state} onStart={() => act({ type: 'START_GAME' })} />
        ) : null}

        {state.phase === 'ROUND_INTRO' && roundDefinition ? (
          <RoundIntroCartela
            round={roundDefinition}
            roundIndex={state.roundIndex}
            totalRounds={format.rounds.length}
            onStart={() => act({ type: 'NEXT' })}
          />
        ) : null}

        {state.phase === 'EVENT' && state.pendingEvent ? (
          <EventCartela eventId={state.pendingEvent.id} onContinue={() => act({ type: 'NEXT' })} />
        ) : null}

        {state.phase === 'FINAL_ROUND' && active ? (
          <FinalBetSetup
            active={active}
            score={state.score}
            onPlaceBet={(wager) => act({ type: 'PLACE_BET', wager })}
          />
        ) : null}

        {stagePhase && active ? (
          <div className="space-y-4">
            <TimeBar
              remainingMs={remainingMs}
              totalMs={totalMs}
              paused={state.phase !== 'QUESTION'}
            />

            {state.phase === 'ANSWER_LOCKED' ? (
              <p
                className="texto-cartel border-2 border-tinta bg-azul-claro px-3 py-2 text-center text-white"
                role="status"
              >
                ✓ {GAME.lockedNotice}
              </p>
            ) : null}

            <QuestionStage
              active={active}
              phase={stagePhase}
              reveal={state.phase === 'REVEAL' ? state.lastReveal : undefined}
              submitted={state.pendingSubmission?.submission ?? state.lastReveal?.submitted}
              onSubmit={onSubmit}
              onRevealClue={() => act({ type: 'REVEAL_CLUE' })}
            />

            {state.phase === 'QUESTION' ? (
              <PowerUpBar state={state} active={active} onUse={onUsePowerUp} />
            ) : null}

            {state.phase === 'REVEAL' && state.lastReveal ? (
              <RevealPanel
                reveal={state.lastReveal}
                onNext={() => act({ type: 'NEXT' })}
                secondsLeft={revealSecondsLeft}
                isLast={isLastQuestion}
              />
            ) : null}
          </div>
        ) : null}

        {state.phase === 'ROUND_RESULTS' && roundProgress ? (
          <RoundResultsCartela
            progress={roundProgress}
            isLastRound={isLastRound}
            totalScore={state.score}
            onNext={() => act({ type: 'NEXT' })}
          />
        ) : null}

        {state.phase === 'GAME_RESULTS' ? (
          <Papel className="p-6 text-center">
            <p className="texto-cartel text-2xl">Cerrando el acta</p>
            <p className="marcador mt-2 text-5xl text-verde-portal">{state.score}</p>
            {closing === 'error' ? (
              <div className="mt-4 space-y-3">
                <ErrorNote titulo="No se ha podido guardar el acta">
                  Revisa la conexión y vuelve a intentarlo. Tu puntuación sigue aquí.
                </ErrorNote>
                <button
                  type="button"
                  className="btn btn-verde btn-lg"
                  onClick={() => {
                    finishRef.current = true;
                    void postFinish(state, []);
                  }}
                >
                  Reintentar
                </button>
              </div>
            ) : (
              <p className="texto-sello mt-3 text-tinta-tenue">Guardando resultados…</p>
            )}
          </Papel>
        ) : null}

        {playingPhase || state.phase === 'FINAL_ROUND' ? (
          <p className="mt-8 text-center">
            <button
              type="button"
              className="btn btn-fantasma btn-sm"
              onClick={() => {
                if (window.confirm(GAME.abandonConfirm)) act({ type: 'FINISH_GAME' });
              }}
            >
              {GAME.abandon}
            </button>
          </p>
        ) : null}
      </div>
    </div>
  );
}
