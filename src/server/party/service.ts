/**
 * SERVICIO DE SALAS — donde el reducer puro se encuentra con Postgres.
 *
 * Responsabilidades, y solo estas:
 *
 *   · crear la sala y su código;
 *   · dar de alta y reconectar jugadores;
 *   · cargar estado + jugadores, pasarlos por el reducer y **escribir el resultado en una
 *     única transacción** junto con los eventos y su `seq`;
 *   · servir el registro de eventos por cursor y el snapshot.
 *
 * La transacción es lo que hace que esto sea correcto con varias funciones serverless a la
 * vez: dos jugadores que responden en el mismo milisegundo se serializan, porque ambos
 * bloquean la fila de la sala antes de calcular (`SELECT … FOR UPDATE`). Sin eso, el segundo
 * leería un estado viejo y podría duplicar un `seq` o perder una respuesta.
 *
 * Nada de lo que hay aquí decide reglas de juego. Si te apetece cambiar cómo se puntúa, el
 * sitio es `src/domain/party/sala.ts`.
 */

import { Prisma, type Room, type RoomPlayer, type RoomTeam } from '@prisma/client';

import { prisma } from '../db';
import { ARQUETIPOS, COLORES_AVATAR } from '@/domain/players/avatar';
import { esCodigoValido, generarCodigo, normalizarCodigo } from '@/domain/party/codigo';
import { equiposParaSala, repartoAutomatico } from '@/domain/party/equipos';
import {
  avanzarSiToca,
  aplicarIntencion,
  clasificar,
  totalPreguntas,
  type ConfigSala,
  type DepsSala,
  type EventoPendiente,
  type RespuestaCalculada,
  type ResultadoSala,
} from '@/domain/party/sala';
import {
  estadoInicial,
  parsearEstado,
  type EstadoSala,
  type JugadorSala,
} from '@/domain/party/estado';
import {
  esParaMi,
  fallo,
  VERSION_PROTOCOLO,
  type EventoSala,
  type IntencionCliente,
  type ResultadoIntencion,
  type RolSala,
  type VistaSala,
} from '@/domain/party/protocolo';
import { nombreAlternativo, sanearNombre } from '@/domain/party/saneado';
import { POWER_UP_IDS } from '@/domain/powerups/powerups';
import { presenciaPorUltimaSenal } from '@/domain/party/tiempo';
import { vistaDePregunta } from '@/domain/party/vista';
import { categoryLabel } from '@/domain/questions/categories';
import { getDifficultyLevel } from '@/domain/difficulty/levels';
import { getGameFormat } from '@/domain/rounds/formats';
import { gameSetupSchema, type GameSetup } from '@/domain/engine/config';
import { newSeed } from '@/domain/rng';
import type { Question } from '@/domain/questions/types';
import { loadPlayableQuestions } from '../questions/repository';

import { nuevoToken, tokenIgual, type Identidad } from './autorizacion';

/** Cuánto vive una sala sin tocarla. Efímera de verdad: el código se puede reutilizar. */
const VIDA_SALA_MS = 6 * 60 * 60 * 1000;

/** Tamaño del banco que se reserva para la sala. Sobra para el formato más largo. */
const TAMANO_BANCO = 320;

export type SalaCargada = {
  room: Room;
  players: RoomPlayer[];
  teams: RoomTeam[];
};

// ── Creación ────────────────────────────────────────────────────────────────────

async function codigoLibre(): Promise<string> {
  for (let intento = 0; intento < 12; intento += 1) {
    const codigo = generarCodigo();
    const ocupado = await prisma.room.findFirst({
      where: { code: codigo, closedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (!ocupado) return codigo;
  }
  // Con 130.000 combinaciones y salas de horas esto no debería pasar nunca; si pasa, es
  // mejor un error claro que un código repetido.
  throw new Error('No se ha podido generar un código de sala libre');
}

export type CrearSalaEntrada = {
  setup: GameSetup;
  teamMode?: 'NINGUNO' | 'COMPARTIDO' | 'INDIVIDUAL';
  equipos?: number;
  autoPilot?: boolean;
  leaderboardEvery?: number;
  maxPlayers?: number;
  /** Nombre del host, si quiere jugar además de presentar. */
  hostNickname?: string;
};

export type SalaCreada = {
  code: string;
  roomId: string;
  hostToken: string;
};

export async function crearSala(entrada: CrearSalaEntrada): Promise<SalaCreada> {
  const setup = gameSetupSchema.parse(entrada.setup);
  const banco = await loadPlayableQuestions({
    ...(setup.category !== 'mezcla' ? { categories: [setup.category] } : {}),
    limit: TAMANO_BANCO,
  });

  const code = await codigoLibre();
  const hostToken = nuevoToken();
  const seed = newSeed({ random: () => Math.random(), now: () => Date.now() });

  const teamMode = entrada.teamMode ?? 'NINGUNO';
  const equipos = teamMode === 'NINGUNO' ? [] : equiposParaSala(entrada.equipos ?? 2);

  const room = await prisma.room.create({
    data: {
      code,
      hostToken,
      config: setup as unknown as Prisma.InputJsonValue,
      seed,
      poolIds: banco.map((pregunta) => pregunta.id),
      state: estadoInicial() as unknown as Prisma.InputJsonValue,
      teamMode,
      autoPilot: entrada.autoPilot ?? true,
      leaderboardEvery: entrada.leaderboardEvery ?? 3,
      maxPlayers: Math.min(48, Math.max(2, entrada.maxPlayers ?? 24)),
      expiresAt: new Date(Date.now() + VIDA_SALA_MS),
      ...(equipos.length > 0
        ? { teams: { create: equipos.map((equipo) => ({ ...equipo })) } }
        : {}),
    },
  });

  await registrarEventos(room.id, 0, [
    {
      type: 'SALA_CREADA',
      audience: 'ALL',
      payload: { code, totalPreguntas: totalPreguntas(configDe(room)) },
    },
  ]);

  return { code, roomId: room.id, hostToken };
}

// ── Carga ───────────────────────────────────────────────────────────────────────

export async function cargarSala(codigoBruto: string): Promise<SalaCargada | null> {
  const code = normalizarCodigo(codigoBruto);
  if (!esCodigoValido(code)) return null;

  const room = await prisma.room.findFirst({
    where: { code, closedAt: null, expiresAt: { gt: new Date() } },
    include: { players: { orderBy: { joinedAt: 'asc' } }, teams: { orderBy: { slot: 'asc' } } },
  });
  if (!room) return null;

  const { players, teams, ...resto } = room;
  return { room: resto as Room, players, teams };
}

function configDe(room: Room): ConfigSala {
  const setup = gameSetupSchema.parse(room.config);
  return {
    formatId: setup.formatId,
    difficultyId: setup.difficultyId,
    category: setup.category,
    sinSpoilers: setup.sinSpoilers,
    autoPilot: room.autoPilot,
    leaderboardEvery: room.leaderboardEvery,
    teamMode: room.teamMode,
    seed: room.seed,
  };
}

function aJugadorSala(fila: RoomPlayer, ahora: number): JugadorSala {
  const presencia =
    fila.status === 'KICKED' || fila.status === 'LEFT'
      ? fila.status
      : presenciaPorUltimaSenal(fila.lastSeenAt.getTime(), ahora);

  return {
    id: fila.id,
    nickname: fila.nickname,
    arquetipo: fila.arquetipo,
    colorAvatar: fila.colorAvatar,
    rol: fila.role,
    estado: presencia,
    teamId: fila.teamId,
    score: fila.score,
    streak: fila.streak,
    bestStreak: fila.bestStreak,
    correct: fila.correct,
    answered: fila.answered,
    totalResponseMs: fila.totalResponseMs,
    powerUpsUsed: fila.powerUpsUsed,
    joinScore: fila.joinScore,
    joinedAtIndex: fila.joinedAtIndex,
    lastSeenAt: fila.lastSeenAt.getTime(),
  };
}

async function bancoDe(room: Room): Promise<Question[]> {
  if (room.poolIds.length === 0) return loadPlayableQuestions({ limit: TAMANO_BANCO });
  const todas = await loadPlayableQuestions({ limit: 2000 });
  const permitidas = new Set(room.poolIds);
  return todas.filter((pregunta) => permitidas.has(pregunta.id));
}

// ── Identidad ───────────────────────────────────────────────────────────────────

export function identificar(
  sala: SalaCargada,
  token: string | null,
): Identidad {
  if (!token) return { rol: 'SPECTATOR', playerId: null, nickname: null };

  if (tokenIgual(token, sala.room.hostToken)) {
    return { rol: 'HOST', playerId: null, nickname: 'host' };
  }

  const jugador = sala.players.find((fila) => tokenIgual(token, fila.token));
  if (!jugador) return { rol: 'SPECTATOR', playerId: null, nickname: null };
  if (jugador.status === 'KICKED') return { rol: 'SPECTATOR', playerId: null, nickname: null };

  return { rol: jugador.role, playerId: jugador.id, nickname: jugador.nickname };
}

// ── Unirse ──────────────────────────────────────────────────────────────────────

export type UnirseEntrada = {
  code: string;
  nickname: string;
  arquetipo?: string;
  colorAvatar?: string;
  teamId?: string | null;
  /** Token que el navegador ya tenía: si es válido, se RECUPERA la identidad. */
  token?: string | null;
  guestId?: string | null;
};

export type UnirseResultado =
  | {
      ok: true;
      token: string;
      playerId: string;
      code: string;
      nickname: string;
      reconectado: boolean;
      rol: RolSala;
    }
  | { ok: false; error: ResultadoIntencion };

export async function unirse(entrada: UnirseEntrada): Promise<UnirseResultado> {
  const sala = await cargarSala(entrada.code);
  if (!sala) return { ok: false, error: fallo('SALA_NO_EXISTE') };

  const ahora = Date.now();
  const estado = parsearEstado(sala.room.state);

  // ── Reconexión: el token manda sobre todo lo demás ──
  if (entrada.token) {
    const previo = sala.players.find((fila) => tokenIgual(entrada.token ?? '', fila.token));
    if (previo && previo.status !== 'KICKED') {
      await prisma.roomPlayer.update({
        where: { id: previo.id },
        data: { status: 'ACTIVE', lastSeenAt: new Date(ahora) },
      });
      await registrarEventos(sala.room.id, sala.room.seq, [
        {
          type: 'JUGADOR_RECONECTO',
          audience: 'ALL',
          payload: { playerId: previo.id, nickname: previo.nickname },
        },
      ]);
      return {
        ok: true,
        token: previo.token,
        playerId: previo.id,
        code: sala.room.code,
        nickname: previo.nickname,
        reconectado: true,
        rol: previo.role,
      };
    }
    if (previo?.status === 'KICKED') return { ok: false, error: fallo('EXPULSADO') };
  }

  // ── Alta nueva ──
  if (sala.room.locked) return { ok: false, error: fallo('SALA_CERRADA') };

  const jugables = sala.players.filter(
    (fila) => fila.role === 'PLAYER' && fila.status !== 'KICKED' && fila.status !== 'LEFT',
  );
  if (jugables.length >= sala.room.maxPlayers) return { ok: false, error: fallo('SALA_LLENA') };

  // Entrada tardía según la política de la sala.
  let rol: RolSala = 'PLAYER';
  if (estado.fase !== 'LOBBY') {
    switch (sala.room.lateJoin) {
      case 'CERRADO':
        return { ok: false, error: fallo('SALA_EMPEZADA') };
      case 'ESPECTADOR':
        rol = 'SPECTATOR';
        break;
      case 'PRIMERA_RONDA':
        if (estado.rondaIndex > 0) rol = 'SPECTATOR';
        break;
      case 'ABIERTO':
        break;
    }
  }

  const saneado = sanearNombre(entrada.nickname);
  if (!saneado.ok) return { ok: false, error: fallo('NOMBRE_INVALIDO') };
  const nickname = nombreAlternativo(
    saneado.nickname,
    sala.players.map((fila) => fila.nickname),
  );

  /**
   * Puntuación de entrada tardía: se le da la MEDIANA de los que ya juegan, no cero (que
   * sería jugar por nada) ni el máximo (que sería un regalo). Es la opción simple y justa
   * que pide el enunciado.
   */
  const enJuego = clasificar(sala.players.map((fila) => aJugadorSala(fila, ahora)));
  const mediana =
    rol === 'PLAYER' && enJuego.length > 0
      ? (enJuego[Math.floor(enJuego.length / 2)]?.score ?? 0)
      : 0;

  // Avatar: se acepta solo lo que está en el catálogo de Fase 2; cualquier otra cosa cae al
  // valor por defecto en lugar de rechazar la entrada, que arruinaría el «entra en 10 s».
  const arquetipo = ARQUETIPOS.some((opcion) => opcion.id === entrada.arquetipo)
    ? String(entrada.arquetipo)
    : 'presidente';
  const color = COLORES_AVATAR.some((opcion) => opcion.id === entrada.colorAvatar)
    ? String(entrada.colorAvatar)
    : 'verde';

  const token = nuevoToken();
  const teamId =
    sala.room.teamMode !== 'NINGUNO' && entrada.teamId
      ? (sala.teams.find((equipo) => equipo.id === entrada.teamId)?.id ?? null)
      : null;

  const creado = await prisma.roomPlayer.create({
    data: {
      roomId: sala.room.id,
      token,
      nickname,
      arquetipo,
      colorAvatar: color,
      role: rol,
      teamId,
      score: mediana,
      joinScore: mediana,
      joinedAtIndex: estado.preguntaIndex,
      ...(entrada.guestId ? { guestId: entrada.guestId } : {}),
    },
  });

  await registrarEventos(sala.room.id, sala.room.seq, [
    {
      type: 'JUGADOR_ENTRO',
      audience: 'ALL',
      payload: {
        playerId: creado.id,
        nickname,
        arquetipo,
        colorAvatar: color,
        rol,
        teamId,
        puntos: mediana,
      },
    },
  ]);

  return {
    ok: true,
    token,
    playerId: creado.id,
    code: sala.room.code,
    nickname,
    reconectado: false,
    rol,
  };
}

// ── Eventos ─────────────────────────────────────────────────────────────────────

/**
 * Escribe eventos con `seq` consecutivo. Se llama SIEMPRE dentro de la transacción que
 * cambia el estado (o justo después, para los eventos que no cambian nada), de modo que el
 * número de secuencia y el estado no se puedan separar.
 */
async function registrarEventos(
  roomId: string,
  seqActual: number,
  eventos: readonly EventoPendiente[],
  tx?: Prisma.TransactionClient,
): Promise<number> {
  if (eventos.length === 0) return seqActual;
  const cliente = tx ?? prisma;

  let seq = seqActual;
  const filas = eventos.map((evento) => {
    seq += 1;
    return {
      roomId,
      seq,
      type: evento.type,
      audience: evento.audience,
      payload: evento.payload as unknown as Prisma.InputJsonValue,
    };
  });

  await cliente.roomEvent.createMany({ data: filas, skipDuplicates: true });
  await cliente.room.update({ where: { id: roomId }, data: { seq } });
  return seq;
}

export async function leerEventos(
  code: string,
  desde: number,
  identidad: Identidad,
  limite = 200,
): Promise<{ eventos: EventoSala[]; seq: number } | null> {
  const sala = await cargarSala(code);
  if (!sala) return null;

  const filas = await prisma.roomEvent.findMany({
    where: { roomId: sala.room.id, seq: { gt: desde } },
    orderBy: { seq: 'asc' },
    take: limite,
  });

  const eventos = filas
    .filter((fila) => esParaMi(fila.audience, identidad))
    .map((fila) => ({
      seq: fila.seq,
      type: fila.type as EventoSala['type'],
      at: fila.createdAt.getTime(),
      payload: (fila.payload ?? {}) as Record<string, unknown>,
    }));

  return { eventos, seq: sala.room.seq };
}

// ── Aplicar una intención ───────────────────────────────────────────────────────

/**
 * El camino crítico. Todo dentro de una transacción con la fila de la sala bloqueada:
 *
 *   1. bloquear la sala (`FOR UPDATE`) — serializa a los jugadores simultáneos;
 *   2. leer estado y jugadores;
 *   3. pasar por el reducer puro;
 *   4. escribir estado, jugadores, respuestas y eventos con su `seq`.
 */
export async function aplicar(
  code: string,
  identidad: Identidad,
  intencion: IntencionCliente,
): Promise<ResultadoIntencion> {
  const sala = await cargarSala(code);
  if (!sala) return fallo('SALA_NO_EXISTE');

  const ahora = Date.now();
  const config = configDe(sala.room);
  const pool = await bancoDe(sala.room);

  return prisma.$transaction(async (tx) => {
    // Bloqueo de la fila: dos respuestas en el mismo milisegundo se ordenan aquí.
    const bloqueadas = await tx.$queryRaw<{ id: string; seq: number; state: unknown }[]>(
      Prisma.sql`SELECT id, seq, state FROM "Room" WHERE id = ${sala.room.id} FOR UPDATE`,
    );
    const bloqueada = bloqueadas[0];
    if (!bloqueada) return fallo('SALA_NO_EXISTE');

    const filas = await tx.roomPlayer.findMany({
      where: { roomId: sala.room.id },
      orderBy: { joinedAt: 'asc' },
    });

    const estado = parsearEstado(bloqueada.state);
    const jugadores = filas.map((fila) => aJugadorSala(fila, ahora));

    const deps: DepsSala = {
      pool,
      config,
      equipos: sala.teams.map((equipo) => ({ id: equipo.id, slot: equipo.slot })),
    };

    const resultado = aplicarIntencion(estado, jugadores, deps, { ahora, autor: identidad }, intencion);

    if (!resultado.resultado.ok) {
      // Aunque falle, se guarda el latido: el jugador está vivo.
      if (identidad.playerId) {
        await tx.roomPlayer.update({
          where: { id: identidad.playerId },
          data: { lastSeenAt: new Date(ahora) },
        });
      }
      return resultado.resultado;
    }

    const seq = await persistir(tx, sala, bloqueada.seq, resultado, ahora, identidad);
    return { ok: true, seq };
  });
}

/**
 * Avance automático sin intención: lo llama el stream en cada lectura del host. Es lo que
 * mueve las fases sin temporizadores de servidor.
 */
export async function tictac(code: string): Promise<number> {
  const sala = await cargarSala(code);
  if (!sala) return 0;

  const estado = parsearEstado(sala.room.state);
  // Atajo: si no hay nada vencido, no se abre transacción. Esto es lo que hace que el
  // sondeo del host sea barato.
  if (estado.faseHasta === null && estado.fase !== 'QUESTION') return sala.room.seq;
  if (estado.faseHasta !== null && Date.now() < estado.faseHasta && estado.fase !== 'QUESTION') {
    return sala.room.seq;
  }

  const ahora = Date.now();
  const config = configDe(sala.room);
  const pool = await bancoDe(sala.room);

  return prisma.$transaction(async (tx) => {
    const bloqueadas = await tx.$queryRaw<{ id: string; seq: number; state: unknown }[]>(
      Prisma.sql`SELECT id, seq, state FROM "Room" WHERE id = ${sala.room.id} FOR UPDATE`,
    );
    const bloqueada = bloqueadas[0];
    if (!bloqueada) return 0;

    const filas = await tx.roomPlayer.findMany({
      where: { roomId: sala.room.id },
      orderBy: { joinedAt: 'asc' },
    });

    const estadoActual = parsearEstado(bloqueada.state);
    const jugadores = filas.map((fila) => aJugadorSala(fila, ahora));
    const deps: DepsSala = {
      pool,
      config,
      equipos: sala.teams.map((equipo) => ({ id: equipo.id, slot: equipo.slot })),
    };

    const resultado = avanzarSiToca(estadoActual, jugadores, deps, ahora);
    if (resultado.eventos.length === 0) return bloqueada.seq;

    return persistir(tx, sala, bloqueada.seq, resultado, ahora, null);
  });
}

async function persistir(
  tx: Prisma.TransactionClient,
  sala: SalaCargada,
  seqActual: number,
  resultado: ResultadoSala,
  ahora: number,
  identidad: Identidad | null,
): Promise<number> {
  // 1. Estado de la sala.
  await tx.room.update({
    where: { id: sala.room.id },
    data: {
      state: resultado.estado as unknown as Prisma.InputJsonValue,
      phase: resultado.estado.fase,
      expiresAt: new Date(ahora + VIDA_SALA_MS),
      ...(identidad?.rol === 'HOST' ? { hostSeenAt: new Date(ahora) } : {}),
    },
  });

  // 2. Jugadores que han cambiado. Se comparan contra la fila para no escribir de más.
  for (const jugador of resultado.jugadores) {
    const original = sala.players.find((fila) => fila.id === jugador.id);
    if (!original) continue;
    const cambia =
      original.score !== jugador.score ||
      original.streak !== jugador.streak ||
      original.bestStreak !== jugador.bestStreak ||
      original.correct !== jugador.correct ||
      original.answered !== jugador.answered ||
      original.totalResponseMs !== jugador.totalResponseMs ||
      original.powerUpsUsed.length !== jugador.powerUpsUsed.length ||
      original.teamId !== jugador.teamId;

    const esAutor = identidad?.playerId === jugador.id;
    if (!cambia && !esAutor) continue;

    await tx.roomPlayer.update({
      where: { id: jugador.id },
      data: {
        score: jugador.score,
        streak: jugador.streak,
        bestStreak: jugador.bestStreak,
        correct: jugador.correct,
        answered: jugador.answered,
        totalResponseMs: jugador.totalResponseMs,
        powerUpsUsed: jugador.powerUpsUsed,
        teamId: jugador.teamId,
        ...(esAutor ? { lastSeenAt: new Date(ahora), status: 'ACTIVE' } : {}),
      },
    });
  }

  // 3. Respuestas. `skipDuplicates` cierra el círculo de la idempotencia: si el reducer
  //    dejó pasar un reintento, la clave única (sala, jugador, pregunta) lo para aquí.
  if (resultado.respuestas.length > 0) {
    await tx.roomAnswer.createMany({
      data: resultado.respuestas.map((respuesta) => filaDeRespuesta(sala.room.id, respuesta)),
      skipDuplicates: true,
    });
  }

  // 4. Puntuación de equipo.
  for (const equipo of resultado.puntosEquipo) {
    await tx.roomTeam.update({ where: { id: equipo.teamId }, data: { score: equipo.puntos } });
  }

  // 5. Eventos, con su seq.
  return registrarEventos(sala.room.id, seqActual, resultado.eventos, tx);
}

function filaDeRespuesta(roomId: string, respuesta: RespuestaCalculada) {
  return {
    roomId,
    playerId: respuesta.playerId,
    questionId: respuesta.questionId,
    questionIndex: respuesta.questionIndex,
    roundId: respuesta.roundId,
    opId: respuesta.opId,
    answered: respuesta.answered,
    correct: respuesta.correct,
    accuracy: respuesta.accuracy,
    responseMs: respuesta.responseMs,
    pointsAwarded: respuesta.pointsAwarded,
    basePoints: respuesta.basePoints,
    timeBonus: respuesta.timeBonus,
    streakBonus: respuesta.streakBonus,
    multiplier: respuesta.multiplier,
    streakAfter: respuesta.streakAfter,
    wager: respuesta.wager,
    powerUpsUsed: respuesta.powerUpsUsed,
    submitted: (respuesta.submitted ?? Prisma.DbNull) as unknown as Prisma.InputJsonValue,
    texto: respuesta.texto,
  };
}

// ── Snapshot ────────────────────────────────────────────────────────────────────

/**
 * Foto completa del estado, ya filtrada para quien pregunta. Se envía al conectar y al
 * volver de segundo plano: con esto más el cursor de eventos, un cliente nunca queda
 * descolgado.
 */
export async function snapshot(code: string, identidad: Identidad): Promise<VistaSala | null> {
  const sala = await cargarSala(code);
  if (!sala) return null;

  const ahora = Date.now();
  const estado = parsearEstado(sala.room.state);
  const config = configDe(sala.room);
  const setup = gameSetupSchema.parse(sala.room.config);
  const jugadores = sala.players.map((fila) => aJugadorSala(fila, ahora));
  const activos = jugadores.filter(
    (jugador) => jugador.rol === 'PLAYER' && jugador.estado !== 'KICKED' && jugador.estado !== 'LEFT',
  );

  let pregunta: VistaSala['pregunta'] = null;
  if (estado.actual && (estado.fase === 'QUESTION' || estado.fase === 'LOCKED' || estado.fase === 'REVEAL')) {
    const pool = await bancoDe(sala.room);
    const question = pool.find((candidata) => candidata.id === estado.actual?.questionId);
    const definicion = getGameFormat(config.formatId).rounds[estado.rondaIndex];
    if (question && definicion) {
      pregunta = vistaDePregunta({
        question,
        ronda: { id: definicion.id, title: definicion.title, icon: definicion.icon ?? '🏢' },
        indexInGame: estado.actual.indexInGame,
        totalPreguntas: totalPreguntas(config),
        optionOrder: estado.actual.optionOrder,
        pistasReveladas: estado.actual.pistasReveladas,
        timeLimitSeconds: estado.actual.timeLimitSeconds,
        empiezaEn: estado.actual.empiezaEn,
        terminaEn: estado.actual.terminaEn,
        estudioHasta: estado.actual.estudioHasta,
        modificadores: estado.actual.modificadores,
      });
    }
  }

  const orden = clasificar(jugadores);
  const nivel = getDifficultyLevel(config.difficultyId);
  const formato = getGameFormat(config.formatId);

  return {
    version: VERSION_PROTOCOLO,
    code: sala.room.code,
    fase: estado.fase,
    servidorAhora: ahora,
    locked: sala.room.locked,
    autoPilot: sala.room.autoPilot,
    teamMode: sala.room.teamMode,
    lateJoin: sala.room.lateJoin,
    reactionsEnabled: sala.room.reactionsEnabled,
    maxPlayers: sala.room.maxPlayers,
    formatoLabel: formato.label,
    dificultadLabel: nivel.label,
    categoriaLabel: categoryLabel(setup.category),
    sinSpoilers: setup.sinSpoilers,
    totalPreguntas: totalPreguntas(config),
    preguntaIndex: estado.preguntaIndex,
    rondaIndex: estado.rondaIndex,
    totalRondas: formato.rounds.length,
    jugadores: jugadores
      .filter((jugador) => jugador.estado !== 'KICKED')
      .map((jugador) => ({
        id: jugador.id,
        nickname: jugador.nickname,
        arquetipo: jugador.arquetipo,
        colorAvatar: jugador.colorAvatar,
        rol: jugador.rol,
        estado: jugador.estado,
        teamId: jugador.teamId,
        puntos: jugador.score,
        racha: jugador.streak,
        haRespondido: estado.actual?.respondidos.includes(jugador.id) ?? false,
      })),
    equipos: sala.teams.map((equipo) => ({
      id: equipo.id,
      nombre: equipo.name,
      color: equipo.color,
      slot: equipo.slot,
      puntos: equipo.score,
      jugadores: jugadores
        .filter((jugador) => jugador.teamId === equipo.id)
        .map((jugador) => jugador.nickname),
    })),
    respondidos: estado.actual?.respondidos.length ?? 0,
    esperados: activos.filter(
      (jugador) => jugador.estado === 'ACTIVE' || jugador.estado === 'RECONNECTING',
    ).length,
    pregunta,
    privada: vistaPrivada(estado, identidad, jugadores),
    revelado: null,
    clasificacion: estado.mostrarClasificacion
      ? {
          motivo: estado.fase === 'GAME_RESULTS' ? 'FINAL' : 'PERIODICA',
          puestos: orden.map((jugador, indice) => ({
            posicion: indice + 1,
            playerId: jugador.id,
            nickname: jugador.nickname,
            arquetipo: jugador.arquetipo,
            colorAvatar: jugador.colorAvatar,
            puntos: jugador.score,
            variacion: (estado.posicionesPrevias[jugador.id] ?? indice + 1) - (indice + 1),
            racha: jugador.streak,
            teamId: jugador.teamId,
            diferenciaConLider: (orden[0]?.score ?? 0) - jugador.score,
          })),
          equipos: sala.teams.map((equipo) => ({
            id: equipo.id,
            nombre: equipo.name,
            color: equipo.color,
            slot: equipo.slot,
            puntos: equipo.score,
            jugadores: [],
          })),
        }
      : null,
    social: estado.social
      ? {
          subfase: estado.social.subfase === 'RECUENTO' ? 'VOTAR' : estado.social.subfase,
          situacion: estado.social.situacion,
          propuestas: estado.social.propuestas.map((propuesta) => ({
            id: propuesta.id,
            texto: propuesta.texto,
            votos: propuesta.votos,
            oculta: propuesta.oculta,
          })),
          terminaEn: estado.social.terminaEn,
        }
      : null,
    final:
      estado.fase === 'GAME_RESULTS'
        ? {
            podio: orden.slice(0, 3).map((jugador, indice) => ({
              posicion: indice + 1,
              playerId: jugador.id,
              nickname: jugador.nickname,
              arquetipo: jugador.arquetipo,
              colorAvatar: jugador.colorAvatar,
              puntos: jugador.score,
              aciertos: jugador.correct,
              respondidas: jugador.answered,
            })),
            equipoGanador: null,
            premios: estado.premios.map((premio) => ({
              id: premio.id,
              titulo: premio.titulo,
              nickname: premio.nickname,
              detalle: premio.detalle,
            })),
          }
        : null,
    countdownHasta: estado.countdownHasta,
  };
}

/**
 * Bloque privado del snapshot. Se calcula aparte para que quede evidente que es lo único
 * que depende de QUIÉN pregunta, y para que nunca acabe dentro de un evento con audiencia
 * ALL por descuido.
 */
function vistaPrivada(
  estado: EstadoSala,
  identidad: Identidad,
  jugadores: readonly JugadorSala[],
): VistaSala['privada'] {
  const playerId = identidad.playerId;
  if (!playerId || identidad.rol !== 'PLAYER') return null;

  const jugador = jugadores.find((candidato) => candidato.id === playerId);
  if (!jugador) return null;

  const pregunta = estado.actual;
  const extras = pregunta?.porJugador[playerId];
  const disponibles = POWER_UP_IDS.filter((id) => !jugador.powerUpsUsed.includes(id));

  return {
    playerId,
    eliminadas: extras?.eliminadas ?? [],
    segundosExtra: extras?.segundosExtra ?? 0,
    terminaEn: pregunta ? pregunta.terminaEn + (extras?.segundosExtra ?? 0) * 1000 : 0,
    apuesta: extras?.apuesta ?? 0,
    comodinesDisponibles: [...disponibles],
    haRespondido: pregunta?.respondidos.includes(playerId) ?? false,
  };
}

// ── Controles de host que tocan columnas, no estado de juego ─────────────────────

export async function controlDeHost(
  code: string,
  identidad: Identidad,
  intencion: IntencionCliente,
): Promise<ResultadoIntencion | null> {
  if (identidad.rol !== 'HOST') return fallo('NO_AUTORIZADO');
  const sala = await cargarSala(code);
  if (!sala) return fallo('SALA_NO_EXISTE');

  switch (intencion.type) {
    case 'HOST_LOCK_ROOM': {
      await prisma.room.update({
        where: { id: sala.room.id },
        data: { locked: intencion.cerrada },
      });
      const seq = await registrarEventos(sala.room.id, sala.room.seq, [
        { type: 'CONFIG_CAMBIO', audience: 'ALL', payload: { locked: intencion.cerrada } },
      ]);
      return { ok: true, seq };
    }

    case 'HOST_KICK': {
      const objetivo = sala.players.find((fila) => fila.id === intencion.playerId);
      if (!objetivo) return fallo('ENTRADA_INVALIDA');
      await prisma.roomPlayer.update({
        where: { id: objetivo.id },
        data: { status: 'KICKED' },
      });
      const seq = await registrarEventos(sala.room.id, sala.room.seq, [
        {
          type: 'JUGADOR_EXPULSADO',
          audience: 'ALL',
          payload: { playerId: objetivo.id, nickname: objetivo.nickname },
        },
        {
          type: 'JUGADOR_EXPULSADO',
          audience: `P:${objetivo.id}`,
          payload: { expulsado: true },
        },
      ]);
      return { ok: true, seq };
    }

    case 'HOST_MUTE_REACTIONS': {
      await prisma.room.update({
        where: { id: sala.room.id },
        data: { reactionsEnabled: !intencion.silenciadas },
      });
      const seq = await registrarEventos(sala.room.id, sala.room.seq, [
        {
          type: 'CONFIG_CAMBIO',
          audience: 'ALL',
          payload: { reactionsEnabled: !intencion.silenciadas },
        },
      ]);
      return { ok: true, seq };
    }

    case 'HOST_CONFIG': {
      await prisma.room.update({
        where: { id: sala.room.id },
        data: {
          ...(intencion.autoPilot !== undefined ? { autoPilot: intencion.autoPilot } : {}),
          ...(intencion.leaderboardEvery !== undefined
            ? { leaderboardEvery: intencion.leaderboardEvery }
            : {}),
          ...(intencion.lateJoin !== undefined ? { lateJoin: intencion.lateJoin } : {}),
          ...(intencion.reactionsEnabled !== undefined
            ? { reactionsEnabled: intencion.reactionsEnabled }
            : {}),
        },
      });
      const seq = await registrarEventos(sala.room.id, sala.room.seq, [
        { type: 'CONFIG_CAMBIO', audience: 'ALL', payload: { ...intencion, opId: undefined } },
      ]);
      return { ok: true, seq };
    }

    case 'HOST_TEAMS': {
      // Se rehacen los equipos desde cero: es la operación de lobby, no de partida.
      await prisma.roomTeam.deleteMany({ where: { roomId: sala.room.id } });
      const definiciones = intencion.modo === 'NINGUNO' ? [] : equiposParaSala(intencion.equipos);
      if (definiciones.length > 0) {
        await prisma.roomTeam.createMany({
          data: definiciones.map((equipo) => ({ ...equipo, roomId: sala.room.id })),
        });
      }
      await prisma.room.update({
        where: { id: sala.room.id },
        data: { teamMode: intencion.modo },
      });

      const equipos = await prisma.roomTeam.findMany({
        where: { roomId: sala.room.id },
        orderBy: { slot: 'asc' },
      });

      if (intencion.reparto === 'AUTOMATICO' && equipos.length > 0) {
        const asignacion = repartoAutomatico(
          sala.players
            .filter((fila) => fila.role === 'PLAYER')
            .map((fila) => ({ playerId: fila.id, puntos: fila.score })),
          equipos.map((equipo) => equipo.id),
        );
        for (const [playerId, teamId] of Object.entries(asignacion)) {
          await prisma.roomPlayer.update({ where: { id: playerId }, data: { teamId } });
        }
      } else if (definiciones.length === 0) {
        await prisma.roomPlayer.updateMany({
          where: { roomId: sala.room.id },
          data: { teamId: null },
        });
      }

      const seq = await registrarEventos(sala.room.id, sala.room.seq, [
        {
          type: 'EQUIPOS_CAMBIARON',
          audience: 'ALL',
          payload: {
            modo: intencion.modo,
            equipos: equipos.map((equipo) => ({
              id: equipo.id,
              nombre: equipo.name,
              color: equipo.color,
              slot: equipo.slot,
            })),
          },
        },
      ]);
      return { ok: true, seq };
    }

    case 'HOST_ASSIGN_TEAM': {
      await prisma.roomPlayer.update({
        where: { id: intencion.playerId },
        data: { teamId: intencion.teamId },
      });
      const seq = await registrarEventos(sala.room.id, sala.room.seq, [
        {
          type: 'EQUIPOS_CAMBIARON',
          audience: 'ALL',
          payload: { playerId: intencion.playerId, teamId: intencion.teamId },
        },
      ]);
      return { ok: true, seq };
    }

    case 'HOST_REGENERATE_CODE': {
      const nuevo = await codigoLibre();
      await prisma.room.update({ where: { id: sala.room.id }, data: { code: nuevo } });
      const seq = await registrarEventos(sala.room.id, sala.room.seq, [
        { type: 'CONFIG_CAMBIO', audience: 'ALL', payload: { code: nuevo } },
      ]);
      return { ok: true, seq };
    }

    case 'HOST_CLOSE': {
      await prisma.room.update({
        where: { id: sala.room.id },
        data: { closedAt: new Date(), phase: 'CLOSED' },
      });
      const seq = await registrarEventos(sala.room.id, sala.room.seq, [
        { type: 'SALA_CERRADA', audience: 'ALL', payload: {} },
      ]);
      return { ok: true, seq };
    }

    case 'HOST_REMATCH': {
      // Revancha: se conservan jugadores, avatares y equipos; se reinicia el marcador.
      const estado = parsearEstado(sala.room.state);
      const banco = await loadPlayableQuestions({ limit: TAMANO_BANCO });
      const nuevoEstado: EstadoSala = {
        ...estadoInicial(),
        revanchas: estado.revanchas + 1,
      };

      await prisma.$transaction([
        prisma.room.update({
          where: { id: sala.room.id },
          data: {
            state: nuevoEstado as unknown as Prisma.InputJsonValue,
            phase: 'LOBBY',
            seed: newSeed({ random: () => Math.random(), now: () => Date.now() }),
            poolIds: banco.map((pregunta) => pregunta.id),
            expiresAt: new Date(Date.now() + VIDA_SALA_MS),
          },
        }),
        prisma.roomPlayer.updateMany({
          where: { roomId: sala.room.id },
          data: {
            score: 0,
            streak: 0,
            bestStreak: 0,
            correct: 0,
            answered: 0,
            totalResponseMs: 0,
            powerUpsUsed: [],
            joinScore: 0,
            joinedAtIndex: 0,
          },
        }),
        prisma.roomTeam.updateMany({ where: { roomId: sala.room.id }, data: { score: 0 } }),
      ]);

      const seq = await registrarEventos(sala.room.id, sala.room.seq, [
        {
          type: 'CONFIG_CAMBIO',
          audience: 'ALL',
          payload: { revancha: true, revanchas: nuevoEstado.revanchas },
        },
      ]);
      return { ok: true, seq };
    }

    case 'HOST_PING': {
      await prisma.room.update({
        where: { id: sala.room.id },
        data: { hostSeenAt: new Date() },
      });
      return { ok: true, seq: sala.room.seq };
    }

    default:
      // No es un control de columnas: lo resuelve el reducer.
      return null;
  }
}

/** Latido de un jugador: mantiene su presencia y devuelve el seq actual. */
export async function latido(code: string, identidad: Identidad): Promise<number> {
  const sala = await cargarSala(code);
  if (!sala) return 0;
  if (identidad.playerId) {
    await prisma.roomPlayer.update({
      where: { id: identidad.playerId },
      data: { lastSeenAt: new Date() },
    });
  }
  return sala.room.seq;
}
