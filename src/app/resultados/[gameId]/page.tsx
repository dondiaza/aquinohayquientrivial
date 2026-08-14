import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { startSoloGame } from '@/app/jugar/actions';
import { LinkButton } from '@/components/ui/Button';
import { Chip, Nota, Papel, Placa, Sello } from '@/components/ui/Surfaces';
import { ErrorNote } from '@/components/ui/Feedback';
import { RESULTS } from '@/domain/copy/ui';
import { categoryLabel } from '@/domain/questions/categories';
import { getDifficultyLevel } from '@/domain/difficulty/levels';
import { getGameFormat } from '@/domain/rounds/formats';
import { questionTypeMeta } from '@/domain/questions/registry';
import { POWER_UPS, type PowerUpId } from '@/domain/powerups/powerups';
import { nextRank, rankById } from '@/domain/ranks/ranks';
import { getFinishedGame } from '@/server/games/service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Resultados' };

function Stat({
  label,
  value,
  hint,
  big = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  big?: boolean;
}) {
  return (
    <div className="border border-linea bg-white/40 p-3">
      <p className="texto-sello text-tinta-tenue">{label}</p>
      <p className={`marcador ${big ? 'text-4xl' : 'text-2xl'}`}>{value}</p>
      {hint ? <p className="text-xs text-tinta-suave">{hint}</p> : null}
    </div>
  );
}

function formatSeconds(ms: number): string {
  if (ms <= 0) return '—';
  return `${(ms / 1000).toFixed(1)} s`;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '—';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes} min ${seconds} s` : `${seconds} s`;
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

  const rank = rankById(summary.rankId);
  const upcoming = nextRank(summary.performanceIndex);
  const usedPowerUps = (Object.entries(summary.powerUpsUsed) as [PowerUpId, number][]).filter(
    ([, count]) => count > 0,
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <p className="texto-sello text-tinta-suave">Comunidad de propietarios · acta n.º {gameId.slice(-6)}</p>

      <Placa className="mt-2 px-5 py-5 pt-7">
        <h1 className="text-3xl sm:text-4xl">{RESULTS.title}</h1>
      </Placa>

      {/* ── Rango y marcador ─────────────────────────────────────────────────── */}
      <section className="mt-5 grid gap-4 sm:grid-cols-[1fr_1.2fr]">
        <Nota tone="mostaza" tilt="izq" pin="chincheta" className="p-5 pt-6 text-center">
          <p aria-hidden className="text-5xl">
            {rank.icon}
          </p>
          <p className="texto-sello mt-1">{RESULTS.stats.rank}</p>
          <p className="texto-cartel text-2xl sm:text-3xl">{rank.label}</p>
          <p className="mt-1 text-sm text-tinta-suave">{rank.line}</p>
          {upcoming ? (
            <p className="texto-sello mt-3 text-tinta-tenue">
              Siguiente: {upcoming.label} ({Math.round(upcoming.minIndex * 100)} % de rendimiento)
            </p>
          ) : (
            <p className="texto-sello mt-3 text-tinta-tenue">Techo alcanzado. Enhorabuena.</p>
          )}
        </Nota>

        <Papel className="p-5">
          <p className="texto-sello text-tinta-tenue">{RESULTS.stats.score}</p>
          <p className="marcador text-6xl text-verde-portal">{summary.totalScore}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Chip>{format.label}</Chip>
            <Chip>Dificultad {level.label}</Chip>
            <Chip>{categoryLabel(game.categoryId)}</Chip>
            <Chip>{game.adaptiveDifficulty ? 'Adaptativa' : 'Fija'}</Chip>
            <Chip>{formatDuration(summary.durationMs)}</Chip>
          </div>
          <p className="mt-3 text-sm text-tinta-suave">
            Rendimiento {Math.round(summary.performanceIndex * 100)} % · {summary.totalScore} de{' '}
            {summary.maxPossibleScore} posibles
          </p>
        </Papel>
      </section>

      {/* ── Estadísticas ─────────────────────────────────────────────────────── */}
      <section className="mt-6">
        <h2 className="text-xl">Números</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <Stat
            label={RESULTS.stats.accuracy}
            value={`${summary.accuracyPercent} %`}
            hint={`${summary.correctAnswers} de ${summary.totalQuestions}`}
            big
          />
          <Stat label={RESULTS.stats.correct} value={summary.correctAnswers} />
          <Stat label={RESULTS.stats.wrong} value={summary.wrongAnswers} />
          <Stat label={RESULTS.stats.timeouts} value={summary.timeouts} />
          <Stat label={RESULTS.stats.bestStreak} value={summary.bestStreak} />
          <Stat label={RESULTS.stats.avgTime} value={formatSeconds(summary.averageResponseMs)} />
          <Stat
            label={RESULTS.stats.avgDifficulty}
            value={`${summary.averageDifficulty}/10`}
          />
          <Stat label={RESULTS.stats.bonus} value={summary.bonusPoints} />
          <Stat
            label={RESULTS.stats.wager}
            value={summary.wagerDelta === 0 ? '—' : `${summary.wagerDelta > 0 ? '+' : ''}${summary.wagerDelta}`}
          />
          <Stat
            label={RESULTS.stats.powerUps}
            value={summary.totalPowerUpsUsed}
            hint={
              usedPowerUps.length > 0
                ? usedPowerUps.map(([id, count]) => `${POWER_UPS[id].label} ×${count}`).join(' · ')
                : 'ninguno'
            }
          />
        </div>
      </section>

      {/* ── Por rondas ───────────────────────────────────────────────────────── */}
      <section className="mt-6">
        <h2 className="text-xl">{RESULTS.byRound}</h2>
        <ul className="mt-3 space-y-2">
          {summary.rounds
            .filter((round) => round.answered > 0)
            .map((round) => (
              <li key={round.roundId}>
                <Papel className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <span>
                    <span className="texto-cartel block">{round.title}</span>
                    <span className="text-xs text-tinta-suave">{round.subtitle}</span>
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
                </Papel>
              </li>
            ))}
        </ul>
      </section>

      {/* ── Por tipo de prueba ───────────────────────────────────────────────── */}
      <section className="mt-6">
        <h2 className="text-xl">{RESULTS.byType}</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {summary.byType.map((entry) => {
            const meta = questionTypeMeta(entry.type);
            return (
              <Papel key={entry.type} className="p-3">
                <p className="texto-cartel text-sm">
                  <span aria-hidden className="mr-1">
                    {meta.icon}
                  </span>
                  {meta.label}
                </p>
                <p className="mt-1 text-sm text-tinta-suave">
                  {entry.correct}/{entry.asked} correctas · {entry.points} puntos
                </p>
              </Papel>
            );
          })}
        </div>
      </section>

      {/* ── Acciones ─────────────────────────────────────────────────────────── */}
      <section className="mt-8 flex flex-wrap items-center gap-3">
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
        <LinkButton href="/jugar/solo" tone="papel">
          {RESULTS.changeSetup}
        </LinkButton>
        <LinkButton href="/" tone="fantasma" size="sm">
          {RESULTS.home}
        </LinkButton>
      </section>

      <p className="mt-6">
        <Sello>Contenido demo</Sello>
      </p>
    </div>
  );
}
