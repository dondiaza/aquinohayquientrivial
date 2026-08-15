'use client';

/**
 * EL MANDO — lo que se ve en el móvil.
 *
 * Reglas de diseño, todas pensadas para una mano y una pantalla pequeña:
 *
 *   · **Solo lo que hay que decidir.** El enunciado largo está en la tele; aquí van los
 *     botones. Si la pregunta no se puede responder sin leerla (respuesta escrita, memoria),
 *     entonces sí aparece.
 *   · **Sin scroll durante la pregunta.** Las opciones se reparten la altura disponible.
 *   · **Confirmación inmediata.** En cuanto el servidor acepta: «Respuesta enviada». Nunca
 *     se dice si es correcta hasta el revelado, ni siquiera de forma indirecta.
 *   · **Nada de bloquear al que pierde cobertura.** Si falla el envío se puede reintentar
 *     con el MISMO `opId`, así que un reintento no puntúa dos veces.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { NeighbourAvatar } from '@/components/portal/Avatar';

import { comoArquetipo, comoColor } from './avatar';
import { Chip } from '@/components/ui/Surfaces';
import { REACCIONES, type VistaSala } from '@/domain/party/protocolo';
import { POWER_UPS, type PowerUpId } from '@/domain/powerups/powerups';
import { almacen, useSala } from '@/lib/sala/useSala';
import { nuevoOpId } from '@/lib/sala/transporte';

import { EstadoConexionPunto } from './EstadoConexion';

export function Mando({ code }: { code: string }) {
  const [identidad, setIdentidad] = useState<{ token: string; playerId: string; nickname: string } | null>(
    null,
  );

  useEffect(() => {
    setIdentidad(almacen.leer(code));
  }, [code]);

  const { sala, conexion, ahora, enviar, error, playerId } = useSala(
    code,
    identidad?.token ?? null,
  );

  if (error) {
    return (
      <Centrado>
        <p className="texto-cartel text-2xl">{error}</p>
        <a className="btn btn-papel mt-4" href="/unirse">
          Probar con otro código
        </a>
      </Centrado>
    );
  }

  if (!identidad) {
    return (
      <Centrado>
        <p className="texto-cartel text-2xl">No te tenemos en esta junta</p>
        <a className="btn btn-rojo mt-4" href={`/unirse/${code}`}>
          Entrar en la sala
        </a>
      </Centrado>
    );
  }

  if (!sala) {
    return (
      <Centrado>
        <p className="texto-cartel text-2xl">Subiendo al portal…</p>
      </Centrado>
    );
  }

  const yo = sala.jugadores.find((jugador) => jugador.id === (playerId ?? identidad.playerId));
  const privada = sala.privada;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <EstadoConexionPunto estado={conexion} />

      {/* Cabecera: quién eres y cómo vas. Siempre visible, nunca en medio. */}
      <header className="flex items-center gap-3 border-b-2 border-linea-fuerte px-4 pb-2 pt-10">
        {yo ? (
          <NeighbourAvatar
            arquetipo={comoArquetipo(yo.arquetipo)}
            color={comoColor(yo.colorAvatar)}
            marco="ninguno"
            tamano={40}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg leading-tight">{identidad.nickname}</p>
          <p className="texto-sello text-tinta-tenue">
            {sala.code}
            {yo && yo.racha >= 2 ? ` · 🔥 ${yo.racha}` : ''}
          </p>
        </div>
        <p className="marcador text-2xl text-verde-portal">{yo?.puntos ?? 0}</p>
      </header>

      <main className="flex flex-1 flex-col p-4">
        {sala.fase === 'LOBBY' ? <EnEspera sala={sala} /> : null}
        {sala.fase === 'COUNTDOWN' ? <Preparados ahora={ahora} sala={sala} /> : null}
        {sala.fase === 'ROUND_INTRO' ? (
          <Aviso titulo={sala.pregunta?.rondaTitulo ?? 'Nueva ronda'} texto="Prepárate" />
        ) : null}
        {sala.fase === 'FINAL_BET' ? <Apuesta sala={sala} onEnviar={enviar} /> : null}
        {sala.fase === 'QUESTION' ? (
          <Responder sala={sala} ahora={ahora} onEnviar={enviar} yaRespondio={privada?.haRespondido ?? false} />
        ) : null}
        {sala.fase === 'LOCKED' ? <Aviso titulo="Tiempo" texto="A ver qué sale…" /> : null}
        {sala.fase === 'REVEAL' ? <ResultadoPersonal sala={sala} /> : null}
        {sala.fase === 'SCORE' || sala.fase === 'ROUND_RESULTS' ? (
          <TuPosicion sala={sala} playerId={identidad.playerId} />
        ) : null}
        {sala.fase === 'GAME_RESULTS' ? (
          <TuPosicion sala={sala} playerId={identidad.playerId} final />
        ) : null}
        {sala.fase === 'CLOSED' ? <Aviso titulo="Junta disuelta" texto="Hasta la próxima" /> : null}
      </main>

      {/* Reacciones: siempre disponibles menos cuando hay que responder, para no estorbar. */}
      {sala.reactionsEnabled && sala.fase !== 'QUESTION' ? (
        <footer className="flex justify-center gap-2 border-t-2 border-linea-fuerte p-2">
          {REACCIONES.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="rounded border-2 border-linea-fuerte px-3 py-1 text-2xl active:bg-gotele-oscuro"
              onClick={() => void enviar({ type: 'REACTION', emoji })}
              aria-label={`Reaccionar con ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </footer>
      ) : null}
    </div>
  );
}

function Centrado({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center p-6 text-center">
      {children}
    </div>
  );
}

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <p className="texto-cartel text-3xl">{titulo}</p>
      <p className="mt-2 text-tinta-suave">{texto}</p>
    </div>
  );
}

function EnEspera({ sala }: { sala: VistaSala }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <p className="texto-cartel text-3xl">Ya estás dentro</p>
      <p className="mt-2 text-tinta-suave">
        Mira la pantalla grande. Empieza cuando el presidente diga.
      </p>
      <p className="mt-4 flex flex-wrap justify-center gap-1">
        <Chip>{sala.jugadores.filter((jugador) => jugador.rol !== 'HOST').length} vecinos</Chip>
        <Chip>{sala.formatoLabel}</Chip>
      </p>
    </div>
  );
}

function Preparados({ sala, ahora }: { sala: VistaSala; ahora: () => number }) {
  const [restante, setRestante] = useState(3);

  useEffect(() => {
    const id = setInterval(() => {
      setRestante(Math.max(0, Math.ceil(((sala.countdownHasta ?? 0) - ahora()) / 1000)));
    }, 100);
    return () => clearInterval(id);
  }, [sala.countdownHasta, ahora]);

  // Vibración corta, solo si el dispositivo lo admite y el usuario no lo ha desactivado.
  useEffect(() => {
    if (restante === 0 && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(60);
    }
  }, [restante]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="marcador text-[8rem] leading-none text-verde-portal">
        {restante > 0 ? restante : '¡YA!'}
      </p>
    </div>
  );
}

// ── Responder ───────────────────────────────────────────────────────────────────

function Responder({
  sala,
  ahora,
  onEnviar,
  yaRespondio,
}: {
  sala: VistaSala;
  ahora: () => number;
  onEnviar: ReturnType<typeof useSala>['enviar'];
  yaRespondio: boolean;
}) {
  const pregunta = sala.pregunta;
  const privada = sala.privada;
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [orden, setOrden] = useState<string[]>([]);
  const opRef = useRef<string>(nuevoOpId());
  const [restanteMs, setRestanteMs] = useState(0);

  const fin = privada?.terminaEn ?? pregunta?.terminaEn ?? 0;

  useEffect(() => {
    const id = setInterval(() => setRestanteMs(Math.max(0, fin - ahora())), 100);
    return () => clearInterval(id);
  }, [fin, ahora]);

  // Un opId nuevo por pregunta: dentro de la misma pregunta se reutiliza, y por eso un
  // reintento tras un fallo de red no puede puntuar dos veces.
  useEffect(() => {
    opRef.current = nuevoOpId();
    setTexto('');
    setOrden([]);
    setAviso(null);
  }, [pregunta?.questionId]);

  useEffect(() => {
    if (pregunta?.pasos && orden.length === 0) {
      setOrden(pregunta.pasos.map((paso) => paso.id));
    }
  }, [pregunta?.pasos, orden.length]);

  const eliminadas = useMemo(() => new Set(privada?.eliminadas ?? []), [privada?.eliminadas]);

  if (!pregunta) return <Aviso titulo="Un momento" texto="Preparando la pregunta" />;

  const enviarRespuesta = async (submission: unknown): Promise<void> => {
    if (enviando || yaRespondio) return;
    setEnviando(true);
    const resultado = await onEnviar({
      type: 'ANSWER_SUBMIT',
      opId: opRef.current,
      questionIndex: pregunta.indexInGame,
      submission: submission as never,
    });
    setEnviando(false);
    if (!resultado.ok) setAviso(resultado.mensaje);
  };

  if (yaRespondio) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="texto-cartel text-3xl text-verde-portal">Respuesta enviada</p>
        <p className="mt-2 text-tinta-suave">A ver si hay suerte. Mira la pantalla grande.</p>
        <p className="marcador mt-6 text-4xl">{Math.ceil(restanteMs / 1000)}</p>
      </div>
    );
  }

  const segundos = Math.ceil(restanteMs / 1000);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between">
        <p className="texto-sello text-tinta-tenue">{pregunta.instruccion}</p>
        <p className={`marcador text-2xl ${segundos <= 5 ? 'text-rojo-buzon' : 'text-verde-portal'}`}>
          {segundos}
        </p>
      </div>

      {/* En el móvil el enunciado solo aparece cuando hace falta para decidir. */}
      {pregunta.tipo === 'SHORT_ANSWER' ||
      pregunta.tipo === 'MEMORY_GRID' ||
      pregunta.tipo === 'SEQUENCE' ||
      pregunta.tipo === 'DECISION' ? (
        <p className="mt-2 text-base leading-snug">{pregunta.prompt}</p>
      ) : null}

      {aviso ? <p className="mt-2 text-sm text-rojo-buzon">{aviso}</p> : null}

      <div className="mt-3 flex flex-1 flex-col gap-2">
        {pregunta.tipo === 'TRUE_FALSE' ? (
          <>
            <BotonGrande onClick={() => void enviarRespuesta({ kind: 'BOOLEAN', value: true })}>
              Verdadero
            </BotonGrande>
            <BotonGrande onClick={() => void enviarRespuesta({ kind: 'BOOLEAN', value: false })}>
              Falso
            </BotonGrande>
          </>
        ) : null}

        {pregunta.tipo === 'SHORT_ANSWER' ? (
          <form
            className="flex flex-1 flex-col gap-2"
            onSubmit={(evento) => {
              evento.preventDefault();
              if (texto.trim()) void enviarRespuesta({ kind: 'TEXT', text: texto.trim() });
            }}
          >
            {pregunta.pista ? (
              <p className="texto-sello text-tinta-tenue">Pista: {pregunta.pista}</p>
            ) : null}
            <input
              className="campo text-xl"
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              placeholder="Escribe tu respuesta"
              autoComplete="off"
              autoCorrect="off"
              enterKeyHint="send"
              autoFocus
            />
            <button type="submit" className="btn btn-verde btn-lg" disabled={!texto.trim()}>
              Responder
            </button>
            <p className="text-xs text-tinta-tenue">
              Vale sin tildes ni mayúsculas, y se perdona una letra bailada.
            </p>
          </form>
        ) : null}

        {pregunta.opciones && pregunta.tipo !== 'TRUE_FALSE' ? (
          <>
            {pregunta.opciones.map((opcion, indice) => (
              <BotonGrande
                key={opcion.id}
                indice={['A', 'B', 'C', 'D', 'E', 'F'][indice]}
                deshabilitado={eliminadas.has(opcion.id)}
                onClick={() => void enviarRespuesta({ kind: 'OPTION', optionId: opcion.id })}
              >
                {eliminadas.has(opcion.id) ? '—' : opcion.text}
              </BotonGrande>
            ))}
          </>
        ) : null}

        {pregunta.items ? (
          <>
            {pregunta.items.map((item, indice) => (
              <BotonGrande
                key={item.id}
                indice={['A', 'B', 'C', 'D'][indice]}
                onClick={() => void enviarRespuesta({ kind: 'ITEM', itemId: item.id })}
              >
                {item.text}
              </BotonGrande>
            ))}
          </>
        ) : null}

        {pregunta.pasos ? (
          <div className="flex flex-1 flex-col gap-2">
            {orden.map((id, indice) => {
              const paso = pregunta.pasos?.find((candidato) => candidato.id === id);
              return (
                <div key={id} className="flex items-center gap-2">
                  <span className="marcador w-6 text-tinta-tenue">{indice + 1}</span>
                  <span className="flex-1 border-2 border-tinta bg-papel px-3 py-2 text-sm">
                    {paso?.text}
                  </span>
                  <button
                    type="button"
                    className="btn btn-papel px-2"
                    aria-label="Subir"
                    disabled={indice === 0}
                    onClick={() =>
                      setOrden((previo) => {
                        const copia = [...previo];
                        const anterior = copia[indice - 1];
                        const actual = copia[indice];
                        if (anterior && actual) {
                          copia[indice - 1] = actual;
                          copia[indice] = anterior;
                        }
                        return copia;
                      })
                    }
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    className="btn btn-papel px-2"
                    aria-label="Bajar"
                    disabled={indice === orden.length - 1}
                    onClick={() =>
                      setOrden((previo) => {
                        const copia = [...previo];
                        const siguiente = copia[indice + 1];
                        const actual = copia[indice];
                        if (siguiente && actual) {
                          copia[indice + 1] = actual;
                          copia[indice] = siguiente;
                        }
                        return copia;
                      })
                    }
                  >
                    ▼
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              className="btn btn-verde btn-lg"
              onClick={() => void enviarRespuesta({ kind: 'ORDER', orderedIds: orden })}
            >
              Confirmar orden
            </button>
          </div>
        ) : null}
      </div>

      {/* Comodines: pequeños, abajo, sin robar sitio a las respuestas. */}
      {privada && privada.comodinesDisponibles.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {privada.comodinesDisponibles.slice(0, 6).map((id) => {
            const definicion = POWER_UPS[id as PowerUpId];
            if (!definicion) return null;
            return (
              <button
                key={id}
                type="button"
                className="chip"
                onClick={() =>
                  void onEnviar({
                    type: 'POWERUP_USE',
                    questionIndex: pregunta.indexInGame,
                    powerUpId: id as PowerUpId,
                  })
                }
              >
                <span aria-hidden>{definicion.icon}</span> {definicion.short}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function BotonGrande({
  children,
  indice,
  deshabilitado,
  onClick,
}: {
  children: React.ReactNode;
  indice?: string;
  deshabilitado?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex min-h-16 flex-1 items-center gap-3 border-4 border-tinta bg-papel px-4 py-3 text-left text-lg active:translate-y-0.5 disabled:opacity-40"
      disabled={deshabilitado}
      onClick={onClick}
    >
      {indice ? <span className="marcador text-2xl text-verde-portal">{indice}</span> : null}
      <span className="flex-1">{children}</span>
    </button>
  );
}

// ── Apuesta ─────────────────────────────────────────────────────────────────────

function Apuesta({
  sala,
  onEnviar,
}: {
  sala: VistaSala;
  onEnviar: ReturnType<typeof useSala>['enviar'];
}) {
  const [elegida, setElegida] = useState<number | null>(null);
  const opciones = [0, 0.1, 0.25, 0.5] as const;

  if (elegida !== null) {
    return (
      <Aviso
        titulo="Apuesta colocada"
        texto={elegida === 0 ? 'Sin arriesgar. Muy sensato.' : `Te juegas el ${elegida * 100} %`}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col justify-center gap-3">
      <p className="texto-cartel text-center text-2xl">¿Cuánto te juegas?</p>
      <p className="text-center text-sm text-tinta-suave">
        Si aciertas los ganas. Si fallas los pierdes.
      </p>
      {opciones.map((fraccion) => (
        <button
          key={fraccion}
          type="button"
          className="btn btn-papel btn-lg"
          onClick={() => {
            setElegida(fraccion);
            void onEnviar({ type: 'BET_SUBMIT', fraccion });
          }}
        >
          {fraccion === 0 ? 'Nada' : `${fraccion * 100} %`}
          {fraccion > 0 ? (
            <span className="texto-sello ml-2 text-tinta-tenue">
              {Math.round(
                (sala.jugadores.find((jugador) => jugador.id === sala.privada?.playerId)?.puntos ??
                  0) * fraccion,
              )}{' '}
              pts
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

// ── Resultado ───────────────────────────────────────────────────────────────────

function ResultadoPersonal({ sala }: { sala: VistaSala }) {
  const resultado = sala.privada?.resultado;

  if (!resultado) {
    return (
      <Aviso
        titulo="Revelando"
        texto={sala.revelado?.correctoTexto ?? 'Mira la pantalla grande'}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <p
        className={`texto-cartel text-4xl ${resultado.correcta ? 'text-verde-portal' : 'text-rojo-buzon'}`}
      >
        {resultado.correcta ? '¡Acierto!' : 'Fallaste'}
      </p>
      {resultado.puntos !== 0 ? (
        <p className="marcador mt-2 text-3xl">
          {resultado.puntos > 0 ? '+' : ''}
          {resultado.puntos}
        </p>
      ) : null}
      <p className="mt-3 text-tinta-suave">Era: {resultado.respuestaCorrecta}</p>
      {resultado.explicacion ? (
        <p className="mt-2 max-w-prose text-sm text-tinta-suave">{resultado.explicacion}</p>
      ) : null}
      <p className="texto-sello mt-4 text-tinta-tenue">
        Vas {resultado.posicion}.º
        {resultado.variacion !== 0
          ? resultado.variacion > 0
            ? ` (▲ ${resultado.variacion})`
            : ` (▼ ${Math.abs(resultado.variacion)})`
          : ''}
      </p>
    </div>
  );
}

function TuPosicion({
  sala,
  playerId,
  final = false,
}: {
  sala: VistaSala;
  playerId: string;
  final?: boolean;
}) {
  const puestos = sala.clasificacion?.puestos ?? [];
  const yo = puestos.find((puesto) => puesto.playerId === playerId);

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <p className="texto-sello text-tinta-tenue">{final ? 'Acta final' : 'Vas'}</p>
      <p className="marcador text-6xl text-verde-portal">{yo?.posicion ?? '—'}.º</p>
      <p className="mt-2 text-2xl">{yo?.puntos ?? 0} puntos</p>
      {yo && yo.diferenciaConLider > 0 ? (
        <p className="texto-sello mt-2 text-tinta-tenue">
          a {yo.diferenciaConLider} del primero
        </p>
      ) : yo ? (
        <p className="texto-sello mt-2 text-verde-portal">Vas en cabeza</p>
      ) : null}
    </div>
  );
}
