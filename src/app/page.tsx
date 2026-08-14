import Link from 'next/link';

import { startSoloGame } from '@/app/jugar/actions';
import { LinkButton } from '@/components/ui/Button';
import { Chip, Sello } from '@/components/ui/Surfaces';
import {
  ApartmentPlaque,
  DoorCard,
  ElevatorDisplay,
  IntercomPanel,
  NoticeBoard,
  PaperNotice,
} from '@/components/portal/Estructuras';
import { MailboxWall } from '@/components/portal/MailboxWall';
import { GossipTicker } from '@/components/portal/Espectaculo';
import { NeighbourAvatar } from '@/components/portal/Avatar';
import { PortalFacade } from '@/components/portal/PortalScene';
import { BRAND, HOME } from '@/domain/copy/ui';
import { RUMORES_TICKER } from '@/domain/copy/announcer';
import { DEFAULT_SETUP } from '@/domain/engine/config';
import { GAME_FORMATS } from '@/domain/rounds/formats';
import { QUESTION_TYPE_LIST } from '@/domain/questions/registry';
import { claveDelDia, configuracionDelReto } from '@/domain/challenges/daily';
import { rangoPorId } from '@/domain/progression/progression';
import { LOGROS } from '@/domain/achievements/achievements';
import { countQuestions } from '@/server/questions/repository';
import { recentGames } from '@/server/games/service';
import { obtenerPerfil, resultadoDelDia } from '@/server/players/service';
import { currentGuestPlayerId, readGuestId } from '@/server/guest';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [guestPublicId, guestId] = await Promise.all([readGuestId(), currentGuestPlayerId()]);
  const dailyKey = claveDelDia(new Date());
  const reto = configuracionDelReto(dailyKey);

  const [bank, previous, perfil, retoHecho] = await Promise.all([
    countQuestions(),
    guestPublicId ? recentGames(guestPublicId, 3) : Promise.resolve([]),
    guestId ? obtenerPerfil(guestId) : Promise.resolve(null),
    guestId ? resultadoDelDia(guestId, dailyKey) : Promise.resolve(null),
  ]);

  const rango = perfil ? rangoPorId(perfil.rangoId) : null;

  return (
    <div>
      {/* ── Fachada ──────────────────────────────────────────────────────────── */}
      <section>
        {/* El edificio se ve entero: es la puerta de entrada al juego, no un adorno */}
        <PortalFacade className="h-44 w-full sm:h-64 lg:h-[26rem]" />

        <div className="mx-auto -mt-6 max-w-6xl px-4 sm:-mt-10">
          <ApartmentPlaque
            vivienda={HOME.kicker}
            titulo={HOME.title}
            subtitulo={BRAND.tagline}
            className="max-w-2xl"
          />
        </div>
      </section>

      <GossipTicker mensajes={RUMORES_TICKER.slice(0, 6)} />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <p className="max-w-prose text-[1.05rem] text-tinta-suave">{HOME.subtitle}</p>

        {/* CTA dominante: una partida en un clic, con la configuración por defecto */}
        <form action={startSoloGame} className="mt-5">
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

        {/* ── Planta baja: el portal ES el menú ──────────────────────────────── */}
        <section className="mt-8">
          <h2 className="text-xl sm:text-2xl">Planta baja</h2>
          <p className="texto-sello text-tinta-tenue">Cada cosa del portal hace algo</p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DoorCard
              numero="1"
              titulo="Jugar solo"
              descripcion="Elige duración, dificultad y temática"
              href="/jugar/solo"
            />
            <DoorCard
              numero="2"
              titulo="Reto del día"
              descripcion={retoHecho ? 'Ya lo has jugado hoy' : reto.titular}
              etiqueta={retoHecho ? `Hiciste ${retoHecho.score}` : 'Mismo reto para todo el portal'}
              href="/reto"
              tono="granate"
            />
            <DoorCard
              numero="3"
              titulo="Desafío"
              descripcion="Comparte una etiqueta y jugad la misma partida"
              href="/desafio"
            />
            <DoorCard
              numero="4"
              titulo="Cómo jugar"
              descripcion="Reglas, comodines y sucesos"
              href="/como-jugar"
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <IntercomPanel
              titulo="Telefonillo"
              descripcion="Salas con los móviles como mandos. Llega en la Fase 3."
              etiqueta={HOME.secondary.partyBadge}
              href="/unirse"
            />

            <Link href="/perfil" className="metal block p-3 text-left hover:brightness-105">
              <p className="texto-sello text-tinta">Ascensor · tu progreso</p>
              <div className="mt-2 flex items-center gap-3">
                {perfil ? (
                  <NeighbourAvatar
                    arquetipo={perfil.arquetipo}
                    color={perfil.colorAvatar}
                    marco={perfil.marco}
                    tamano={56}
                  />
                ) : (
                  <ElevatorDisplay planta={0} plantas={7} compacto />
                )}
                <span>
                  <span className="texto-cartel block text-lg text-tinta">
                    {rango ? rango.label : 'Visitante'}
                  </span>
                  <span className="texto-sello block text-[0.6rem] text-tinta/70">
                    {perfil
                      ? `${perfil.xp} XP · ${perfil.gamesFinished} partidas`
                      : 'Juega una partida para empezar a subir'}
                  </span>
                </span>
              </div>
            </Link>

            <Link href="/perfil#logros" className="block">
              <div className="tablon p-3">
                <p className="texto-sello mb-2 text-center text-papel">Buzones · logros</p>
                <MailboxWall
                  buzones={LOGROS.slice(0, 4).map((logro, indice) => {
                    const conseguido = perfil?.logros.some(
                      (item) => item.achievementId === logro.id,
                    );
                    return {
                      id: logro.id,
                      numero: `${indice + 1}`,
                      abierto: !!conseguido,
                      contenido: conseguido ? `${logro.icon} ${logro.label}` : undefined,
                      deshabilitado: true,
                    };
                  })}
                />
              </div>
            </Link>
          </div>
        </section>

        {/* ── Tablón de anuncios ─────────────────────────────────────────────── */}
        <section className="mt-8">
          <NoticeBoard titulo="Tablón de anuncios">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {HOME.bullets.map((bullet, index) => (
                <PaperNotice
                  key={bullet.title}
                  tono={index % 2 === 0 ? 'mostaza' : 'papel'}
                  giro={index % 2 === 0 ? 'izq' : 'der'}
                  sujecion={index % 2 === 0 ? 'chincheta' : 'cinta'}
                  className="p-3 pt-4"
                >
                  <p className="texto-cartel text-sm">
                    <span aria-hidden className="mr-1 text-base">
                      {bullet.icon}
                    </span>
                    {bullet.title}
                  </p>
                  <p className="mt-1 text-xs text-tinta-suave">{bullet.text}</p>
                </PaperNotice>
              ))}
            </div>

            <PaperNotice tono="azul" giro="der" className="mt-4 p-3">
              <p className="texto-sello">Banco de preguntas</p>
              <p className="marcador mt-1 text-2xl">{bank.active}</p>
              <p className="text-xs text-tinta-suave">
                preguntas activas de {bank.total} · {QUESTION_TYPE_LIST.length} familias de prueba
              </p>
              <p className="mt-2">
                <Sello>Contenido demo</Sello>
              </p>
            </PaperNotice>
          </NoticeBoard>
        </section>

        {/* ── Formatos ───────────────────────────────────────────────────────── */}
        <section className="mt-8">
          <h2 className="text-xl sm:text-2xl">Tres duraciones</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {GAME_FORMATS.map((format) => (
              <div key={format.id} className="papel p-4">
                <p className="texto-cartel text-lg">{format.label}</p>
                <p className="texto-sello text-tinta-tenue">{format.estimatedMinutes}</p>
                <p className="mt-2 text-sm text-tinta-suave">{format.tagline}</p>
                <p className="mt-3 flex flex-wrap gap-1">
                  {format.rounds.map((round) => (
                    <Chip key={round.id}>
                      <span aria-hidden>{round.icon}</span> {round.title}
                    </Chip>
                  ))}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Partidas recientes del invitado ───────────────────────────────── */}
        {previous.length > 0 ? (
          <section className="mt-8">
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

        {/* ── Aviso de contenido demo ───────────────────────────────────────── */}
        <section className="mt-8">
          <PaperNotice tono="papel" className="p-4">
            <p className="texto-sello">Aviso de contenido</p>
            <p className="mt-1 max-w-prose text-sm text-tinta-suave">{HOME.demoNotice}</p>
          </PaperNotice>
        </section>

        <p className="mt-6 flex flex-wrap gap-2">
          <LinkButton href="/jugar" tone="papel" size="sm">
            Todos los modos
          </LinkButton>
          <LinkButton href="/admin/preguntas" tone="fantasma" size="sm">
            Banco de preguntas
          </LinkButton>
        </p>
      </div>
    </div>
  );
}
