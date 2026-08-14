import Link from 'next/link';

import { startSoloGame } from '@/app/jugar/actions';
import { LinkButton } from '@/components/ui/Button';
import { Chip, Nota, Papel, Placa, Sello, Tablon } from '@/components/ui/Surfaces';
import { BRAND, HOME } from '@/domain/copy/ui';
import { DEFAULT_SETUP } from '@/domain/engine/config';
import { GAME_FORMATS } from '@/domain/rounds/formats';
import { countQuestions } from '@/server/questions/repository';
import { recentGames } from '@/server/games/service';
import { readGuestId } from '@/server/guest';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const guestId = await readGuestId();
  const [bank, previous] = await Promise.all([
    countQuestions(),
    guestId ? recentGames(guestId, 3) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      {/* ── Portada ─────────────────────────────────────────────────────────── */}
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div>
          <p className="texto-sello text-tinta-suave">{HOME.kicker}</p>

          <Placa className="mt-3 px-5 py-6 pt-7 sm:px-8 sm:py-8">
            <h1 className="text-[2.4rem] leading-[0.95] sm:text-6xl">{HOME.title}</h1>
            <p className="texto-sello mt-3 text-mostaza-claro">{BRAND.tagline}</p>
          </Placa>

          <p className="mt-4 max-w-prose text-[1.05rem] text-tinta-suave">{HOME.subtitle}</p>

          {/* CTA dominante: una partida en un clic, con la configuración por defecto */}
          <form action={startSoloGame} className="mt-6">
            <input type="hidden" name="formatId" value={DEFAULT_SETUP.formatId} />
            <input type="hidden" name="difficultyId" value={DEFAULT_SETUP.difficultyId} />
            <input type="hidden" name="category" value={DEFAULT_SETUP.category} />
            <input type="hidden" name="adaptiveDifficulty" value="on" />
            <button type="submit" className="btn btn-rojo btn-xl w-full sm:w-auto">
              ▶ {HOME.primaryCta}
            </button>
            <p className="texto-sello mt-2 text-tinta-tenue">
              Partida normal · dificultad vecino · mezcla total
            </p>
          </form>

          <div className="mt-5 flex flex-wrap gap-2">
            <LinkButton href="/jugar/solo" tone="papel">
              {HOME.secondary.solo}
            </LinkButton>
            <LinkButton href="/jugar" tone="papel">
              {HOME.secondary.party}
              <span className="chip ml-1">{HOME.secondary.partyBadge}</span>
            </LinkButton>
            <LinkButton href="/como-jugar" tone="fantasma">
              {HOME.secondary.how}
            </LinkButton>
          </div>
        </div>

        {/* ── Tablón de anuncios ──────────────────────────────────────────────── */}
        <Tablon className="p-4 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {HOME.bullets.map((bullet, index) => (
              <Nota
                key={bullet.title}
                tone={index % 2 === 0 ? 'mostaza' : 'papel'}
                tilt={index % 2 === 0 ? 'izq' : 'der'}
                pin={index % 2 === 0 ? 'chincheta' : 'cinta'}
                className="p-3 pt-4"
              >
                <p className="texto-cartel text-sm">
                  <span aria-hidden className="mr-1 text-base">
                    {bullet.icon}
                  </span>
                  {bullet.title}
                </p>
                <p className="mt-1 text-xs text-tinta-suave">{bullet.text}</p>
              </Nota>
            ))}
          </div>

          <Nota tone="azul" tilt="der" className="mt-4 p-3">
            <p className="texto-sello">Banco de preguntas</p>
            <p className="marcador mt-1 text-2xl">{bank.active}</p>
            <p className="text-xs text-tinta-suave">
              preguntas activas de {bank.total} en total · {Object.keys(bank.byType).length} tipos de prueba
            </p>
            <p className="mt-2">
              <Sello>Contenido demo</Sello>
            </p>
          </Nota>
        </Tablon>
      </section>

      {/* ── Formatos ────────────────────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="text-xl sm:text-2xl">Tres duraciones</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {GAME_FORMATS.map((format) => (
            <Papel key={format.id} className="p-4">
              <p className="texto-cartel text-lg">{format.label}</p>
              <p className="texto-sello text-tinta-tenue">{format.estimatedMinutes}</p>
              <p className="mt-2 text-sm text-tinta-suave">{format.tagline}</p>
              <p className="mt-3 flex flex-wrap gap-1">
                {format.rounds.map((round) => (
                  <Chip key={round.id}>{round.title}</Chip>
                ))}
              </p>
            </Papel>
          ))}
        </div>
      </section>

      {/* ── Partidas recientes del invitado ─────────────────────────────────── */}
      {previous.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-xl sm:text-2xl">Tus últimas partidas</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {previous.map((game) => (
              <li key={game.id}>
                <Link
                  href={`/resultados/${game.id}`}
                  className="papel block p-3 transition-transform hover:-translate-y-0.5"
                >
                  <span className="marcador block text-2xl">{game.totalScore}</span>
                  <span className="texto-sello block text-tinta-tenue">
                    {game.formatId} · {game.difficultyId}
                  </span>
                  <span className="mt-1 block text-xs underline">Ver acta</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── Aviso de contenido demo ─────────────────────────────────────────── */}
      <section className="mt-10">
        <Nota tone="papel" className="p-4">
          <p className="texto-sello">Aviso de contenido</p>
          <p className="mt-1 max-w-prose text-sm text-tinta-suave">{HOME.demoNotice}</p>
        </Nota>
      </section>
    </div>
  );
}
