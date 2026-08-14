import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { startDailyChallenge, startSoloGame } from '@/app/jugar/actions';
import { LinkButton } from '@/components/ui/Button';
import { Chip, Sello } from '@/components/ui/Surfaces';
import { ErrorNote } from '@/components/ui/Feedback';
import { ApartmentPlaque, PaperNotice } from '@/components/portal/Estructuras';
import { ResultsCeremony, type DatosCeremonia } from '@/components/game/ResultsCeremony';
import { ShareCard } from '@/components/game/ShareCard';
import { RESULTS } from '@/domain/copy/ui';
import { categoryLabel } from '@/domain/questions/categories';
import { getDifficultyLevel } from '@/domain/difficulty/levels';
import { getGameFormat } from '@/domain/rounds/formats';
import { questionTypeMeta } from '@/domain/questions/registry';
import { POWER_UPS, type PowerUpId } from '@/domain/powerups/powerups';
import { rankById } from '@/domain/ranks/ranks';
import { getFinishedGame } from '@/server/games/service';
import { progresionDeLaPartida } from '@/server/players/service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Resultados' };

/** Dato curioso derivado de la propia partida: nunca inventado. */
function datoCurioso(input: {
  masRapidaMs: number | null;
  comodines: number;
  timeouts: number;
  mejorRacha: number;
  dificultadMedia: number;
}): string {
  if (input.masRapidaMs !== null && input.masRapidaMs < 2500) {
    return `Tu respuesta más rápida llegó en ${(input.masRapidaMs / 1000).toFixed(1)} segundos. Ni el portero abre tan rápido.`;
  }
  if (input.mejorRacha >= 5) {
    return `Encadenaste ${input.mejorRacha} aciertos: en el rellano ya se habla de ti.`;
  }
  if (input.comodines === 0) {
    return 'No pediste un solo favor a nadie. El portal lo respeta.';
  }
  if (input.timeouts >= 2) {
    return `Dejaste ${input.timeouts} preguntas sin contestar. El ascensor también se queda a medias.`;
  }
  return `Dificultad media ${input.dificultadMedia}/10: una junta de las normales.`;
}

export default async function ResultsPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const game = await getFinishedGame(gameId);
  if (!game) notFound();

  const format = getGameFormat(game.formatId);
  const level = getDifficultyLevel(game.difficultyId);
  const summary = game.summary;

  if (!summary) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
        <ErrorNote titulo={RESULTS.unfinished}>
          La partida se quedó a medias, así que no hay acta que leer. Puedes empezar otra.
        </ErrorNote>
        <div className="flex flex-wrap gap-2">
          <LinkButton href={`/partida/${gameId}`} tone="papel">
            Continuar la partida
          </LinkButton>
          <LinkButton href="/jugar/solo">Configurar otra</LinkButton>
        </div>
      </div>
    );
  }

  const rangoPartida = rankById(summary.rankId);
  const progresion = await progresionDeLaPartida(
    gameId,
    game.guestId,
    game.formatId,
    game.difficultyId,
    summary.totalScore,
  );

  const usedPowerUps = (Object.entries(summary.powerUpsUsed) as [PowerUpId, number][]).filter(
    ([, count]) => count > 0,
  );

  const datos: DatosCeremonia = {
    puntos: summary.totalScore,
    precision: summary.accuracyPercent,
    correctas: summary.correctAnswers,
    totalPreguntas: summary.totalQuestions,
    mejorRacha: summary.bestStreak,
    tiempoMedioMs: summary.averageResponseMs,
    masRapidaMs: summary.fastestCorrectMs,
    dificultadMedia: summary.averageDifficulty,
    bonus: summary.bonusPoints,
    apuesta: summary.wagerDelta,
    comodines: summary.totalPowerUpsUsed,
    rangoPartidaLabel: rangoPartida.label,
    rangoPartidaIcono: rangoPartida.icon,
    rangoPartidaLinea: rangoPartida.line,
    rendimiento: summary.performanceIndex,
    categoriaFavorita: summary.favouriteCategory ? categoryLabel(summary.favouriteCategory) : null,
    categoriaDificil: summary.hardestCategory ? categoryLabel(summary.hardestCategory) : null,
    xpGanada: summary.xpEarned,
    xpTotal: progresion.perfil.xp,
    rangoJugadorId: progresion.perfil.rangoId,
    esRecord: progresion.esRecord,
    recordAnterior:
      progresion.recordActual !== null && !progresion.esRecord ? progresion.recordActual : null,
    logros: progresion.logros,
    avatar: {
      arquetipo: progresion.perfil.arquetipo,
      color: progresion.perfil.colorAvatar,
      marco: progresion.perfil.marco,
    },
    nombre: progresion.perfil.displayName,
    datoCurioso: datoCurioso({
      masRapidaMs: summary.fastestCorrectMs,
      comodines: summary.totalPowerUpsUsed,
      timeouts: summary.timeouts,
      mejorRacha: summary.bestStreak,
      dificultadMedia: summary.averageDifficulty,
    }),
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <p className="texto-sello text-tinta-suave">
        Comunidad de propietarios · acta n.º {gameId.slice(-6)}
      </p>

      <ApartmentPlaque
        vivienda={
          game.origin === 'RETO_DIARIO'
            ? `Reto del día ${game.dailyKey ?? ''}`
            : game.origin === 'DESAFIO'
              ? `Desafío ${game.seedLabel ?? ''}`
              : 'Partida libre'
        }
        titulo={RESULTS.title}
        className="mt-2"
      />

      <div className="mt-5">
        <ResultsCeremony datos={datos} />
      </div>

      {/* ── Ficha técnica ────────────────────────────────────────────────────── */}
      <section className="mt-6">
        <h2 className="text-xl">Ficha de la partida</h2>
        <PaperNotice tono="papel" className="mt-3 p-4">
          <div className="flex flex-wrap gap-1.5">
            <Chip>{format.label}</Chip>
            <Chip>Dificultad {level.label}</Chip>
            <Chip>{categoryLabel(game.categoryId)}</Chip>
            <Chip>{game.adaptiveDifficulty ? 'Adaptativa' : 'Fija'}</Chip>
            {game.seedLabel ? (
              <Chip className="border-morado-junta text-morado-junta">{game.seedLabel}</Chip>
            ) : null}
          </div>
          {usedPowerUps.length > 0 ? (
            <p className="mt-3 text-sm text-tinta-suave">
              Comodines:{' '}
              {usedPowerUps.map(([id, count]) => `${POWER_UPS[id].label} ×${count}`).join(' · ')}
            </p>
          ) : null}
        </PaperNotice>
      </section>

      {/* ── Por rondas ───────────────────────────────────────────────────────── */}
      <section className="mt-6">
        <h2 className="text-xl">{RESULTS.byRound}</h2>
        <ul className="mt-3 space-y-2">
          {summary.rounds
            .filter((round) => round.answered > 0)
            .map((round) => {
              const definicion = format.rounds.find((item) => item.id === round.roundId);
              return (
                <li key={round.roundId}>
                  <div className="papel flex flex-wrap items-center justify-between gap-3 p-3">
                    <span>
                      <span className="texto-cartel block">
                        {definicion?.icon ? <span aria-hidden>{definicion.icon} </span> : null}
                        {round.title}
                      </span>
                      <span className="text-xs text-tinta-suave">{definicion?.subtitle}</span>
                    </span>
                    <span className="flex items-center gap-4">
                      <span className="text-center">
                        <span className="texto-sello block text-tinta-tenue">Aciertos</span>
                        <span className="marcador">
                          {round.correct}/{round.answered}
                        </span>
                      </span>
                      <span className="text-center">
                        <span className="texto-sello block text-tinta-tenue">Puntos</span>
                        <span className="marcador">{round.points}</span>
                      </span>
                    </span>
                  </div>
                </li>
              );
            })}
        </ul>
      </section>

      {/* ── Por tipo de prueba ───────────────────────────────────────────────── */}
      <section className="mt-6">
        <h2 className="text-xl">{RESULTS.byType}</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {summary.byType.map((entry) => {
            const meta = questionTypeMeta(entry.type);
            return (
              <div key={entry.type} className="papel p-3">
                <p className="texto-cartel text-sm">
                  <span aria-hidden className="mr-1">
                    {meta.icon}
                  </span>
                  {meta.label}
                </p>
                <p className="mt-1 text-sm text-tinta-suave">
                  {entry.correct}/{entry.asked} correctas · {entry.points} puntos
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Acciones ─────────────────────────────────────────────────────────── */}
      <section className="mt-8 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {game.origin === 'RETO_DIARIO' ? (
            <LinkButton href="/reto" tone="rojo" size="lg">
              Ver el tablón del día
            </LinkButton>
          ) : (
            <form action={startSoloGame}>
              <input type="hidden" name="formatId" value={game.formatId} />
              <input type="hidden" name="difficultyId" value={game.difficultyId} />
              <input type="hidden" name="category" value={game.categoryId} />
              {game.adaptiveDifficulty ? (
                <input type="hidden" name="adaptiveDifficulty" value="on" />
              ) : null}
              <button type="submit" className="btn btn-rojo btn-lg">
                ▶ {RESULTS.playAgain}
              </button>
            </form>
          )}

          <LinkButton href="/jugar/solo" tone="papel">
            {RESULTS.changeSetup}
          </LinkButton>
          <LinkButton href="/perfil" tone="papel">
            Tu ficha
          </LinkButton>
          <LinkButton href="/" tone="fantasma" size="sm">
            {RESULTS.home}
          </LinkButton>
        </div>

        {game.origin !== 'RETO_DIARIO' ? (
          <form action={startDailyChallenge}>
            <button type="submit" className="btn btn-mostaza btn-sm">
              🗓️ Probar el reto del día
            </button>
          </form>
        ) : null}

        <ShareCard
          datos={{
            titulo: 'El Trivial de la Comunidad',
            puntos: summary.totalScore,
            rango: rangoPartida.label,
            precision: summary.accuracyPercent,
            mejorRacha: summary.bestStreak,
            formato: `${format.label} · ${level.label}`,
            etiqueta: game.seedLabel,
          }}
          url="aquinohayquientrivial.vercel.app"
        />
      </section>

      <p className="mt-6">
        <Sello>Contenido demo</Sello>
      </p>
    </div>
  );
}
