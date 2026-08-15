/**
 * ESTADO AUTORITATIVO DE LA SALA.
 *
 * Es un objeto plano y serializable: se guarda tal cual en `Room.state` (JSON) y se valida
 * con Zod al leerlo, igual que `Question.payload` en Fase 1. Dos invocaciones serverless
 * distintas ven exactamente lo mismo porque lo leen de la base de datos, no de memoria.
 *
 * Lo que NO vive aquí: el banco de preguntas (va como dependencia del reducer, para que el
 * estado sea pequeño) y los datos de los jugadores (tienen su propia tabla, porque se
 * consultan y ordenan por puntuación).
 */

import { z } from 'zod';

import { FASES_SALA } from './protocolo';

/** Extras que un comodín le ha dado a UN jugador en la pregunta en curso. */
export const extrasJugadorSchema = z.object({
  /** Opciones que le ha descartado RADIO PATIO (solo a él). */
  eliminadas: z.array(z.string().max(40)).max(6).default([]),
  /** Segundos que le ha añadido UN POQUITO DE POR FAVOR (solo a él). */
  segundosExtra: z.number().int().min(0).max(60).default(0),
  /** Multiplicadores personales (junta extraordinaria, se ha ido la luz). */
  multiplicadores: z
    .array(z.object({ id: z.string().max(40), label: z.string().max(60), multiplier: z.number() }))
    .max(4)
    .default([]),
  /** SE HA IDO LA LUZ: responde sin ver los textos. */
  aOscuras: z.boolean().default(false),
  /** CAMBIO DE PRESIDENTE: el próximo fallo no le rompe la racha. */
  rachaProtegida: z.boolean().default(false),
  /** Apuesta colocada en la ronda final. */
  apuesta: z.number().int().min(0).default(0),
  /** FONDO DE RESERVA: fracción de la apuesta que se le devuelve si falla. */
  proteccionApuesta: z.number().min(0).max(1).default(0),
  /** Comodines gastados en ESTA pregunta (tope de dos). */
  comodinesAqui: z.array(z.string().max(40)).max(4).default([]),
});

export type ExtrasJugador = z.infer<typeof extrasJugadorSchema>;

export function extrasVacios(): ExtrasJugador {
  return {
    eliminadas: [],
    segundosExtra: 0,
    multiplicadores: [],
    aOscuras: false,
    rachaProtegida: false,
    apuesta: 0,
    proteccionApuesta: 0,
    comodinesAqui: [],
  };
}

export const preguntaEnJuegoSchema = z.object({
  questionId: z.string().min(1),
  roundId: z.string().min(1),
  indexInGame: z.number().int().min(0),
  /** Orden de presentación de opciones, común a toda la sala. */
  optionOrder: z.array(z.string().max(40)).max(12).default([]),
  timeLimitSeconds: z.number().int().min(5).max(180),
  /** Ventana autoritativa, en epoch ms. */
  empiezaEn: z.number().int(),
  terminaEn: z.number().int(),
  estudioHasta: z.number().int(),
  modificadores: z
    .array(z.object({ id: z.string().max(40), label: z.string().max(60), multiplier: z.number() }))
    .max(6)
    .default([]),
  pistasReveladas: z.number().int().min(1).max(8).default(1),
  /** Extras por jugador. Clave = playerId. */
  porJugador: z.record(z.string(), extrasJugadorSchema).default({}),
  /** Quién ha respondido ya (para el contador de la TV). */
  respondidos: z.array(z.string().max(64)).max(64).default([]),
  /** Ronda con apuesta previa (la derrama / presidente por un día). */
  conApuesta: z.boolean().default(false),
  /** Si el host la ha anulado: no puntúa a nadie. */
  anulada: z.boolean().default(false),
});

export type PreguntaEnJuego = z.infer<typeof preguntaEnJuegoSchema>;

export const resumenRondaSchema = z.object({
  roundId: z.string().min(1),
  titulo: z.string().min(1).max(80),
  preguntas: z.number().int().min(0),
  /** Puntos que ha sacado cada jugador en la ronda. Clave = playerId. */
  puntos: z.record(z.string(), z.number()).default({}),
  aciertos: z.record(z.string(), z.number()).default({}),
});

export type ResumenRonda = z.infer<typeof resumenRondaSchema>;

/** Ronda social: se escribe una propuesta y luego se vota. */
export const estadoSocialSchema = z.object({
  subfase: z.enum(['ESCRIBIR', 'VOTAR', 'RECUENTO']),
  situacion: z.string().max(500),
  terminaEn: z.number().int(),
  propuestas: z
    .array(
      z.object({
        id: z.string().max(64),
        autorId: z.string().max(64),
        texto: z.string().max(200),
        votos: z.number().int().min(0).default(0),
        oculta: z.boolean().default(false),
      }),
    )
    .max(40)
    .default([]),
  /** Quién ha votado ya, para que nadie vote dos veces. */
  votantes: z.array(z.string().max(64)).max(64).default([]),
});

export type EstadoSocial = z.infer<typeof estadoSocialSchema>;

export const cuboSchema = z.object({
  fichas: z.number(),
  ultimoRelleno: z.number().int(),
});

export const premioSchema = z.object({
  id: z.string().max(40),
  titulo: z.string().max(60),
  playerId: z.string().max(64),
  nickname: z.string().max(40),
  detalle: z.string().max(120),
});

export const estadoSalaSchema = z.object({
  version: z.number().int().min(1).default(1),
  fase: z.enum(FASES_SALA).default('LOBBY'),
  rondaIndex: z.number().int().min(0).default(0),
  preguntaEnRonda: z.number().int().min(0).default(0),
  preguntaIndex: z.number().int().min(0).default(0),
  actual: preguntaEnJuegoSchema.nullable().default(null),
  /** Ids de pregunta ya usados: la garantía de no repetir. */
  usados: z.array(z.string().max(64)).max(400).default([]),
  rondas: z.array(resumenRondaSchema).max(30).default([]),
  /** Cuándo termina la cuenta atrás del arranque. */
  countdownHasta: z.number().int().nullable().default(null),
  /**
   * Cuándo avanza automáticamente la fase actual. En modo presentador se ignora: manda el
   * host. Es lo que permite que el juego dirija solo sin ningún temporizador de servidor:
   * cualquier lectura posterior a esta marca provoca el avance.
   */
  faseHasta: z.number().int().nullable().default(null),
  mostrarClasificacion: z.boolean().default(false),
  /** Posición de cada jugador la última vez que se mostró la clasificación. */
  posicionesPrevias: z.record(z.string(), z.number()).default({}),
  social: estadoSocialSchema.nullable().default(null),
  premios: z.array(premioSchema).max(10).default([]),
  /** Cubos de fichas para los límites de ritmo. Clave = `${playerId}:${canal}`. */
  cubos: z.record(z.string(), cuboSchema).default({}),
  /** Ids de operación ya procesados, para la idempotencia. Se poda por tamaño. */
  operaciones: z.array(z.string().max(64)).max(400).default([]),
  /** Avisos para la TV (banco agotado, pregunta anulada…). */
  avisos: z.array(z.string().max(160)).max(10).default([]),
  /** Cuántas revanchas se han jugado con este grupo. */
  revanchas: z.number().int().min(0).default(0),
});

export type EstadoSala = z.infer<typeof estadoSalaSchema>;

export function estadoInicial(): EstadoSala {
  return estadoSalaSchema.parse({});
}

export function parsearEstado(valor: unknown): EstadoSala {
  return estadoSalaSchema.parse(valor);
}

/** Jugador tal y como lo necesita el reducer (espejo de la fila `RoomPlayer`). */
export type JugadorSala = {
  id: string;
  nickname: string;
  arquetipo: string;
  colorAvatar: string;
  rol: 'HOST' | 'PLAYER' | 'SPECTATOR';
  estado: 'ACTIVE' | 'RECONNECTING' | 'AWAY' | 'KICKED' | 'LEFT';
  teamId: string | null;
  score: number;
  streak: number;
  bestStreak: number;
  correct: number;
  answered: number;
  totalResponseMs: number;
  powerUpsUsed: string[];
  joinScore: number;
  joinedAtIndex: number;
  lastSeenAt: number;
};

/** ¿Cuenta este jugador para el marcador y para el «esperando respuestas»? */
export function jugadorCuenta(jugador: JugadorSala): boolean {
  if (jugador.rol !== 'PLAYER') return false;
  return jugador.estado === 'ACTIVE' || jugador.estado === 'RECONNECTING';
}
