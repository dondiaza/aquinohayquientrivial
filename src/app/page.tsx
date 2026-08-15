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
import { Vecino } from '@/components/avatar/Vecino';
import { PortalFacade } from '@/components/portal/PortalScene';
import { Retrato } from '@/components/serie/Retrato';
import { Foto } from '@/components/serie/Foto';
import { RESUMEN_PACK } from '@/content/anhqv/catalogos';
import { PERSONAJES, SERIE, ZONAS } from '@/content/serie';
import { huecoDeVecino, imagenDe, resumenDeImagenes } from '@/content/imagenes';
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
import { avatarDeInvitado, avatarDeUsuario } from '@/server/avatar/service';
import { idUsuarioActual } from '@/server/cuentas/sesion';
import { avatarAleatorio } from '@/domain/avatar/config';
import { getMediaAsset } from '@/server/media/service';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [guestPublicId, guestId] = await Promise.all([readGuestId(), currentGuestPlayerId()]);
  const dailyKey = claveDelDia(new Date());
  const reto = configuracionDelReto(dailyKey);

  const userId = await idUsuarioActual();

  const [bank, previous, perfil, retoHecho, avatarCuenta, avatarInvitado] = await Promise.all([
    countQuestions(),
    guestPublicId ? recentGames(guestPublicId, 3) : Promise.resolve([]),
    guestId ? obtenerPerfil(guestId) : Promise.resolve(null),
    guestId ? resultadoDelDia(guestId, dailyKey) : Promise.resolve(null),
    userId ? avatarDeUsuario(userId) : Promise.resolve(null),
    guestId ? avatarDeInvitado(guestId) : Promise.resolve(null),
  ]);

  const miVecino = avatarCuenta ?? avatarInvitado;
  const fachada = getMediaAsset('commons:desengano-calle');
  // Un vecino de muestra, siempre el mismo, para el que todavía no tiene el suyo: enseña qué
  // se va a encontrar mejor que cualquier icono genérico.
  const vecinoDeMuestra = avatarAleatorio(0.42);

  const rango = perfil ? rangoPorId(perfil.rangoId) : null;
  const imagenes = resumenDeImagenes();

  return (
    <div>
      {/* ── Fachada ──────────────────────────────────────────────────────────── */}
      <section>
        {/* El edificio se ve entero: es la puerta de entrada al juego, no un adorno.
            Si alguien con licencia pone una imagen en public/serie/portal/, sustituye al
            dibujo sin tocar nada más (ver src/content/imagenes.ts). */}
        {/* LA FACHADA.
            El edificio de la serie no se puede fotografiar porque no existe: el rodaje fue en
            una nave industrial de 2.000 m² en Moraleja de Enmedio y la fachada era decorado,
            así que toda imagen de «Desengaño 21» es un fotograma de Atresmedia.
            Pero la calle del Desengaño SÍ existe, en el centro de Madrid, y sus edificios son
            decimonónicos con balcones y bajos comerciales igual que el de la ficción. España
            tiene libertad de panorama (art. 35.2 LPI) y además el fotógrafo la publicó con
            licencia CC. Así que la portada enseña la calle de verdad. */}
        {fachada?.localPath ? (
          <figure className="relative m-0">
            <img
              src={fachada.localPath}
              alt="La calle del Desengaño, en el centro de Madrid"
              width={1600}
              height={700}
              className="max-h-[26rem] w-full object-cover"
              fetchPriority="high"
            />
            {fachada.attribution ? (
              <figcaption className="absolute bottom-0 right-0 bg-tinta/70 px-2 py-0.5 text-[0.55rem] text-papel">
                <a
                  href={fachada.sourcePage}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline"
                >
                  {fachada.attribution}
                </a>
              </figcaption>
            ) : null}
          </figure>
        ) : imagenDe('portal/fachada') ? (
          <Foto
            hueco="portal/fachada"
            alt={`Fachada de ${SERIE.direccionFicticia}`}
            proporcion="escena"
            className="max-h-[26rem] w-full"
          >
            <PortalFacade className="h-44 w-full sm:h-64 lg:h-[26rem]" />
          </Foto>
        ) : (
          <PortalFacade className="h-44 w-full sm:h-64 lg:h-[26rem]" />
        )}

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

          {/* Las dos plantas nuevas: quién eres y quién manda. Van juntas y a la vista
              porque son las dos cosas que hacen volver al día siguiente. */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Link
              href="/vecino"
              className="papel flex items-center gap-3 p-3 text-left hover:brightness-[1.03]"
            >
              <Vecino config={miVecino ?? vecinoDeMuestra} tamano={64} />
              <span className="min-w-0">
                <span className="texto-cartel block text-lg">
                  {miVecino ? 'Tu vecino' : 'Crea tu vecino'}
                </span>
                <span className="texto-sello block text-tinta-tenue">
                  {miVecino
                    ? 'Cámbiale el pelo, la bata o el fondo'
                    : 'Cara, pelo, ropa y trastos. Treinta segundos.'}
                </span>
              </span>
            </Link>

            <Link
              href="/ranking"
              className="tablon flex items-center gap-3 p-3 text-left hover:brightness-110"
            >
              <span aria-hidden className="text-4xl">🥇</span>
              <span className="min-w-0">
                <span className="texto-cartel block text-lg text-papel">
                  Clasificación de la comunidad
                </span>
                <span className="texto-sello block text-papel/75">
                  Quién manda esta semana en el portal
                </span>
              </span>
            </Link>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <IntercomPanel
              titulo="Telefonillo"
              descripcion="Abre una sala y que entren con el código desde su móvil."
              etiqueta={HOME.secondary.partyBadge}
              href="/unirse"
            />

            <Link href="/perfil" className="metal block p-3 text-left hover:brightness-105">
              <p className="texto-sello text-tinta">Ascensor · tu progreso</p>
              <div className="mt-2 flex items-center gap-3">
                {miVecino ? (
                  <Vecino config={miVecino} tamano={56} />
                ) : perfil ? (
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
                preguntas activas de {bank.total} · {QUESTION_TYPE_LIST.length} familias de prueba ·{' '}
                {RESUMEN_PACK.tarjetas} tarjetas
              </p>
              <p className="mt-2 flex flex-wrap gap-1">
                <Sello tone="ok">{bank.verified} verificadas</Sello>
              </p>
            </PaperNotice>
          </NoticeBoard>
        </section>

        {/* ── El reparto ─────────────────────────────────────────────────────── */}
        <section className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl sm:text-2xl">Los vecinos de {SERIE.direccionFicticia}</h2>
            <Link href="/portal" className="texto-sello underline">
              Ver el portal entero →
            </Link>
          </div>
          <p className="texto-sello text-tinta-tenue">
            {PERSONAJES.length} personajes y {ZONAS.length} zonas del edificio
          </p>

          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-9">
            {PERSONAJES.slice(0, 18).map((personaje) => (
              <li key={personaje.nombre} className="papel p-2 text-center">
                <Foto
                  hueco={huecoDeVecino(personaje.nombre)}
                  alt={personaje.nombre}
                  proporcion="cuadrada"
                  className="mx-auto w-full bg-gotele"
                >
                  <Retrato nombre={personaje.nombre} paleta={personaje.paleta} tamano={72} />
                </Foto>
                <p className="texto-sello mt-1 leading-tight text-tinta">{personaje.corto}</p>
                <p className="text-[0.6rem] leading-tight text-tinta-tenue">{personaje.zona}</p>
              </li>
            ))}
          </ul>
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

        {/* ── Avisos de contenido y de derechos ─────────────────────────────── */}
        <section className="mt-8 grid gap-3 sm:grid-cols-2">
          <PaperNotice tono="papel" className="p-4">
            <p className="texto-sello">Aviso de contenido</p>
            <p className="mt-1 max-w-prose text-sm text-tinta-suave">{HOME.demoNotice}</p>
          </PaperNotice>

          <PaperNotice tono="papel" className="p-4">
            <p className="texto-sello">Nada de fotogramas</p>
            <p className="mt-1 max-w-prose text-sm text-tinta-suave">{BRAND.legalNote}</p>
            <p className="texto-sello mt-2 text-tinta-tenue">
              {imagenes.ficheros === 0
                ? 'Todo lo que ves está dibujado en SVG y CSS'
                : `${imagenes.ficheros} imágenes con licencia añadidas por la comunidad`}
            </p>
          </PaperNotice>
        </section>

        <p className="mt-6 flex flex-wrap gap-2">
          <LinkButton href="/jugar" tone="papel" size="sm">
            Todos los modos
          </LinkButton>
          <LinkButton href="/portal" tone="papel" size="sm">
            El portal
          </LinkButton>
          <LinkButton href="/pruebas" tone="papel" size="sm">
            Pruebas y modos
          </LinkButton>
          <LinkButton href="/tarjetas" tone="papel" size="sm">
            Tarjetas
          </LinkButton>
          <LinkButton href="/admin/preguntas" tone="fantasma" size="sm">
            Banco de preguntas
          </LinkButton>
        </p>
      </div>
    </div>
  );
}
