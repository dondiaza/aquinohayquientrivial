'use client';

/**
 * LA PANTALLA GRANDE.
 *
 * Se ve en una tele desde el sofá, así que todo está pensado para leerse a tres metros:
 * el código enorme, el QR grande, tipografía de cartel y contraste alto. La TV CUENTA la
 * historia; las decisiones se toman en el móvil.
 *
 * Regla que se respeta en todas las fases: aquí no se enseña nunca quién falta por
 * responder, solo **cuántos** faltan. Señalar al lento en una pantalla delante de todos es
 * la forma más rápida de que alguien deje de jugar.
 */

import { useEffect, useMemo, useState } from 'react';

import { Chip } from '@/components/ui/Surfaces';
import { GameShowBanner, TVFrame } from '@/components/portal/Espectaculo';
import { NeighbourAvatar } from '@/components/portal/Avatar';

import { comoArquetipo, comoColor } from './avatar';
import { MENSAJE_ERROR, type VistaSala } from '@/domain/party/protocolo';
import { almacen, useSala } from '@/lib/sala/useSala';

import { BotonCompartir } from './Compartir';
import { EstadoConexionPunto } from './EstadoConexion';
import { NubeDeReacciones } from './NubeDeReacciones';

export function PantallaHost({
  code,
  qr,
  urlUnion,
}: {
  code: string;
  qr: string;
  urlUnion: string;
}) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(almacen.leerHost(code));
  }, [code]);

  const { sala, conexion, ahora, ultimos, enviar, error } = useSala(code, token);

  // Latido del host: mantiene vivo el periodo de gracia si se le va la conexión.
  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => void enviar({ type: 'HOST_PING' }), 20_000);
    return () => clearInterval(id);
  }, [token, enviar]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="texto-cartel text-3xl">{error}</p>
      </div>
    );
  }

  if (!sala) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="texto-cartel text-3xl">Abriendo el portal…</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <EstadoConexionPunto estado={conexion} />
      <NubeDeReacciones eventos={ultimos} />

      {sala.fase === 'LOBBY' ? (
        <Lobby sala={sala} code={code} qr={qr} urlUnion={urlUnion} esHost={Boolean(token)} onEnviar={enviar} />
      ) : null}

      {sala.fase === 'COUNTDOWN' ? <CuentaAtras sala={sala} ahora={ahora} /> : null}

      {sala.fase === 'ROUND_INTRO' ? <CartelaRonda sala={sala} /> : null}

      {sala.fase === 'FINAL_BET' ? <PantallaApuesta sala={sala} ahora={ahora} /> : null}

      {sala.fase === 'QUESTION' || sala.fase === 'LOCKED' ? (
        <PantallaPregunta sala={sala} ahora={ahora} />
      ) : null}

      {sala.fase === 'REVEAL' ? <PantallaRevelado sala={sala} /> : null}

      {sala.fase === 'SCORE' || sala.fase === 'ROUND_RESULTS' ? (
        <PantallaClasificacion sala={sala} />
      ) : null}

      {sala.fase === 'GAME_RESULTS' ? <Ceremonia sala={sala} onEnviar={enviar} esHost={Boolean(token)} /> : null}

      {token ? <ControlesHost sala={sala} onEnviar={enviar} /> : null}
    </div>
  );
}

// ── Lobby ───────────────────────────────────────────────────────────────────────

function Lobby({
  sala,
  code,
  qr,
  urlUnion,
  esHost,
  onEnviar,
}: {
  sala: VistaSala;
  code: string;
  qr: string;
  urlUnion: string;
  esHost: boolean;
  onEnviar: ReturnType<typeof useSala>['enviar'];
}) {
  const jugadores = sala.jugadores.filter((jugador) => jugador.rol !== 'HOST');
  const puedeEmpezar = jugadores.length >= 1;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <p className="texto-sello text-center text-lg text-tinta-tenue">
        Desengaño 21 · Junta a punto de empezar
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_auto]">
        <div>
          <h1 className="texto-cartel text-[clamp(2rem,6vw,4rem)] leading-none">
            Entra con el código
          </h1>

          <p
            className="marcador mt-4 leading-none text-verde-portal"
            style={{ fontSize: 'clamp(5rem, 22vw, 14rem)', letterSpacing: '0.08em' }}
          >
            {code}
          </p>

          <p className="mt-2 text-lg text-tinta-suave sm:text-2xl">
            o escanea el código con el móvil
          </p>
          <p className="texto-sello mt-1 break-all text-tinta-tenue">{urlUnion}</p>

          {/* Convocar por mensaje. En la tele lo normal es que el anfitrión tenga el móvil en
              la mano, pero si se abre la sala desde un portátil este botón es la forma más
              rápida de meter a alguien que no está en el salón. */}
          <p className="mt-4">
            <BotonCompartir
              url={urlUnion}
              code={code}
              jugadores={jugadores.length}
              modo={sala.formatoLabel}
            />
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Chip>{sala.formatoLabel}</Chip>
            <Chip>{sala.dificultadLabel}</Chip>
            <Chip>{sala.categoriaLabel}</Chip>
            <Chip>{sala.totalPreguntas} preguntas</Chip>
            {sala.sinSpoilers ? <Chip>Sin spoilers</Chip> : null}
            {sala.teamMode !== 'NINGUNO' ? <Chip>Por equipos</Chip> : null}
            {sala.locked ? <Chip className="border-rojo-buzon text-rojo-buzon">Entrada cerrada</Chip> : null}
          </div>
        </div>

        <div className="mx-auto w-full max-w-sm">
          <div
            className="border-4 border-tinta bg-papel p-3"
            /* El SVG lo genera el servidor: sin librería en el navegador ni servicios de terceros. */
            dangerouslySetInnerHTML={{ __html: qr }}
          />
        </div>
      </div>

      <div className="mt-10">
        <p className="texto-cartel text-2xl">
          En el portal · {jugadores.length}
          <span className="text-tinta-tenue"> / {sala.maxPlayers}</span>
        </p>

        {jugadores.length === 0 ? (
          <p className="mt-4 text-xl text-tinta-suave">
            El rellano está muy tranquilo. Que alguien escanee el código.
          </p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-3">
            {jugadores.map((jugador) => (
              <li
                key={jugador.id}
                className="papel anim-aparecer flex items-center gap-2 px-3 py-2"
              >
                <NeighbourAvatar
                  arquetipo={comoArquetipo(jugador.arquetipo)}
                  color={comoColor(jugador.colorAvatar)}
                  marco="ninguno"
                  tamano={44}
                />
                <span className="text-lg">{jugador.nickname}</span>
                {jugador.estado === 'RECONNECTING' ? (
                  <span className="texto-sello text-mostaza">volviendo…</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {esHost ? (
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            className="btn btn-rojo btn-xl"
            disabled={!puedeEmpezar}
            onClick={() => void onEnviar({ type: 'HOST_START' })}
          >
            ▶ Empezar la junta
          </button>
          <button
            type="button"
            className="btn btn-papel"
            onClick={() => void onEnviar({ type: 'HOST_LOCK_ROOM', cerrada: !sala.locked })}
          >
            {sala.locked ? 'Abrir la entrada' : 'Cerrar la entrada'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ── Cuenta atrás ────────────────────────────────────────────────────────────────

function CuentaAtras({ sala, ahora }: { sala: VistaSala; ahora: () => number }) {
  const [restante, setRestante] = useState(3);

  useEffect(() => {
    const id = setInterval(() => {
      const hasta = sala.countdownHasta ?? 0;
      setRestante(Math.max(0, Math.ceil((hasta - ahora()) / 1000)));
    }, 100);
    return () => clearInterval(id);
  }, [sala.countdownHasta, ahora]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p
        key={restante}
        className="marcador anim-aparecer leading-none text-verde-portal"
        style={{ fontSize: 'clamp(8rem, 40vw, 26rem)' }}
      >
        {restante > 0 ? restante : '¡YA!'}
      </p>
    </div>
  );
}

// ── Cartela de ronda ────────────────────────────────────────────────────────────

function CartelaRonda({ sala }: { sala: VistaSala }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6">
      <GameShowBanner
        kicker={`Ronda ${sala.rondaIndex + 1} de ${sala.totalRondas}`}
        titulo={sala.pregunta?.rondaTitulo ?? 'Siguiente ronda'}
        linea="Preparad los móviles"
        tono="granate"
      />
    </div>
  );
}

// ── Apuesta ─────────────────────────────────────────────────────────────────────

function PantallaApuesta({ sala, ahora }: { sala: VistaSala; ahora: () => number }) {
  void ahora;
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 text-center">
      <p className="texto-sello text-2xl text-tinta-tenue">La derrama</p>
      <h1 className="texto-cartel mt-2 text-[clamp(2.5rem,9vw,6rem)] leading-none">
        ¿Cuánto te juegas?
      </h1>
      <p className="mt-6 text-2xl text-tinta-suave">
        Elegid en el móvil: 0 %, 10 %, 25 % o 50 % de vuestros puntos.
      </p>
      <p className="marcador mt-8 text-6xl text-verde-portal">
        {sala.respondidos} / {sala.esperados}
      </p>
      <p className="texto-sello text-tinta-tenue">apuestas colocadas</p>
    </div>
  );
}

// ── Pregunta ────────────────────────────────────────────────────────────────────

function PantallaPregunta({ sala, ahora }: { sala: VistaSala; ahora: () => number }) {
  const pregunta = sala.pregunta;
  const [restanteMs, setRestanteMs] = useState(0);

  useEffect(() => {
    if (!pregunta) return;
    const id = setInterval(() => {
      setRestanteMs(Math.max(0, pregunta.terminaEn - ahora()));
    }, 100);
    return () => clearInterval(id);
  }, [pregunta, ahora]);

  const total = useMemo(
    () => (pregunta ? pregunta.terminaEn - pregunta.empiezaEn : 1),
    [pregunta],
  );

  if (!pregunta) return null;

  const fraccion = Math.max(0, Math.min(1, restanteMs / Math.max(1, total)));
  const segundos = Math.ceil(restanteMs / 1000);
  const apremio = fraccion < 0.25;

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6">
      <div className="flex items-center justify-between gap-4">
        <p className="texto-sello text-xl text-tinta-tenue">
          <span aria-hidden>{pregunta.rondaIcono}</span> {pregunta.rondaTitulo}
        </p>
        <p className="texto-sello text-xl text-tinta-tenue">
          Pregunta {pregunta.indexInGame + 1} de {pregunta.totalPreguntas}
        </p>
      </div>

      {/* Barra de tiempo: gruesa y con número, para verla desde lejos. */}
      <div className="mt-3 flex items-center gap-4">
        <div className="h-6 flex-1 border-2 border-tinta bg-white/50">
          <div
            className={`h-full transition-[width] duration-100 ${apremio ? 'bg-rojo-buzon' : 'bg-verde-portal'}`}
            style={{ width: `${fraccion * 100}%` }}
          />
        </div>
        <p
          className={`marcador leading-none ${apremio ? 'text-rojo-buzon' : 'text-verde-portal'}`}
          style={{ fontSize: 'clamp(2rem,6vw,4rem)' }}
        >
          {segundos}
        </p>
      </div>

      <h1
        className="mt-6 text-[clamp(1.8rem,5vw,3.6rem)] leading-tight"
        style={{ fontFamily: 'var(--font-cuerpo)', fontWeight: 700 }}
      >
        {pregunta.prompt}
      </h1>

      {pregunta.pistas.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-3">
          {pregunta.pistas.map((pista) => (
            <li key={pista} className="chip text-lg">
              {pista}
            </li>
          ))}
        </ul>
      ) : null}

      {pregunta.opciones ? (
        <div className="mt-6 grid flex-1 content-center gap-4 sm:grid-cols-2">
          {pregunta.opciones.map((opcion, indice) => (
            <div
              key={opcion.id}
              className="flex items-center gap-4 border-4 border-tinta bg-papel px-5 py-5"
            >
              <span className="marcador text-4xl text-verde-portal">
                {['A', 'B', 'C', 'D', 'E', 'F'][indice]}
              </span>
              <span className="text-[clamp(1.1rem,2.4vw,2rem)] leading-tight">{opcion.text}</span>
            </div>
          ))}
        </div>
      ) : pregunta.tipo === 'TRUE_FALSE' ? (
        <div className="mt-6 grid flex-1 content-center gap-4 sm:grid-cols-2">
          {['Verdadero', 'Falso'].map((texto) => (
            <div key={texto} className="border-4 border-tinta bg-papel px-5 py-8 text-center">
              <span className="texto-cartel text-4xl">{texto}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 flex flex-1 items-center justify-center">
          <p className="texto-cartel text-center text-4xl text-tinta-suave">
            {pregunta.instruccion}
          </p>
        </div>
      )}

      {/* Contador de respuestas: cuántos, nunca quiénes. */}
      <p className="mt-6 text-center text-3xl">
        <span className="texto-sello text-tinta-tenue">Esperando respuestas </span>
        <span className="marcador text-verde-portal">
          {sala.respondidos} / {sala.esperados}
        </span>
      </p>
    </div>
  );
}

// ── Revelado ────────────────────────────────────────────────────────────────────

function PantallaRevelado({ sala }: { sala: VistaSala }) {
  const revelado = sala.revelado;
  const pregunta = sala.pregunta;

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-8">
      <p className="texto-sello text-xl text-tinta-tenue">La respuesta era</p>
      <p className="texto-cartel mt-1 text-[clamp(2rem,7vw,4.5rem)] leading-none text-verde-portal">
        {revelado?.correctoTexto ?? '—'}
      </p>

      {revelado?.explicacion ? (
        <p className="mt-4 max-w-4xl text-[clamp(1rem,2vw,1.6rem)] text-tinta-suave">
          {revelado.explicacion}
        </p>
      ) : pregunta ? (
        <p className="mt-4 max-w-4xl text-[clamp(1rem,2vw,1.6rem)] text-tinta-suave">
          {pregunta.prompt}
        </p>
      ) : null}

      {revelado?.reparto && revelado.reparto.length > 0 ? (
        <ul className="mt-8 space-y-2">
          {revelado.reparto.map((opcion) => {
            const total = revelado.reparto.reduce((suma, entrada) => suma + entrada.votos, 0);
            const porcentaje = total > 0 ? Math.round((opcion.votos / total) * 100) : 0;
            return (
              <li key={opcion.id} className="flex items-center gap-3">
                <span className="w-1/3 truncate text-xl">{opcion.text}</span>
                <span className="h-8 flex-1 border-2 border-tinta bg-white/50">
                  <span
                    className={`block h-full ${opcion.esCorrecta ? 'bg-verde-portal' : 'bg-tinta-tenue'}`}
                    style={{ width: `${porcentaje}%` }}
                  />
                </span>
                <span className="marcador w-16 text-right text-2xl">{opcion.votos}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

// ── Clasificación ───────────────────────────────────────────────────────────────

function PantallaClasificacion({ sala }: { sala: VistaSala }) {
  const puestos = sala.clasificacion?.puestos ?? [];

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-8">
      <h1 className="texto-cartel text-[clamp(2rem,6vw,4rem)] leading-none">Clasificación</h1>

      <ol className="mt-6 space-y-2">
        {puestos.slice(0, 10).map((puesto) => (
          <li
            key={puesto.playerId}
            className="papel flex items-center gap-4 px-4 py-3"
          >
            <span className="marcador w-12 text-3xl text-tinta-tenue">{puesto.posicion}</span>
            <NeighbourAvatar
              arquetipo={comoArquetipo(puesto.arquetipo)}
              color={comoColor(puesto.colorAvatar)}
              marco="ninguno"
              tamano={44}
            />
            <span className="flex-1 text-2xl">{puesto.nickname}</span>
            {puesto.variacion !== 0 ? (
              <span
                className={`texto-sello ${puesto.variacion > 0 ? 'text-verde-portal' : 'text-rojo-buzon'}`}
              >
                {puesto.variacion > 0 ? `▲ ${puesto.variacion}` : `▼ ${Math.abs(puesto.variacion)}`}
              </span>
            ) : null}
            {puesto.racha >= 2 ? <span className="texto-sello">🔥 {puesto.racha}</span> : null}
            <span className="marcador text-3xl text-verde-portal">{puesto.puntos}</span>
          </li>
        ))}
      </ol>

      {sala.equipos.length > 0 ? (
        <div className="mt-8">
          <p className="texto-sello text-tinta-tenue">Por puertas</p>
          <ul className="mt-2 flex flex-wrap gap-3">
            {[...sala.equipos]
              .sort((a, b) => b.puntos - a.puntos)
              .map((equipo) => (
                <li key={equipo.id} className="papel px-4 py-2">
                  <span className="texto-cartel text-xl">{equipo.nombre}</span>
                  <span className="marcador ml-3 text-2xl text-verde-portal">{equipo.puntos}</span>
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

// ── Ceremonia final ─────────────────────────────────────────────────────────────

function Ceremonia({
  sala,
  onEnviar,
  esHost,
}: {
  sala: VistaSala;
  onEnviar: ReturnType<typeof useSala>['enviar'];
  esHost: boolean;
}) {
  const podio = sala.final?.podio ?? [];
  const [revelados, setRevelados] = useState(0);

  // El podio se revela de tercero a primero, como en la tele.
  useEffect(() => {
    if (podio.length === 0) return;
    const id = setInterval(() => {
      setRevelados((previo) => Math.min(previo + 1, podio.length));
    }, 1800);
    return () => clearInterval(id);
  }, [podio.length]);

  const orden = [...podio].reverse();

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-8">
      <TVFrame canal="PORTAL TV">
        <p className="text-center text-[0.8rem] opacity-80">ACTA DE LA JUNTA</p>
        <p
          className="mt-1 text-center text-[clamp(1.6rem,7vw,3rem)] leading-none"
          style={{ fontFamily: 'var(--font-cartel)' }}
        >
          Resultados
        </p>
      </TVFrame>

      <ol className="mt-8 space-y-3">
        {orden.map((puesto, indice) => {
          const visible = indice < revelados;
          return (
            <li
              key={puesto.playerId}
              className={`papel flex items-center gap-4 px-5 py-4 transition-opacity duration-500 ${
                visible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <span className="marcador w-16 text-5xl text-tinta-tenue">{puesto.posicion}.</span>
              <NeighbourAvatar
                arquetipo={comoArquetipo(puesto.arquetipo)}
                color={comoColor(puesto.colorAvatar)}
                marco={puesto.posicion === 1 ? 'oro' : 'ninguno'}
                tamano={64}
              />
              <span className="flex-1 texto-cartel text-3xl">{puesto.nickname}</span>
              <span className="marcador text-4xl text-verde-portal">{puesto.puntos}</span>
            </li>
          );
        })}
      </ol>

      {sala.final?.premios && sala.final.premios.length > 0 ? (
        <ul className="mt-8 flex flex-wrap gap-3">
          {sala.final.premios.map((premio) => (
            <li key={premio.id} className="papel px-4 py-3">
              <p className="texto-sello text-tinta-tenue">{premio.titulo}</p>
              <p className="texto-cartel text-xl">{premio.nickname}</p>
              <p className="text-sm text-tinta-suave">{premio.detalle}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {esHost ? (
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            className="btn btn-rojo btn-lg"
            onClick={() => void onEnviar({ type: 'HOST_REMATCH' })}
          >
            Revancha
          </button>
          <button
            type="button"
            className="btn btn-papel"
            onClick={() => void onEnviar({ type: 'HOST_CLOSE' })}
          >
            Cerrar la sala
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ── Controles del host ──────────────────────────────────────────────────────────

function ControlesHost({
  sala,
  onEnviar,
}: {
  sala: VistaSala;
  onEnviar: ReturnType<typeof useSala>['enviar'];
}) {
  const [abierto, setAbierto] = useState(false);
  const [confirmando, setConfirmando] = useState<string | null>(null);

  const enPregunta = sala.fase === 'QUESTION';

  return (
    <div className="fixed bottom-3 right-3 z-40 text-right">
      {abierto ? (
        <div className="papel mb-2 max-w-xs space-y-2 p-3 text-left">
          <p className="texto-sello text-tinta-tenue">Presidencia</p>

          {!sala.autoPilot || enPregunta ? (
            <button
              type="button"
              className="btn btn-verde w-full"
              onClick={() => void onEnviar({ type: 'HOST_NEXT' })}
            >
              Avanzar
            </button>
          ) : null}

          {enPregunta ? (
            <button
              type="button"
              className="btn btn-papel w-full"
              onClick={() => void onEnviar({ type: 'HOST_LOCK_QUESTION' })}
            >
              Cerrar respuestas
            </button>
          ) : null}

          <button
            type="button"
            className="btn btn-papel w-full"
            onClick={() =>
              void onEnviar({
                type: 'HOST_SHOW_LEADERBOARD',
                mostrar: sala.clasificacion === null,
              })
            }
          >
            {sala.clasificacion ? 'Ocultar clasificación' : 'Mostrar clasificación'}
          </button>

          <button
            type="button"
            className="btn btn-papel w-full"
            onClick={() => void onEnviar({ type: 'HOST_CONFIG', autoPilot: !sala.autoPilot })}
          >
            {sala.autoPilot ? 'Modo presentador' : 'Modo automático'}
          </button>

          {/* Las acciones destructivas piden confirmación, y nunca durante una pregunta. */}
          {confirmando === 'anular' ? (
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-rojo flex-1"
                onClick={() => {
                  void onEnviar({ type: 'HOST_ANNUL' });
                  setConfirmando(null);
                }}
              >
                Sí, anular
              </button>
              <button
                type="button"
                className="btn btn-fantasma flex-1"
                onClick={() => setConfirmando(null)}
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-fantasma w-full"
              disabled={!sala.pregunta}
              onClick={() => setConfirmando('anular')}
            >
              Anular pregunta
            </button>
          )}
        </div>
      ) : null}

      <button
        type="button"
        className="btn btn-papel"
        onClick={() => setAbierto((previo) => !previo)}
        aria-expanded={abierto}
      >
        {abierto ? 'Cerrar' : '⚙ Presidencia'}
      </button>
    </div>
  );
}

export { MENSAJE_ERROR };
