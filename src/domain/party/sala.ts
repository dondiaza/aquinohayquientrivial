/**
 * EL REDUCER DE LA SALA — la autoridad del multijugador.
 *
 * Función PURA: recibe estado + jugadores + una intención + el reloj, y devuelve estado
 * nuevo, jugadores nuevos y los eventos que hay que emitir. No lee la hora, no toca la base
 * de datos, no sabe que existe la red. Eso lo hace `src/server/party/service.ts`, que además
 * lo envuelve en una transacción.
 *
 * ## Qué se reutiliza de las fases 1 y 2 (y por qué no se duplica nada)
 *
 * El motor de solitario (`domain/engine/machine.ts`) es de UN jugador con progresión: no
 * sirve tal cual para veinte personas respondiendo a la vez. Pero todo lo que hay debajo sí,
 * y se usa aquí sin cambios:
 *
 *   · `domain/selection/select.ts` — elegir pregunta sin repetir, con spoilers y factKey;
 *   · `domain/questions/grading.ts` — corregir las once familias;
 *   · `domain/scoring/scoring.ts` — la fórmula de puntos, con sus topes;
 *   · `domain/streaks/streaks.ts` — rachas e hitos;
 *   · `domain/rounds/formats.ts` — los formatos de partida, que ya eran datos;
 *   · `domain/powerups/powerups.ts` — los seis comodines y sus reglas de compatibilidad;
 *   · `domain/rng.ts` — azar determinista con semilla.
 *
 * Lo único nuevo es la coordinación: una pregunta, N respuestas, y las fases que la TV
 * necesita para contar la historia.
 *
 * ## Cómo avanza el tiempo sin temporizadores
 *
 * No hay `setTimeout` en el servidor (en serverless no sobreviviría). Cada fase deja escrito
 * en `faseHasta` cuándo debe avanzar; cualquier lectura posterior a esa marca ejecuta el
 * avance dentro de la misma transacción. Con la TV leyendo el stream cada pocos cientos de
 * milisegundos, el efecto es idéntico y no hay estado en memoria que perder.
 */

import { gradeAnswer } from '../questions/grading';
import { questionTypeMeta } from '../questions/registry';
import { studyMsFor, wrongOptionIds, type AnswerSubmission, type Question } from '../questions/types';
import { createRng, shuffle, type Rng } from '../rng';
import {
  clampWager,
  maxWager,
  scoreAnswer,
  type ScoreModifier,
} from '../scoring/scoring';
import { applyStreak } from '../streaks/streaks';
import { getGameFormat, type GameFormat, type RoundDefinition } from '../rounds/formats';
import { getDifficultyLevel } from '../difficulty/levels';
import { factKeysOf, selectQuestion } from '../selection/select';
import { MAX_COMODINES_POR_PREGUNTA, POWER_UPS } from '../powerups/powerups';

import {
  extrasVacios,
  jugadorCuenta,
  type EstadoSala,
  type ExtrasJugador,
  type JugadorSala,
  type PreguntaEnJuego,
} from './estado';
import { puntuarEquipos, type JugadorParaEquipos } from './equipos';
import {
  fallo,
  type Audiencia,
  type CodigoError,
  type IntencionCliente,
  type ResultadoIntencion,
  type RolSala,
  type TipoEventoSala,
} from './protocolo';
import {
  gastarFicha,
  REACCIONES_POR_MINUTO,
  sanearTextoLibre,
  TEXTOS_POR_MINUTO,
} from './saneado';
import {
  COUNTDOWN_MS,
  dentroDeVentana,
  GRACIA_APUESTA_MS,
  GRACIA_RESPUESTA_MS,
  REVEAL_MS,
  ROUND_INTRO_MS,
  tiempoDeRespuesta,
  ventana,
} from './tiempo';
import { textoCorrecto, vistaDePregunta } from './vista';

// ── Contratos de entrada y salida ───────────────────────────────────────────────

export type ConfigSala = {
  formatId: string;
  difficultyId: string;
  category: string;
  sinSpoilers: boolean;
  autoPilot: boolean;
  leaderboardEvery: number;
  teamMode: 'NINGUNO' | 'COMPARTIDO' | 'INDIVIDUAL';
  seed: string;
};

export type DepsSala = {
  /** Banco de la partida (ya filtrado y cargado por el servidor). */
  pool: readonly Question[];
  config: ConfigSala;
  /** Equipos existentes, para puntuar por equipo. */
  equipos: readonly { id: string; slot: number }[];
};

export type EventoPendiente = {
  type: TipoEventoSala;
  audience: Audiencia;
  payload: Record<string, unknown>;
};

/** Lo que hay que persistir en `RoomAnswer` tras puntuar una respuesta. */
export type RespuestaCalculada = {
  playerId: string;
  questionId: string;
  questionIndex: number;
  roundId: string;
  opId: string;
  answered: boolean;
  correct: boolean;
  accuracy: number;
  responseMs: number;
  pointsAwarded: number;
  basePoints: number;
  timeBonus: number;
  streakBonus: number;
  multiplier: number;
  streakAfter: number;
  wager: number | null;
  powerUpsUsed: string[];
  submitted: AnswerSubmission | null;
  texto: string | null;
};

export type ResultadoSala = {
  estado: EstadoSala;
  jugadores: JugadorSala[];
  eventos: EventoPendiente[];
  respuestas: RespuestaCalculada[];
  /** Puntuaciones de equipo recalculadas, si hay equipos. */
  puntosEquipo: { teamId: string; puntos: number }[];
  resultado: ResultadoIntencion;
};

export type ContextoIntencion = {
  ahora: number;
  autor: { playerId: string | null; rol: RolSala };
};

// ── Utilidades internas ─────────────────────────────────────────────────────────

function sinCambios(
  estado: EstadoSala,
  jugadores: JugadorSala[],
  error: CodigoError,
): ResultadoSala {
  return {
    estado,
    jugadores,
    eventos: [],
    respuestas: [],
    puntosEquipo: [],
    resultado: fallo(error),
  };
}

function formato(config: ConfigSala): GameFormat {
  return getGameFormat(config.formatId);
}

function ronda(config: ConfigSala, indice: number): RoundDefinition | undefined {
  return formato(config).rounds[indice];
}

function totalPreguntas(config: ConfigSala): number {
  return formato(config).rounds.reduce((suma, definicion) => suma + definicion.questionCount, 0);
}

function rngDe(config: ConfigSala, cursor: number): Rng {
  return createRng(config.seed, cursor);
}

function extrasDe(pregunta: PreguntaEnJuego, playerId: string): ExtrasJugador {
  return pregunta.porJugador[playerId] ?? extrasVacios();
}

/** Fin de tiempo personal: la ventana común más los segundos que se haya ganado. */
function finPersonal(pregunta: PreguntaEnJuego, playerId: string): number {
  return pregunta.terminaEn + extrasDe(pregunta, playerId).segundosExtra * 1000;
}

function jugadoresQueCuentan(jugadores: readonly JugadorSala[]): JugadorSala[] {
  return jugadores.filter(jugadorCuenta);
}

function paraEquipos(jugadores: readonly JugadorSala[]): JugadorParaEquipos[] {
  return jugadores.map((jugador) => ({
    playerId: jugador.id,
    teamId: jugador.teamId,
    puntos: jugador.score,
    cuenta: jugadorCuenta(jugador),
  }));
}

function clasificar(jugadores: readonly JugadorSala[]): JugadorSala[] {
  return [...jugadoresQueCuentan(jugadores)].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correct !== a.correct) return b.correct - a.correct;
    // A igualdad, gana quien ha tardado menos en total: premia la seguridad, no la suerte.
    if (a.totalResponseMs !== b.totalResponseMs) return a.totalResponseMs - b.totalResponseMs;
    return a.nickname.localeCompare(b.nickname, 'es');
  });
}

function recalcularEquipos(
  jugadores: readonly JugadorSala[],
  equipos: readonly { id: string; slot: number }[],
): { teamId: string; puntos: number }[] {
  if (equipos.length === 0) return [];
  return puntuarEquipos(
    paraEquipos(jugadores),
    equipos.map((equipo) => equipo.id),
  ).map((entrada) => ({ teamId: entrada.teamId, puntos: entrada.puntos }));
}

/** Idempotencia: si el opId ya se procesó, no se vuelve a aplicar. */
function operacionRepetida(estado: EstadoSala, opId: string): boolean {
  return estado.operaciones.includes(opId);
}

function conOperacion(estado: EstadoSala, opId: string): EstadoSala {
  const operaciones = [...estado.operaciones, opId];
  // Se poda por tamaño: solo hace falta recordar lo reciente.
  return { ...estado, operaciones: operaciones.slice(-300) };
}

// ── Preparar una pregunta ───────────────────────────────────────────────────────

function ordenDePresentacion(question: Question, rng: Rng): string[] {
  switch (question.type) {
    case 'MULTIPLE_CHOICE':
    case 'WHO_IS_IT':
    case 'FINAL_BET':
    case 'MEMORY_GRID':
    case 'MISSING_ITEM':
    case 'DECISION':
      return shuffle(
        question.options.map((opcion) => opcion.id),
        rng,
      );
    case 'IMPOSTOR':
      return shuffle(
        question.items.map((item) => item.id),
        rng,
      );
    case 'ORDER_CHAOS': {
      const correcto = question.steps.map((paso) => paso.id);
      const mezclado = shuffle(correcto, rng);
      // Que salga en el orden correcto sería un regalo: se rota.
      if (mezclado.every((id, indice) => id === correcto[indice]) && mezclado.length > 1) {
        const [primero, ...resto] = mezclado;
        return primero ? [...resto, primero] : mezclado;
      }
      return mezclado;
    }
    case 'SEQUENCE':
      return question.pads.map((pad) => pad.id);
    case 'TRUE_FALSE':
    case 'SHORT_ANSWER':
      return [];
  }
}

/**
 * Elige la siguiente pregunta y monta su ventana de tiempo. Devuelve null si el banco se
 * agota, y entonces la ronda se cierra sin dejar a nadie colgado.
 */
function prepararPregunta(
  estado: EstadoSala,
  deps: DepsSala,
  ahora: number,
): { pregunta: PreguntaEnJuego; question: Question } | null {
  const definicion = ronda(deps.config, estado.rondaIndex);
  if (!definicion) return null;

  const nivel = getDifficultyLevel(deps.config.difficultyId);
  const objetivo = Math.max(
    1,
    Math.min(10, Math.round((nivel.min + nivel.max) / 2 + (definicion.difficultyOffset ?? 0))),
  );

  const seleccion = selectQuestion(
    deps.pool,
    {
      targetDifficulty: objetivo,
      allowedTypes: definicion.allowedTypes,
      category: deps.config.category as never,
      excludeIds: new Set(estado.usados),
      excludeFactKeys: factKeysOf(deps.pool, estado.usados),
      sinSpoilers: deps.config.sinSpoilers,
    },
    rngDe(deps.config, estado.preguntaIndex + 1),
  );

  if (!seleccion) return null;
  const question = seleccion.question;

  const modificadores: ScoreModifier[] = [...(definicion.modifiers ?? [])];
  const segundos = Math.max(
    5,
    Math.round(question.timeLimitSeconds * (definicion.timeScale ?? 1)),
  );
  const marco = ventana(ahora, segundos, studyMsFor(question));

  return {
    question,
    pregunta: {
      questionId: question.id,
      roundId: definicion.id,
      indexInGame: estado.preguntaIndex,
      optionOrder: ordenDePresentacion(question, rngDe(deps.config, estado.preguntaIndex + 500)),
      timeLimitSeconds: segundos,
      empiezaEn: marco.empiezaEn,
      terminaEn: marco.terminaEn,
      estudioHasta: marco.estudioHasta,
      modificadores,
      pistasReveladas: 1,
      porJugador: {},
      respondidos: [],
      conApuesta: definicion.isFinal === true || definicion.hasWager === true,
      anulada: false,
    },
  };
}

function eventoPregunta(
  estado: EstadoSala,
  deps: DepsSala,
  question: Question,
  pregunta: PreguntaEnJuego,
): EventoPendiente {
  const definicion = ronda(deps.config, estado.rondaIndex);
  const vista = vistaDePregunta({
    question,
    ronda: {
      id: pregunta.roundId,
      title: definicion?.title ?? 'Ronda',
      icon: definicion?.icon ?? '🏢',
    },
    indexInGame: pregunta.indexInGame,
    totalPreguntas: totalPreguntas(deps.config),
    optionOrder: pregunta.optionOrder,
    pistasReveladas: pregunta.pistasReveladas,
    timeLimitSeconds: pregunta.timeLimitSeconds,
    empiezaEn: pregunta.empiezaEn,
    terminaEn: pregunta.terminaEn,
    estudioHasta: pregunta.estudioHasta,
    modificadores: pregunta.modificadores,
  });

  // Audiencia ALL: la vista NO lleva la solución (ver vista.ts y su test).
  return { type: 'PREGUNTA_EMPEZO', audience: 'ALL', payload: { pregunta: vista } };
}

// ── Avance de fases ─────────────────────────────────────────────────────────────

type Avance = { estado: EstadoSala; jugadores: JugadorSala[]; eventos: EventoPendiente[] };

function iniciarRonda(estado: EstadoSala, deps: DepsSala, ahora: number): Avance {
  const definicion = ronda(deps.config, estado.rondaIndex);
  if (!definicion) return terminarPartida(estado, [], deps, ahora);

  const nuevo: EstadoSala = {
    ...estado,
    fase: 'ROUND_INTRO',
    preguntaEnRonda: 0,
    actual: null,
    social: null,
    faseHasta: ahora + ROUND_INTRO_MS,
    rondas: [
      ...estado.rondas.filter((resumen) => resumen.roundId !== definicion.id),
      {
        roundId: definicion.id,
        titulo: definicion.title,
        preguntas: definicion.questionCount,
        puntos: {},
        aciertos: {},
      },
    ],
  };

  return {
    estado: nuevo,
    jugadores: [],
    eventos: [
      {
        type: 'RONDA_EMPEZO',
        audience: 'ALL',
        payload: {
          roundId: definicion.id,
          roundIndex: estado.rondaIndex,
          titulo: definicion.title,
          subtitulo: definicion.subtitle,
          linea: definicion.line,
          regla: definicion.rule ?? null,
          icono: definicion.icon ?? '🏢',
          preguntas: definicion.questionCount,
          totalRondas: formato(deps.config).rounds.length,
        },
      },
    ],
  };
}

function siguientePregunta(
  estado: EstadoSala,
  jugadores: readonly JugadorSala[],
  deps: DepsSala,
  ahora: number,
): Avance {
  const definicion = ronda(deps.config, estado.rondaIndex);
  if (!definicion) return terminarPartida(estado, jugadores, deps, ahora);

  // ¿Se acabó la ronda?
  if (estado.preguntaEnRonda >= definicion.questionCount) {
    return terminarRonda(estado, deps, ahora);
  }

  const preparada = prepararPregunta(estado, deps, ahora);
  if (!preparada) {
    return {
      estado: {
        ...estado,
        avisos: [...estado.avisos, 'No quedan preguntas con esta configuración.'].slice(-5),
        preguntaEnRonda: definicion.questionCount,
      },
      jugadores: [],
      eventos: [{ type: 'AVISO', audience: 'ALL', payload: { texto: 'Banco agotado' } }],
    };
  }

  const { pregunta, question } = preparada;

  // Las rondas con apuesta piden la apuesta ANTES de ver la pregunta.
  if (pregunta.conApuesta) {
    const nuevo: EstadoSala = {
      ...estado,
      fase: 'FINAL_BET',
      actual: pregunta,
      usados: [...estado.usados, question.id],
      faseHasta: ahora + 15_000,
    };
    return {
      estado: nuevo,
      jugadores: [],
      eventos: [
        {
          type: 'PREGUNTA_EMPEZO',
          audience: 'ALL',
          payload: {
            apuesta: true,
            roundId: pregunta.roundId,
            indexInGame: pregunta.indexInGame,
            terminaEn: nuevo.faseHasta,
            titulo: definicion.title,
          },
        },
      ],
    };
  }

  const nuevo: EstadoSala = {
    ...estado,
    fase: 'QUESTION',
    actual: pregunta,
    usados: [...estado.usados, question.id],
    faseHasta: pregunta.terminaEn,
  };

  return { estado: nuevo, jugadores: [], eventos: [eventoPregunta(nuevo, deps, question, pregunta)] };
}

/** Arranca la pregunta de una ronda con apuesta, cuando ya se han colocado. */
function arrancarTrasApuesta(estado: EstadoSala, deps: DepsSala, ahora: number): Avance {
  const pregunta = estado.actual;
  if (!pregunta) return { estado, jugadores: [], eventos: [] };

  const question = deps.pool.find((candidata) => candidata.id === pregunta.questionId);
  if (!question) return { estado, jugadores: [], eventos: [] };

  const marco = ventana(ahora, pregunta.timeLimitSeconds, studyMsFor(question));
  const actualizada: PreguntaEnJuego = { ...pregunta, ...marco };
  const nuevo: EstadoSala = {
    ...estado,
    fase: 'QUESTION',
    actual: actualizada,
    faseHasta: actualizada.terminaEn,
  };

  return {
    estado: nuevo,
    jugadores: [],
    eventos: [eventoPregunta(nuevo, deps, question, actualizada)],
  };
}

function cerrarPregunta(estado: EstadoSala, ahora: number): Avance {
  if (!estado.actual) return { estado, jugadores: [], eventos: [] };
  return {
    estado: { ...estado, fase: 'LOCKED', faseHasta: ahora + 600 },
    jugadores: [],
    eventos: [
      {
        type: 'PREGUNTA_CERRADA',
        audience: 'ALL',
        payload: { questionId: estado.actual.questionId },
      },
    ],
  };
}

/**
 * REVELADO. Aquí se puntúa a quien no respondió (para que su racha se corte) y se emite el
 * reparto de respuestas. La solución viaja AHORA, no antes.
 */
function revelar(
  estado: EstadoSala,
  jugadores: readonly JugadorSala[],
  deps: DepsSala,
  ahora: number,
  respuestasPrevias: readonly RespuestaCalculada[],
): Avance & { respuestas: RespuestaCalculada[] } {
  const pregunta = estado.actual;
  if (!pregunta) return { estado, jugadores: [], eventos: [], respuestas: [] };

  const question = deps.pool.find((candidata) => candidata.id === pregunta.questionId);
  if (!question) return { estado, jugadores: [], eventos: [], respuestas: [] };

  const correcto = textoCorrecto(question);
  const activos = jugadoresQueCuentan(jugadores);

  // Quien no respondió: se registra como no respondida y se le corta la racha.
  const sinResponder = activos.filter((jugador) => !pregunta.respondidos.includes(jugador.id));
  const nuevasRespuestas: RespuestaCalculada[] = [];
  let actualizados = [...jugadores];

  for (const jugador of sinResponder) {
    if (pregunta.anulada) continue;
    nuevasRespuestas.push({
      playerId: jugador.id,
      questionId: pregunta.questionId,
      questionIndex: pregunta.indexInGame,
      roundId: pregunta.roundId,
      opId: `timeout:${pregunta.indexInGame}:${jugador.id}`,
      answered: false,
      correct: false,
      accuracy: 0,
      responseMs: pregunta.timeLimitSeconds * 1000,
      pointsAwarded: 0,
      basePoints: 0,
      timeBonus: 0,
      streakBonus: 0,
      multiplier: 1,
      streakAfter: 0,
      wager: null,
      powerUpsUsed: [],
      submitted: null,
      texto: null,
    });
    actualizados = actualizados.map((candidato) =>
      candidato.id === jugador.id ? { ...candidato, streak: 0 } : candidato,
    );
  }

  // Reparto de respuestas, para la barra de la TV.
  const opciones =
    question.type === 'TRUE_FALSE'
      ? [
          { id: 'true', text: 'Verdadero' },
          { id: 'false', text: 'Falso' },
        ]
      : (() => {
          const lista =
            question.type === 'IMPOSTOR'
              ? question.items
              : 'options' in question
                ? question.options
                : [];
          return lista.map((opcion) => ({ id: opcion.id, text: opcion.text }));
        })();

  const todas = [...respuestasPrevias, ...nuevasRespuestas].filter(
    (respuesta) => respuesta.questionIndex === pregunta.indexInGame,
  );

  const reparto = opciones.map((opcion) => ({
    id: opcion.id,
    text: opcion.text,
    votos: todas.filter((respuesta) => {
      const enviada = respuesta.submitted;
      if (!enviada) return false;
      if (enviada.kind === 'OPTION') return enviada.optionId === opcion.id;
      if (enviada.kind === 'ITEM') return enviada.itemId === opcion.id;
      if (enviada.kind === 'BOOLEAN') return (enviada.value ? 'true' : 'false') === opcion.id;
      return false;
    }).length,
    esCorrecta: opcion.id === correcto.id,
  }));

  const nombre = (playerId: string): string =>
    jugadores.find((jugador) => jugador.id === playerId)?.nickname ?? '—';

  const aciertos = todas
    .filter((respuesta) => respuesta.correct)
    .map((respuesta) => ({
      playerId: respuesta.playerId,
      nickname: nombre(respuesta.playerId),
      puntos: respuesta.pointsAwarded,
    }))
    .sort((a, b) => b.puntos - a.puntos);

  const fallos = todas
    .filter((respuesta) => respuesta.answered && !respuesta.correct)
    .map((respuesta) => ({ playerId: respuesta.playerId, nickname: nombre(respuesta.playerId) }));

  const orden = clasificar(actualizados);
  const posiciones: Record<string, number> = {};
  orden.forEach((jugador, indice) => {
    posiciones[jugador.id] = indice + 1;
  });

  const eventos: EventoPendiente[] = [
    {
      type: 'RESPUESTA_REVELADA',
      audience: 'ALL',
      payload: {
        questionId: pregunta.questionId,
        correctoId: correcto.id,
        correctoTexto: correcto.texto,
        explicacion: question.explanation ?? null,
        reparto,
        aciertos,
        fallos,
        sinResponder: sinResponder.map((jugador) => jugador.nickname),
        anulada: pregunta.anulada,
      },
    },
    {
      type: 'PUNTUACION_ACTUALIZADA',
      audience: 'ALL',
      payload: {
        jugadores: orden.map((jugador, indice) => ({
          playerId: jugador.id,
          puntos: jugador.score,
          racha: jugador.streak,
          posicion: indice + 1,
        })),
      },
    },
  ];

  // Resultado PRIVADO para cada jugador: su acierto, sus puntos y su posición.
  for (const jugador of activos) {
    const suya = todas.find((respuesta) => respuesta.playerId === jugador.id);
    eventos.push({
      type: 'RESULTADO_PERSONAL',
      audience: `P:${jugador.id}`,
      payload: {
        questionId: pregunta.questionId,
        correcta: suya?.correct ?? false,
        respondida: suya?.answered ?? false,
        puntos: suya?.pointsAwarded ?? 0,
        posicion: posiciones[jugador.id] ?? 0,
        variacion: (estado.posicionesPrevias[jugador.id] ?? 0) - (posiciones[jugador.id] ?? 0),
        respuestaCorrecta: correcto.texto,
        explicacion: question.explanation ?? null,
        puntosTotales: actualizados.find((otro) => otro.id === jugador.id)?.score ?? 0,
      },
    });
  }

  return {
    estado: { ...estado, fase: 'REVEAL', faseHasta: ahora + REVEAL_MS },
    jugadores: actualizados,
    eventos,
    respuestas: nuevasRespuestas,
  };
}

function terminarRonda(estado: EstadoSala, deps: DepsSala, ahora: number): Avance {
  const definicion = ronda(deps.config, estado.rondaIndex);
  const resumen = estado.rondas.find((entrada) => entrada.roundId === definicion?.id);
  const esUltima = estado.rondaIndex >= formato(deps.config).rounds.length - 1;

  const eventos: EventoPendiente[] = [
    {
      type: 'RONDA_TERMINO',
      audience: 'ALL',
      payload: {
        roundId: definicion?.id ?? '',
        titulo: definicion?.title ?? '',
        roundIndex: estado.rondaIndex,
        esUltima,
        puntos: resumen?.puntos ?? {},
        aciertos: resumen?.aciertos ?? {},
      },
    },
  ];

  return {
    estado: {
      ...estado,
      fase: 'ROUND_RESULTS',
      actual: null,
      // Al final de ronda siempre se enseña la clasificación: es el momento natural.
      mostrarClasificacion: true,
      faseHasta: ahora + 8_000,
    },
    jugadores: [],
    eventos,
  };
}

/** Premios divertidos del final. Se calculan sobre lo que ya está en los jugadores. */
function calcularPremios(
  jugadores: readonly JugadorSala[],
): { id: string; titulo: string; playerId: string; nickname: string; detalle: string }[] {
  const activos = jugadoresQueCuentan(jugadores).filter((jugador) => jugador.answered > 0);
  if (activos.length === 0) return [];

  const premios: ReturnType<typeof calcularPremios> = [];

  const masRapido = [...activos].sort(
    (a, b) => a.totalResponseMs / a.answered - b.totalResponseMs / b.answered,
  )[0];
  if (masRapido) {
    premios.push({
      id: 'rapido',
      titulo: 'El del telefonillo',
      playerId: masRapido.id,
      nickname: masRapido.nickname,
      detalle: `${Math.round(masRapido.totalResponseMs / masRapido.answered / 100) / 10} s de media`,
    });
  }

  const mejorRacha = [...activos].sort((a, b) => b.bestStreak - a.bestStreak)[0];
  if (mejorRacha && mejorRacha.bestStreak > 1) {
    premios.push({
      id: 'racha',
      titulo: 'Racha de escalera',
      playerId: mejorRacha.id,
      nickname: mejorRacha.nickname,
      detalle: `${mejorRacha.bestStreak} seguidas`,
    });
  }

  const masPreciso = [...activos].sort(
    (a, b) => b.correct / b.answered - a.correct / a.answered,
  )[0];
  if (masPreciso) {
    premios.push({
      id: 'preciso',
      titulo: 'Acta impecable',
      playerId: masPreciso.id,
      nickname: masPreciso.nickname,
      detalle: `${Math.round((masPreciso.correct / masPreciso.answered) * 100)} % de acierto`,
    });
  }

  return premios;
}

function terminarPartida(
  estado: EstadoSala,
  jugadores: readonly JugadorSala[],
  deps: DepsSala,
  _ahora: number,
): Avance {
  const orden = clasificar(jugadores);
  const equipos = recalcularEquipos(jugadores, deps.equipos);
  const premios = calcularPremios(jugadores);

  return {
    estado: {
      ...estado,
      fase: 'GAME_RESULTS',
      actual: null,
      social: null,
      faseHasta: null,
      mostrarClasificacion: true,
      premios,
    },
    jugadores: [],
    eventos: [
      {
        type: 'PARTIDA_TERMINO',
        audience: 'ALL',
        payload: {
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
          clasificacion: orden.map((jugador, indice) => ({
            posicion: indice + 1,
            playerId: jugador.id,
            nickname: jugador.nickname,
            puntos: jugador.score,
          })),
          equipos,
          premios,
        },
      },
    ],
  };
}

/**
 * AVANCE AUTOMÁTICO. Se llama en cada lectura: si la fase ya venció y la sala está en modo
 * automático, se avanza. En modo presentador solo avanzan las fases que no pueden quedarse
 * colgadas (cerrar una pregunta cuyo tiempo acabó).
 */
export function avanzarSiToca(
  estado: EstadoSala,
  jugadores: readonly JugadorSala[],
  deps: DepsSala,
  ahora: number,
  respuestas: readonly RespuestaCalculada[] = [],
): ResultadoSala {
  let actual = estado;
  let actuales = [...jugadores];
  const eventos: EventoPendiente[] = [];
  const nuevasRespuestas: RespuestaCalculada[] = [];
  let vueltas = 0;

  const aplicar = (avance: Avance): void => {
    actual = avance.estado;
    if (avance.jugadores.length > 0) actuales = avance.jugadores;
    eventos.push(...avance.eventos);
  };

  while (vueltas < 8) {
    vueltas += 1;
    const vencida = actual.faseHasta !== null && ahora >= actual.faseHasta;

    // Cerrar una pregunta cuando todos han respondido o se acabó el tiempo: esto pasa
    // SIEMPRE, incluso en modo presentador, porque si no la sala se queda mirando.
    if (actual.fase === 'QUESTION' && actual.actual) {
      const activos = jugadoresQueCuentan(actuales);
      const todos =
        activos.length > 0 &&
        activos.every((jugador) => actual.actual?.respondidos.includes(jugador.id));
      // Se espera la gracia ANTES de cerrar. Si no, una respuesta con latencia normal
      // llegaría a una pregunta ya cerrada y `dentroDeVentana` no se aplicaría jamás: la
      // tolerancia a latencia solo existe si el cierre también la respeta.
      const tiempoAgotado =
        ahora >= finPersonalMaximo(actual.actual, activos) + GRACIA_RESPUESTA_MS;
      if (todos || tiempoAgotado) {
        aplicar(cerrarPregunta(actual, ahora));
        continue;
      }
      break;
    }

    if (actual.fase === 'LOCKED' && vencida) {
      const revelado = revelar(actual, actuales, deps, ahora, [...respuestas, ...nuevasRespuestas]);
      aplicar(revelado);
      nuevasRespuestas.push(...revelado.respuestas);
      continue;
    }

    if (!vencida) break;
    if (!deps.config.autoPilot && actual.fase !== 'COUNTDOWN' && actual.fase !== 'FINAL_BET') break;

    switch (actual.fase) {
      case 'COUNTDOWN':
        aplicar(iniciarRonda({ ...actual, countdownHasta: null }, deps, ahora));
        break;
      case 'ROUND_INTRO':
        aplicar(siguientePregunta(actual, actuales, deps, ahora));
        break;
      case 'FINAL_BET':
        aplicar(arrancarTrasApuesta(actual, deps, ahora));
        break;
      case 'REVEAL': {
        const conAvance: EstadoSala = {
          ...actual,
          preguntaEnRonda: actual.preguntaEnRonda + 1,
          preguntaIndex: actual.preguntaIndex + 1,
          actual: null,
        };
        const cada = deps.config.leaderboardEvery;
        const toca = cada > 0 && conAvance.preguntaIndex % cada === 0;
        if (toca) {
          aplicar({
            estado: { ...conAvance, fase: 'SCORE', mostrarClasificacion: true, faseHasta: ahora + 6_000 },
            jugadores: [],
            eventos: [clasificacionEvento(conAvance, actuales, deps, 'PERIODICA')],
          });
        } else {
          aplicar(siguientePregunta(conAvance, actuales, deps, ahora));
        }
        break;
      }
      case 'SCORE':
        aplicar(
          siguientePregunta({ ...actual, mostrarClasificacion: false }, actuales, deps, ahora),
        );
        break;
      case 'ROUND_RESULTS': {
        const siguiente = actual.rondaIndex + 1;
        if (siguiente >= formato(deps.config).rounds.length) {
          aplicar(terminarPartida(actual, actuales, deps, ahora));
        } else {
          aplicar(
            iniciarRonda(
              { ...actual, rondaIndex: siguiente, mostrarClasificacion: false },
              deps,
              ahora,
            ),
          );
        }
        break;
      }
      default:
        return {
          estado: actual,
          jugadores: actuales,
          eventos,
          respuestas: nuevasRespuestas,
          puntosEquipo: recalcularEquipos(actuales, deps.equipos),
          resultado: { ok: true, seq: 0 },
        };
    }
  }

  return {
    estado: actual,
    jugadores: actuales,
    eventos,
    respuestas: nuevasRespuestas,
    puntosEquipo: recalcularEquipos(actuales, deps.equipos),
    resultado: { ok: true, seq: 0 },
  };
}

/** El más tardío de los finales personales: hasta ahí no se puede cerrar la pregunta. */
function finPersonalMaximo(pregunta: PreguntaEnJuego, activos: readonly JugadorSala[]): number {
  let maximo = pregunta.terminaEn;
  for (const jugador of activos) {
    const suyo = finPersonal(pregunta, jugador.id);
    if (suyo > maximo) maximo = suyo;
  }
  return maximo;
}

function clasificacionEvento(
  estado: EstadoSala,
  jugadores: readonly JugadorSala[],
  deps: DepsSala,
  motivo: 'PERIODICA' | 'RONDA' | 'MANUAL' | 'FINAL',
): EventoPendiente {
  const orden = clasificar(jugadores);
  const lider = orden[0]?.score ?? 0;
  return {
    type: 'CLASIFICACION',
    audience: 'ALL',
    payload: {
      motivo,
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
        diferenciaConLider: lider - jugador.score,
      })),
      equipos: recalcularEquipos(jugadores, deps.equipos),
    },
  };
}

// ── Respuesta de un jugador ─────────────────────────────────────────────────────

function registrarRespuesta(
  estado: EstadoSala,
  jugadores: readonly JugadorSala[],
  deps: DepsSala,
  contexto: ContextoIntencion,
  intencion: Extract<IntencionCliente, { type: 'ANSWER_SUBMIT' }>,
): ResultadoSala {
  const pregunta = estado.actual;
  const playerId = contexto.autor.playerId;
  if (!playerId) return sinCambios(estado, [...jugadores], 'NO_AUTORIZADO');
  if (estado.fase !== 'QUESTION' || !pregunta) {
    return sinCambios(estado, [...jugadores], 'FASE_INCORRECTA');
  }
  if (intencion.questionIndex !== pregunta.indexInGame) {
    return sinCambios(estado, [...jugadores], 'FASE_INCORRECTA');
  }

  const jugador = jugadores.find((candidato) => candidato.id === playerId);
  if (!jugador || !jugadorCuenta(jugador)) {
    return sinCambios(estado, [...jugadores], 'NO_AUTORIZADO');
  }
  if (pregunta.respondidos.includes(playerId)) {
    return sinCambios(estado, [...jugadores], 'YA_RESPONDIDA');
  }

  const question = deps.pool.find((candidata) => candidata.id === pregunta.questionId);
  if (!question) return sinCambios(estado, [...jugadores], 'FASE_INCORRECTA');

  // La forma de respuesta tiene que encajar con el tipo de pregunta.
  const esperada = questionTypeMeta(question.type);
  void esperada;
  const marco = { empiezaEn: pregunta.empiezaEn, terminaEn: finPersonal(pregunta, playerId) };
  if (!dentroDeVentana(marco, contexto.ahora)) {
    return sinCambios(estado, [...jugadores], 'FUERA_DE_TIEMPO');
  }

  const extras = extrasDe(pregunta, playerId);
  const responseMs = tiempoDeRespuesta(marco, contexto.ahora);
  const nota = gradeAnswer(question, intencion.submission);

  const desglose = pregunta.anulada
    ? null
    : scoreAnswer({
        basePoints: question.basePoints,
        accuracy: nota.accuracy,
        isCorrect: nota.isCorrect,
        difficulty: question.difficulty,
        timeLimitSeconds: pregunta.timeLimitSeconds,
        responseMs,
        streakBefore: jugador.streak,
        modifiers: [...pregunta.modificadores, ...extras.multiplicadores],
        ...(question.type === 'WHO_IS_IT'
          ? { cluesRevealed: pregunta.pistasReveladas, totalClues: question.clues.length }
          : {}),
        ...(extras.apuesta > 0
          ? { wager: extras.apuesta, wagerProtection: extras.proteccionApuesta }
          : {}),
      });

  const puntos = desglose?.total ?? 0;
  // La racha la lleva el mismo módulo que en solitario: acierto la alarga, fallo la corta,
  // y CAMBIO DE PRESIDENTE es lo único que perdona un fallo.
  const rachaNueva = nota.isCorrect
    ? applyStreak({ current: jugador.streak, best: jugador.bestStreak }, true).state.current
    : extras.rachaProtegida
      ? jugador.streak
      : 0;

  const actualizados = jugadores.map((candidato) =>
    candidato.id === playerId
      ? {
          ...candidato,
          score: Math.max(0, candidato.score + puntos),
          streak: rachaNueva,
          bestStreak: Math.max(candidato.bestStreak, rachaNueva),
          correct: candidato.correct + (nota.isCorrect ? 1 : 0),
          answered: candidato.answered + 1,
          totalResponseMs: candidato.totalResponseMs + responseMs,
          lastSeenAt: contexto.ahora,
        }
      : candidato,
  );

  const resumenActual = estado.rondas.map((resumen) =>
    resumen.roundId === pregunta.roundId
      ? {
          ...resumen,
          puntos: { ...resumen.puntos, [playerId]: (resumen.puntos[playerId] ?? 0) + puntos },
          aciertos: {
            ...resumen.aciertos,
            [playerId]: (resumen.aciertos[playerId] ?? 0) + (nota.isCorrect ? 1 : 0),
          },
        }
      : resumen,
  );

  const nuevoEstado: EstadoSala = conOperacion(
    {
      ...estado,
      rondas: resumenActual,
      actual: { ...pregunta, respondidos: [...pregunta.respondidos, playerId] },
    },
    intencion.opId,
  );

  const respuesta: RespuestaCalculada = {
    playerId,
    questionId: pregunta.questionId,
    questionIndex: pregunta.indexInGame,
    roundId: pregunta.roundId,
    opId: intencion.opId,
    answered: true,
    correct: nota.isCorrect,
    accuracy: nota.accuracy,
    responseMs,
    pointsAwarded: puntos,
    basePoints: desglose?.base ?? 0,
    timeBonus: desglose?.timeBonus ?? 0,
    streakBonus: desglose?.streakBonus ?? 0,
    multiplier: desglose?.difficultyMultiplier ?? 1,
    streakAfter: rachaNueva,
    wager: extras.apuesta > 0 ? extras.apuesta : null,
    powerUpsUsed: extras.comodinesAqui,
    submitted: intencion.submission,
    texto: intencion.submission.kind === 'TEXT' ? intencion.submission.text : null,
  };

  const activos = jugadoresQueCuentan(actualizados);
  const eventos: EventoPendiente[] = [
    // Confirmación PRIVADA: «respuesta enviada», sin decir si es correcta.
    {
      type: 'RESPUESTA_ACEPTADA',
      audience: `P:${playerId}`,
      payload: { questionId: pregunta.questionId, opId: intencion.opId },
    },
    // Público: solo el CONTADOR. La TV cuenta, no señala a quien falta.
    {
      type: 'RESPUESTAS_CONTADAS',
      audience: 'ALL',
      payload: {
        questionId: pregunta.questionId,
        respondidos: nuevoEstado.actual?.respondidos.length ?? 0,
        esperados: activos.length,
      },
    },
  ];

  return {
    estado: nuevoEstado,
    jugadores: actualizados,
    eventos,
    respuestas: [respuesta],
    puntosEquipo: recalcularEquipos(actualizados, deps.equipos),
    resultado: { ok: true, seq: 0 },
  };
}

// ── Comodines ───────────────────────────────────────────────────────────────────

function usarComodin(
  estado: EstadoSala,
  jugadores: readonly JugadorSala[],
  deps: DepsSala,
  contexto: ContextoIntencion,
  intencion: Extract<IntencionCliente, { type: 'POWERUP_USE' }>,
): ResultadoSala {
  const pregunta = estado.actual;
  const playerId = contexto.autor.playerId;
  if (!playerId) return sinCambios(estado, [...jugadores], 'NO_AUTORIZADO');
  if (estado.fase !== 'QUESTION' || !pregunta) {
    return sinCambios(estado, [...jugadores], 'FASE_INCORRECTA');
  }
  if (pregunta.respondidos.includes(playerId)) {
    return sinCambios(estado, [...jugadores], 'YA_RESPONDIDA');
  }

  const jugador = jugadores.find((candidato) => candidato.id === playerId);
  if (!jugador) return sinCambios(estado, [...jugadores], 'NO_AUTORIZADO');

  const definicion = POWER_UPS[intencion.powerUpId];
  if (!definicion) return sinCambios(estado, [...jugadores], 'COMODIN_NO_DISPONIBLE');
  if (jugador.powerUpsUsed.includes(intencion.powerUpId)) {
    return sinCambios(estado, [...jugadores], 'COMODIN_NO_DISPONIBLE');
  }

  const extras = extrasDe(pregunta, playerId);
  if (extras.comodinesAqui.length >= MAX_COMODINES_POR_PREGUNTA) {
    return sinCambios(estado, [...jugadores], 'COMODIN_NO_DISPONIBLE');
  }

  const question = deps.pool.find((candidata) => candidata.id === pregunta.questionId);
  if (!question) return sinCambios(estado, [...jugadores], 'FASE_INCORRECTA');

  const nuevos: ExtrasJugador = { ...extras };
  let detalle = '';

  switch (intencion.powerUpId) {
    case 'UN_POQUITO_DE_POR_FAVOR':
      // Tiempo PERSONAL: no altera la ventana de los demás, así que es justo.
      nuevos.segundosExtra = extras.segundosExtra + 5;
      detalle = '+5 s solo para ti';
      break;

    case 'RADIO_PATIO': {
      const incorrectas = wrongOptionIds(question).filter(
        (id) => !extras.eliminadas.includes(id),
      );
      // Nunca se descarta la última incorrecta: dejaría la pregunta regalada.
      if (incorrectas.length <= 1) {
        return sinCambios(estado, [...jugadores], 'COMODIN_NO_DISPONIBLE');
      }
      const elegida = shuffle(incorrectas, rngDe(deps.config, pregunta.indexInGame + 900))[0];
      if (!elegida) return sinCambios(estado, [...jugadores], 'COMODIN_NO_DISPONIBLE');
      nuevos.eliminadas = [...extras.eliminadas, elegida];
      detalle = 'Una menos';
      break;
    }

    case 'JUNTA_EXTRAORDINARIA':
      nuevos.multiplicadores = [
        ...extras.multiplicadores,
        { id: 'junta', label: 'Junta extraordinaria', multiplier: 2 },
      ];
      detalle = 'Puntos ×2';
      break;

    case 'SE_HA_IDO_LA_LUZ':
      nuevos.aOscuras = true;
      nuevos.multiplicadores = [
        ...extras.multiplicadores,
        { id: 'oscuras', label: 'A oscuras', multiplier: 3 },
      ];
      detalle = 'A oscuras ×3';
      break;

    case 'CAMBIO_DE_PRESIDENTE':
      // En multijugador NO se cambia la pregunta (desincronizaría la sala): protege la racha.
      nuevos.rachaProtegida = true;
      detalle = 'Tu racha aguanta un fallo';
      break;

    case 'FONDO_DE_RESERVA':
      if (extras.apuesta <= 0) {
        return sinCambios(estado, [...jugadores], 'COMODIN_NO_DISPONIBLE');
      }
      nuevos.proteccionApuesta = 0.5;
      detalle = 'Media apuesta protegida';
      break;
  }

  nuevos.comodinesAqui = [...extras.comodinesAqui, intencion.powerUpId];

  const nuevoEstado: EstadoSala = conOperacion(
    {
      ...estado,
      actual: {
        ...pregunta,
        porJugador: { ...pregunta.porJugador, [playerId]: nuevos },
      },
    },
    intencion.opId,
  );

  const actualizados = jugadores.map((candidato) =>
    candidato.id === playerId
      ? { ...candidato, powerUpsUsed: [...candidato.powerUpsUsed, intencion.powerUpId] }
      : candidato,
  );

  return {
    estado: nuevoEstado,
    jugadores: actualizados,
    eventos: [
      {
        type: 'COMODIN_USADO',
        audience: `P:${playerId}`,
        payload: {
          powerUpId: intencion.powerUpId,
          detalle,
          eliminadas: nuevos.eliminadas,
          segundosExtra: nuevos.segundosExtra,
          terminaEn: finPersonal(nuevoEstado.actual ?? pregunta, playerId),
          aOscuras: nuevos.aOscuras,
        },
      },
      // La TV lo canta sin decir a quién le toca qué ventaja concreta.
      {
        type: 'COMODIN_USADO',
        audience: 'HOST',
        payload: {
          nickname: jugador.nickname,
          label: definicion.label,
          icon: definicion.icon,
        },
      },
    ],
    respuestas: [],
    puntosEquipo: [],
    resultado: { ok: true, seq: 0 },
  };
}

// ── Apuesta de la ronda final ───────────────────────────────────────────────────

function colocarApuesta(
  estado: EstadoSala,
  jugadores: readonly JugadorSala[],
  contexto: ContextoIntencion,
  intencion: Extract<IntencionCliente, { type: 'BET_SUBMIT' }>,
): ResultadoSala {
  const pregunta = estado.actual;
  const playerId = contexto.autor.playerId;
  if (!playerId) return sinCambios(estado, [...jugadores], 'NO_AUTORIZADO');
  if (estado.fase !== 'FINAL_BET' || !pregunta) {
    return sinCambios(estado, [...jugadores], 'FASE_INCORRECTA');
  }
  if (estado.faseHasta && contexto.ahora > estado.faseHasta + GRACIA_APUESTA_MS) {
    return sinCambios(estado, [...jugadores], 'FUERA_DE_TIEMPO');
  }

  const jugador = jugadores.find((candidato) => candidato.id === playerId);
  if (!jugador || !jugadorCuenta(jugador)) {
    return sinCambios(estado, [...jugadores], 'NO_AUTORIZADO');
  }

  const tope = maxWager(jugador.score, 0.5);
  const apuesta = clampWager(Math.round(jugador.score * intencion.fraccion), jugador.score, 0.5);
  const extras = extrasDe(pregunta, playerId);

  const nuevoEstado: EstadoSala = conOperacion(
    {
      ...estado,
      actual: {
        ...pregunta,
        porJugador: {
          ...pregunta.porJugador,
          [playerId]: { ...extras, apuesta },
        },
      },
    },
    intencion.opId,
  );

  return {
    estado: nuevoEstado,
    jugadores: [...jugadores],
    eventos: [
      {
        type: 'RESPUESTA_ACEPTADA',
        audience: `P:${playerId}`,
        payload: { apuesta, tope, opId: intencion.opId },
      },
    ],
    respuestas: [],
    puntosEquipo: [],
    resultado: { ok: true, seq: 0 },
  };
}

// ── Reacciones ──────────────────────────────────────────────────────────────────

function reaccionar(
  estado: EstadoSala,
  jugadores: readonly JugadorSala[],
  contexto: ContextoIntencion,
  intencion: Extract<IntencionCliente, { type: 'REACTION' }>,
): ResultadoSala {
  const playerId = contexto.autor.playerId;
  if (!playerId) return sinCambios(estado, [...jugadores], 'NO_AUTORIZADO');

  const clave = `${playerId}:reaccion`;
  const { permitido, cubo } = gastarFicha(
    estado.cubos[clave],
    REACCIONES_POR_MINUTO,
    contexto.ahora,
  );
  const nuevoEstado: EstadoSala = { ...estado, cubos: { ...estado.cubos, [clave]: cubo } };

  if (!permitido) return sinCambios(nuevoEstado, [...jugadores], 'DEMASIADO_RAPIDO');

  const jugador = jugadores.find((candidato) => candidato.id === playerId);

  return {
    estado: nuevoEstado,
    jugadores: [...jugadores],
    eventos: [
      {
        type: 'REACCION',
        audience: 'ALL',
        payload: {
          emoji: intencion.emoji,
          nickname: jugador?.nickname ?? '',
          at: contexto.ahora,
        },
      },
    ],
    respuestas: [],
    puntosEquipo: [],
    resultado: { ok: true, seq: 0 },
  };
}

// ── Ronda social ────────────────────────────────────────────────────────────────

function enviarTexto(
  estado: EstadoSala,
  jugadores: readonly JugadorSala[],
  contexto: ContextoIntencion,
  intencion: Extract<IntencionCliente, { type: 'TEXT_SUBMIT' }>,
): ResultadoSala {
  const playerId = contexto.autor.playerId;
  if (!playerId) return sinCambios(estado, [...jugadores], 'NO_AUTORIZADO');
  if (!estado.social || estado.social.subfase !== 'ESCRIBIR') {
    return sinCambios(estado, [...jugadores], 'FASE_INCORRECTA');
  }
  if (estado.social.propuestas.some((propuesta) => propuesta.autorId === playerId)) {
    return sinCambios(estado, [...jugadores], 'YA_RESPONDIDA');
  }

  const clave = `${playerId}:texto`;
  const { permitido, cubo } = gastarFicha(estado.cubos[clave], TEXTOS_POR_MINUTO, contexto.ahora);
  if (!permitido) {
    return sinCambios(
      { ...estado, cubos: { ...estado.cubos, [clave]: cubo } },
      [...jugadores],
      'DEMASIADO_RAPIDO',
    );
  }

  const saneado = sanearTextoLibre(intencion.texto);
  if (!saneado.ok) return sinCambios(estado, [...jugadores], 'ENTRADA_INVALIDA');

  const propuesta = {
    id: `pr-${playerId.slice(-6)}-${estado.social.propuestas.length + 1}`,
    autorId: playerId,
    texto: saneado.texto,
    votos: 0,
    oculta: false,
  };

  const nuevoEstado: EstadoSala = conOperacion(
    {
      ...estado,
      cubos: { ...estado.cubos, [clave]: cubo },
      social: { ...estado.social, propuestas: [...estado.social.propuestas, propuesta] },
    },
    intencion.opId,
  );

  const activos = jugadoresQueCuentan(jugadores);

  return {
    estado: nuevoEstado,
    jugadores: [...jugadores],
    eventos: [
      { type: 'RESPUESTA_ACEPTADA', audience: `P:${playerId}`, payload: { opId: intencion.opId } },
      {
        type: 'SOCIAL_ESTADO',
        audience: 'ALL',
        payload: {
          subfase: 'ESCRIBIR',
          escritas: nuevoEstado.social?.propuestas.length ?? 0,
          esperados: activos.length,
        },
      },
    ],
    respuestas: [],
    puntosEquipo: [],
    resultado: { ok: true, seq: 0 },
  };
}

function votar(
  estado: EstadoSala,
  jugadores: readonly JugadorSala[],
  deps: DepsSala,
  contexto: ContextoIntencion,
  intencion: Extract<IntencionCliente, { type: 'VOTE_SUBMIT' }>,
): ResultadoSala {
  const playerId = contexto.autor.playerId;
  if (!playerId) return sinCambios(estado, [...jugadores], 'NO_AUTORIZADO');
  if (!estado.social || estado.social.subfase !== 'VOTAR') {
    return sinCambios(estado, [...jugadores], 'FASE_INCORRECTA');
  }
  if (estado.social.votantes.includes(playerId)) {
    return sinCambios(estado, [...jugadores], 'YA_RESPONDIDA');
  }

  const propuesta = estado.social.propuestas.find(
    (candidata) => candidata.id === intencion.propuestaId,
  );
  if (!propuesta || propuesta.oculta) {
    return sinCambios(estado, [...jugadores], 'ENTRADA_INVALIDA');
  }
  // No se puede votar la propia: sería un autobombo gratis.
  if (propuesta.autorId === playerId) {
    return sinCambios(estado, [...jugadores], 'ENTRADA_INVALIDA');
  }

  const propuestas = estado.social.propuestas.map((candidata) =>
    candidata.id === intencion.propuestaId
      ? { ...candidata, votos: candidata.votos + 1 }
      : candidata,
  );

  // Cada voto recibido son puntos para el autor.
  const PUNTOS_POR_VOTO = 250;
  const actualizados = jugadores.map((candidato) =>
    candidato.id === propuesta.autorId
      ? { ...candidato, score: candidato.score + PUNTOS_POR_VOTO }
      : candidato,
  );

  const nuevoEstado: EstadoSala = conOperacion(
    {
      ...estado,
      social: {
        ...estado.social,
        propuestas,
        votantes: [...estado.social.votantes, playerId],
      },
    },
    intencion.opId,
  );

  return {
    estado: nuevoEstado,
    jugadores: actualizados,
    eventos: [
      { type: 'RESPUESTA_ACEPTADA', audience: `P:${playerId}`, payload: { opId: intencion.opId } },
      {
        type: 'SOCIAL_ESTADO',
        audience: 'ALL',
        payload: {
          subfase: 'VOTAR',
          propuestas: propuestas.map((candidata) => ({
            id: candidata.id,
            texto: candidata.texto,
            votos: candidata.votos,
            oculta: candidata.oculta,
          })),
          votos: nuevoEstado.social?.votantes.length ?? 0,
          esperados: jugadoresQueCuentan(jugadores).length,
        },
      },
    ],
    respuestas: [],
    puntosEquipo: recalcularEquipos(actualizados, deps.equipos),
    resultado: { ok: true, seq: 0 },
  };
}

// ── Controles del host ──────────────────────────────────────────────────────────

function accionDeHost(
  estado: EstadoSala,
  jugadores: readonly JugadorSala[],
  deps: DepsSala,
  contexto: ContextoIntencion,
  intencion: IntencionCliente,
): ResultadoSala {
  if (contexto.autor.rol !== 'HOST') return sinCambios(estado, [...jugadores], 'NO_AUTORIZADO');

  const ok = (
    avance: Avance,
    respuestas: RespuestaCalculada[] = [],
  ): ResultadoSala => ({
    estado: conOperacion(avance.estado, intencion.opId),
    jugadores: avance.jugadores.length > 0 ? avance.jugadores : [...jugadores],
    eventos: avance.eventos,
    respuestas,
    puntosEquipo: recalcularEquipos(
      avance.jugadores.length > 0 ? avance.jugadores : jugadores,
      deps.equipos,
    ),
    resultado: { ok: true, seq: 0 },
  });

  switch (intencion.type) {
    case 'HOST_START': {
      if (estado.fase !== 'LOBBY') return sinCambios(estado, [...jugadores], 'FASE_INCORRECTA');
      const activos = jugadoresQueCuentan(jugadores);
      if (activos.length < 1) return sinCambios(estado, [...jugadores], 'FASE_INCORRECTA');
      return ok({
        estado: {
          ...estado,
          fase: 'COUNTDOWN',
          countdownHasta: contexto.ahora + COUNTDOWN_MS,
          faseHasta: contexto.ahora + COUNTDOWN_MS,
        },
        jugadores: [],
        eventos: [
          {
            type: 'PARTIDA_EMPEZANDO',
            audience: 'ALL',
            payload: {
              countdownHasta: contexto.ahora + COUNTDOWN_MS,
              jugadores: activos.length,
              totalPreguntas: totalPreguntas(deps.config),
            },
          },
        ],
      });
    }

    case 'HOST_NEXT': {
      // Modo presentador: fuerza el avance de la fase actual.
      const forzado = avanzarSiToca(
        { ...estado, faseHasta: contexto.ahora },
        jugadores,
        { ...deps, config: { ...deps.config, autoPilot: true } },
        contexto.ahora,
      );
      return {
        ...forzado,
        estado: conOperacion(forzado.estado, intencion.opId),
      };
    }

    case 'HOST_LOCK_QUESTION': {
      if (estado.fase !== 'QUESTION') return sinCambios(estado, [...jugadores], 'FASE_INCORRECTA');
      return ok(cerrarPregunta(estado, contexto.ahora));
    }

    case 'HOST_REVEAL': {
      if (estado.fase !== 'LOCKED' && estado.fase !== 'QUESTION') {
        return sinCambios(estado, [...jugadores], 'FASE_INCORRECTA');
      }
      const cerrada = estado.fase === 'QUESTION' ? cerrarPregunta(estado, contexto.ahora) : null;
      const base = cerrada?.estado ?? estado;
      const revelado = revelar(base, jugadores, deps, contexto.ahora, []);
      return ok(
        {
          estado: revelado.estado,
          jugadores: revelado.jugadores,
          eventos: [...(cerrada?.eventos ?? []), ...revelado.eventos],
        },
        revelado.respuestas,
      );
    }

    case 'HOST_SKIP': {
      if (!estado.actual) return sinCambios(estado, [...jugadores], 'FASE_INCORRECTA');
      return ok(
        siguientePregunta(
          {
            ...estado,
            actual: null,
            preguntaEnRonda: estado.preguntaEnRonda + 1,
            preguntaIndex: estado.preguntaIndex + 1,
            avisos: [...estado.avisos, 'Pregunta saltada por el presidente.'].slice(-5),
          },
          jugadores,
          deps,
          contexto.ahora,
        ),
      );
    }

    case 'HOST_ANNUL': {
      if (!estado.actual) return sinCambios(estado, [...jugadores], 'FASE_INCORRECTA');
      return ok({
        estado: {
          ...estado,
          actual: { ...estado.actual, anulada: true },
          avisos: [...estado.avisos, 'Pregunta anulada: no puntúa a nadie.'].slice(-5),
        },
        jugadores: [],
        eventos: [{ type: 'AVISO', audience: 'ALL', payload: { texto: 'Pregunta anulada' } }],
      });
    }

    case 'HOST_SHOW_LEADERBOARD':
      return ok({
        estado: { ...estado, mostrarClasificacion: intencion.mostrar },
        jugadores: [],
        eventos: intencion.mostrar
          ? [clasificacionEvento(estado, jugadores, deps, 'MANUAL')]
          : [{ type: 'CLASIFICACION', audience: 'ALL', payload: { ocultar: true } }],
      });

    case 'HOST_HIDE_ANSWER': {
      if (!estado.social) return sinCambios(estado, [...jugadores], 'FASE_INCORRECTA');
      return ok({
        estado: {
          ...estado,
          social: {
            ...estado.social,
            propuestas: estado.social.propuestas.map((propuesta) =>
              propuesta.id === intencion.propuestaId ? { ...propuesta, oculta: true } : propuesta,
            ),
          },
        },
        jugadores: [],
        eventos: [
          {
            type: 'SOCIAL_ESTADO',
            audience: 'ALL',
            payload: { ocultada: intencion.propuestaId },
          },
        ],
      });
    }

    case 'HOST_FINISH':
      return ok(terminarPartida(estado, jugadores, deps, contexto.ahora));

    default:
      // El resto de controles de host los resuelve el servicio (tocan columnas, no estado).
      return {
        estado: conOperacion(estado, intencion.opId),
        jugadores: [...jugadores],
        eventos: [],
        respuestas: [],
        puntosEquipo: [],
        resultado: { ok: true, seq: 0 },
      };
  }
}

// ── Punto de entrada ────────────────────────────────────────────────────────────

/**
 * Aplica una intención al estado de la sala. Antes de nada avanza las fases vencidas, para
 * que una respuesta que llega justo en el cambio de fase se evalúe contra el estado real.
 */
export function aplicarIntencion(
  estado: EstadoSala,
  jugadores: readonly JugadorSala[],
  deps: DepsSala,
  contexto: ContextoIntencion,
  intencion: IntencionCliente,
): ResultadoSala {
  // Idempotencia: un reintento del mismo opId no vuelve a puntuar.
  if (operacionRepetida(estado, intencion.opId)) {
    return {
      estado,
      jugadores: [...jugadores],
      eventos: [],
      respuestas: [],
      puntosEquipo: [],
      resultado: { ok: true, seq: 0 },
    };
  }

  const previo = avanzarSiToca(estado, jugadores, deps, contexto.ahora);
  const base = previo.estado;
  const jugadoresBase = previo.jugadores;

  const combinar = (siguiente: ResultadoSala): ResultadoSala => ({
    estado: siguiente.estado,
    jugadores: siguiente.jugadores,
    eventos: [...previo.eventos, ...siguiente.eventos],
    respuestas: [...previo.respuestas, ...siguiente.respuestas],
    puntosEquipo:
      siguiente.puntosEquipo.length > 0 ? siguiente.puntosEquipo : previo.puntosEquipo,
    resultado: siguiente.resultado,
  });

  switch (intencion.type) {
    case 'ANSWER_SUBMIT':
      return combinar(registrarRespuesta(base, jugadoresBase, deps, contexto, intencion));
    case 'POWERUP_USE':
      return combinar(usarComodin(base, jugadoresBase, deps, contexto, intencion));
    case 'BET_SUBMIT':
      return combinar(colocarApuesta(base, jugadoresBase, contexto, intencion));
    case 'TEXT_SUBMIT':
      return combinar(enviarTexto(base, jugadoresBase, contexto, intencion));
    case 'VOTE_SUBMIT':
      return combinar(votar(base, jugadoresBase, deps, contexto, intencion));
    case 'REACTION':
      return combinar(reaccionar(base, jugadoresBase, contexto, intencion));
    default:
      if (intencion.type.startsWith('HOST_')) {
        return combinar(accionDeHost(base, jugadoresBase, deps, contexto, intencion));
      }
      return combinar({
        estado: conOperacion(base, intencion.opId),
        jugadores: jugadoresBase,
        eventos: [],
        respuestas: [],
        puntosEquipo: [],
        resultado: { ok: true, seq: 0 },
      });
  }
}

export { clasificacionEvento, clasificar, jugadoresQueCuentan, recalcularEquipos, totalPreguntas };
