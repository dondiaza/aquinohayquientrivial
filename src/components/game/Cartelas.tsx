'use client';

import { Chip } from '@/components/ui/Surfaces';
import {
  ApartmentPlaque,
  ElevatorDisplay,
  PaperNotice,
} from '@/components/portal/Estructuras';
import { GameShowBanner, RarityBadge, TVFrame } from '@/components/portal/Espectaculo';
import type { Tarjeta } from '@/content/anhqv/catalogos';
import { SERIE } from '@/content/serie';
import { GAME } from '@/domain/copy/ui';
import { getGameEvent } from '@/domain/events/game-events';
import { getDifficultyLevel } from '@/domain/difficulty/levels';
import { categoryLabel } from '@/domain/questions/categories';
import { getGameFormat, type RoundDefinition } from '@/domain/rounds/formats';
import { questionTypeMeta } from '@/domain/questions/registry';
import type { GameState, RoundProgress } from '@/domain/engine/state';

/** INTRO: cartela de apertura en pantalla de televisión. */
export function IntroCartela({ state, onStart }: { state: GameState; onStart: () => void }) {
  const format = getGameFormat(state.config.formatId);
  const level = getDifficultyLevel(state.config.difficultyId);
  const total = format.rounds.reduce((sum, round) => sum + round.questionCount, 0);

  return (
    <div className="space-y-4">
      <TVFrame canal="PORTAL TV">
        <p className="text-center text-[0.7rem] opacity-80">
          {SERIE.direccionFicticia.toUpperCase()} · {SERIE.cadena.toUpperCase()} {'·'}{' '}
          2003-2006
        </p>
        <p
          className="mt-1 text-center text-[clamp(1.5rem,7vw,2.6rem)] leading-none"
          style={{ fontFamily: 'var(--font-cartel)' }}
        >
          {GAME.introTitle}
        </p>
        <p className="mt-2 text-center text-xs opacity-80">{GAME.introLine}</p>
      </TVFrame>

      <PaperNotice tono="papel" className="p-4">
        <div className="flex flex-wrap justify-center gap-1.5">
          <Chip>{format.label}</Chip>
          <Chip>{format.estimatedMinutes}</Chip>
          <Chip>{total} preguntas</Chip>
          <Chip>Dificultad {level.label}</Chip>
          <Chip>{categoryLabel(state.config.category)}</Chip>
          {state.config.adaptiveDifficulty ? <Chip>Adaptativa</Chip> : <Chip>Fija</Chip>}
          {state.config.seedLabel ? (
            <Chip className="border-morado-junta text-morado-junta">{state.config.seedLabel}</Chip>
          ) : null}
        </div>

        <ol className="mt-4 space-y-1 text-sm">
          {format.rounds.map((round, index) => (
            <li key={round.id} className="flex items-baseline gap-2">
              <span className="texto-sello text-tinta-tenue">{index + 1}</span>
              <span aria-hidden>{round.icon}</span>
              <span className="font-semibold">{round.title}</span>
              <span className="text-tinta-tenue">· {round.questionCount}</span>
            </li>
          ))}
        </ol>
      </PaperNotice>

      <button type="button" className="btn btn-rojo btn-xl w-full" onClick={onStart} autoFocus>
        ▶ {GAME.introCta}
      </button>
    </div>
  );
}

/** ROUND_INTRO: cada ronda tiene identidad propia (nombre, icono, regla y premio). */
export function RoundIntroCartela({
  round,
  roundIndex,
  totalRounds,
  anuncio,
  onStart,
}: {
  round: RoundDefinition;
  roundIndex: number;
  totalRounds: number;
  anuncio?: string;
  onStart: () => void;
}) {
  const modificadores = round.modifiers ?? [];

  return (
    <div className="space-y-4">
      <GameShowBanner
        kicker={`${GAME.round} ${roundIndex + 1} de ${totalRounds}`}
        titulo={round.title}
        linea={round.subtitle}
        tono={
          round.accent === 'granate'
            ? 'granate'
            : round.accent === 'morado'
              ? 'morado'
              : round.accent === 'verde'
                ? 'verde'
                : 'mostaza'
        }
      />

      <PaperNotice tono="papel" giro="izq" sujecion="cinta" className="p-4 pt-5">
        <p aria-hidden className="text-center text-4xl">
          {round.icon}
        </p>
        <p className="mt-2 text-center text-base">{round.line}</p>
        {round.rule ? (
          <p className="escrito-a-mano mt-2 text-center text-lg text-granate">{round.rule}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          <Chip>{round.questionCount} preguntas</Chip>
          {round.allowedTypes.map((type) => (
            <Chip key={type}>{questionTypeMeta(type).short}</Chip>
          ))}
          {modificadores.map((modifier) => (
            <RarityBadge key={modifier.id} rareza={modifier.multiplier >= 1.5 ? 'raro' : 'curioso'}>
              {modifier.label} ×{modifier.multiplier}
            </RarityBadge>
          ))}
          {round.timeScale && round.timeScale !== 1 ? (
            <Chip className="border-azul-impreso text-azul-impreso">
              Tiempo ×{round.timeScale}
            </Chip>
          ) : null}
        </div>

        {round.progressStyle === 'ascensor' ? (
          <div className="mt-3 flex items-center justify-center gap-2">
            <ElevatorDisplay planta={0} plantas={round.questionCount} etiqueta="Sube una planta por acierto" />
          </div>
        ) : null}
      </PaperNotice>

      {anuncio ? <p className="texto-sello text-center text-tinta-suave">{anuncio}</p> : null}

      <button type="button" className="btn btn-verde btn-lg w-full" onClick={onStart} autoFocus>
        {GAME.startRound}
      </button>
    </div>
  );
}

/** EVENT: la cartela del suceso que altera la siguiente pregunta. */
export function EventCartela({
  eventId,
  anuncio,
  onContinue,
}: {
  eventId: Parameters<typeof getGameEvent>[0];
  anuncio?: string;
  onContinue: () => void;
}) {
  const event = getGameEvent(eventId);

  return (
    <div className="space-y-4">
      <PaperNotice
        tono={event.accent === 'azul' ? 'azul' : event.accent === 'rojo' ? 'rosa' : 'mostaza'}
        giro="der"
        sujecion="chincheta"
        className="anim-aparecer-escala p-5 pt-6 text-center"
      >
        <p className="texto-sello">{anuncio ?? 'Aviso en el tablón'}</p>
        <p aria-hidden className="mt-1 text-5xl">
          {event.icon}
        </p>
        <h2 className="mt-2 text-3xl">{event.title}</h2>
        <p className="mt-2 text-sm text-tinta-suave">{event.line}</p>
        <p className="texto-cartel mt-3 border-2 border-tinta bg-papel px-3 py-2 text-base">
          {event.consequence}
        </p>
        <p className="mt-3">
          <RarityBadge rareza={event.rareza}>{event.id.replaceAll('_', ' ')}</RarityBadge>
        </p>
      </PaperNotice>

      <button type="button" className="btn btn-rojo btn-lg w-full" onClick={onContinue} autoFocus>
        {GAME.continue}
      </button>
    </div>
  );
}

/** ROUND_RESULTS: cierre de ronda con lo conseguido. */
/**
 * Tarjeta del portal: un dato del pack editorial entre ronda y ronda. Es el rato en el
 * que el jugador respira, así que en lugar de una pantalla vacía se aprende algo.
 */
export function TarjetaDelPortal({ tarjeta }: { tarjeta: Tarjeta }) {
  return (
    <PaperNotice tono="mostaza" giro="der" sujecion="chincheta" className="p-4 pt-5">
      <p className="texto-sello text-center text-tinta-tenue">
        Tarjeta del portal · {tarjeta.categoria}
      </p>
      <p className="mt-2 text-center text-sm text-tinta-suave">{tarjeta.anverso}</p>
      <p
        className="mt-1 text-center text-[clamp(1.1rem,4.5vw,1.5rem)] leading-tight"
        style={{ fontFamily: 'var(--font-cuerpo)', fontWeight: 600 }}
      >
        {tarjeta.reverso}
      </p>
      <p className="mt-2 text-center text-xs text-tinta-suave">{tarjeta.nota}</p>
    </PaperNotice>
  );
}

export function RoundResultsCartela({
  progress,
  isLastRound,
  totalScore,
  tarjeta,
  onNext,
}: {
  progress: RoundProgress;
  isLastRound: boolean;
  totalScore: number;
  /** Curiosidad del pack para el descanso. Opcional: si no hay, no se muestra nada. */
  tarjeta?: Tarjeta | undefined;
  onNext: () => void;
}) {
  const pleno = progress.answered > 0 && progress.correct === progress.answered;

  return (
    <div className="space-y-4">
      <ApartmentPlaque
        vivienda="Fin de la ronda"
        titulo={progress.title}
        tono={pleno ? 'verde' : 'azul'}
      />

      <PaperNotice tono="papel" className="p-4">
        <dl className="grid grid-cols-3 gap-3 text-center">
          <div>
            <dt className="texto-sello text-tinta-tenue">Aciertos</dt>
            <dd className="marcador text-2xl">
              {progress.correct}/{progress.answered}
            </dd>
          </div>
          <div>
            <dt className="texto-sello text-tinta-tenue">Puntos ronda</dt>
            <dd className="marcador text-2xl">{progress.points}</dd>
          </div>
          <div>
            <dt className="texto-sello text-tinta-tenue">Total</dt>
            <dd className="marcador text-2xl text-verde-portal">{totalScore}</dd>
          </div>
        </dl>

        {pleno ? (
          <p className="texto-cartel anim-sellar mt-3 text-center text-verde-portal">
            ✔ Ronda impecable
          </p>
        ) : null}
      </PaperNotice>

      {tarjeta && !isLastRound ? <TarjetaDelPortal tarjeta={tarjeta} /> : null}

      <button type="button" className="btn btn-verde btn-lg w-full" onClick={onNext} autoFocus>
        {isLastRound ? GAME.finish : GAME.continue}
      </button>
    </div>
  );
}
