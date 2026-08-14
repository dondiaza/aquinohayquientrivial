/**
 * PROTOCOLO DE SALA — el contrato entre la pantalla grande, los móviles y el servidor.
 *
 * Dos direcciones bien separadas:
 *
 *   · CLIENTE → SERVIDOR: `IntencionCliente`. Son INTENCIONES, nunca resultados. El móvil
 *     dice «he pulsado la opción B», no «he ganado 1000 puntos». Todo lo que llegue aquí
 *     se valida con Zod y se comprueba contra el estado autoritativo.
 *   · SERVIDOR → CLIENTE: `EventoSala`. Son HECHOS, en pasado, con `seq` monotónico por
 *     sala. El cliente los lee por cursor, así que la reconexión es la consulta normal.
 *
 * Regla de oro (§44 del encargo): un evento con audiencia de jugador NO puede contener la
 * respuesta correcta. Por eso la pregunta viaja como `VistaPregunta`, que se construye en
 * `vista.ts` quitando explícitamente la solución, y hay un test que lo comprueba tipo por
 * tipo.
 *
 * VERSIONADO: `VERSION_PROTOCOLO` viaja en el snapshot. Si un cliente viejo se queda
 * abierto en un móvil mientras se despliega una versión nueva, ve un aviso de recargar en
 * lugar de romperse a lo tonto.
 */

import { z } from 'zod';

import { POWER_UP_IDS } from '../powerups/powerups';
import { answerSubmissionSchema } from '../engine/wire';

export const VERSION_PROTOCOLO = 1;

// ── Fases de la sala ────────────────────────────────────────────────────────────

export const FASES_SALA = [
  'LOBBY',
  'COUNTDOWN',
  'ROUND_INTRO',
  'QUESTION',
  'LOCKED',
  'REVEAL',
  'SCORE',
  'ROUND_RESULTS',
  'FINAL_BET',
  'GAME_RESULTS',
  'CLOSED',
] as const;

export type FaseSala = (typeof FASES_SALA)[number];

export const ROLES_SALA = ['HOST', 'PLAYER', 'SPECTATOR'] as const;
export type RolSala = (typeof ROLES_SALA)[number];

export const ESTADOS_MIEMBRO = ['ACTIVE', 'RECONNECTING', 'AWAY', 'KICKED', 'LEFT'] as const;
export type EstadoMiembro = (typeof ESTADOS_MIEMBRO)[number];

export const MODOS_EQUIPO = ['NINGUNO', 'COMPARTIDO', 'INDIVIDUAL'] as const;
export type ModoEquipo = (typeof MODOS_EQUIPO)[number];

export const LATE_JOIN = ['CERRADO', 'ESPECTADOR', 'PRIMERA_RONDA', 'ABIERTO'] as const;
export type LateJoin = (typeof LATE_JOIN)[number];

export const REPARTO_EQUIPOS = ['AUTOMATICO', 'ELEGIR', 'HOST'] as const;
export type RepartoEquipos = (typeof REPARTO_EQUIPOS)[number];

// ── Reacciones ──────────────────────────────────────────────────────────────────

/**
 * Reacciones del portal. Son emoji corrientes (no material de la serie) y están cerradas:
 * un conjunto fijo evita que el móvil se convierta en un canal de texto sin moderar.
 */
export const REACCIONES = ['👏', '😂', '😱', '🔥', '🙄', '📡'] as const;
export type Reaccion = (typeof REACCIONES)[number];

// ── Vistas: lo que se pinta ─────────────────────────────────────────────────────

export type VistaJugador = {
  id: string;
  nickname: string;
  arquetipo: string;
  colorAvatar: string;
  rol: RolSala;
  estado: EstadoMiembro;
  teamId: string | null;
  puntos: number;
  racha: number;
  /** Si ha enviado respuesta a la pregunta en curso. La TV cuenta, no señala. */
  haRespondido: boolean;
};

export type VistaEquipo = {
  id: string;
  nombre: string;
  color: string;
  slot: number;
  puntos: number;
  jugadores: string[];
};

/** Una opción tal y como la ve el jugador: sin ninguna marca de si es la buena. */
export type VistaOpcion = { id: string; text: string; icon?: string };

/**
 * La pregunta SIN la solución. Se construye en `vista.ts`; este tipo existe para que
 * TypeScript impida añadir por descuido un campo con la respuesta.
 */
export type VistaPregunta = {
  questionId: string;
  indexInGame: number;
  totalPreguntas: number;
  roundId: string;
  rondaTitulo: string;
  rondaIcono: string;
  tipo: string;
  variant?: string;
  familia: string;
  instruccion: string;
  prompt: string;
  dificultad: number;
  /** Opciones ya en el orden de presentación de la sala (mezclado y estable). */
  opciones: VistaOpcion[] | null;
  /** ¿QUIÉN ES?: pistas reveladas hasta ahora. */
  pistas: string[];
  /** EL INFILTRADO. */
  setLabel?: string;
  items?: VistaOpcion[];
  /** ORDENA EL DESASTRE: pasos MEZCLADOS (el orden correcto no viaja). */
  pasos?: VistaOpcion[];
  primeraEtiqueta?: string;
  ultimaEtiqueta?: string;
  /** MEMORIA / ¿QUÉ FALTA?: lo que se muestra para memorizar o mirar. */
  aMemorizar?: VistaOpcion[];
  escena?: string;
  preguntaDeMemoria?: string;
  /** PORTERO AUTOMÁTICO: botones y la secuencia a repetir (hay que verla: es el juego). */
  pads?: VistaOpcion[];
  secuencia?: string[];
  stepMs?: number;
  /** LA JUNTA: la situación y las decisiones, SIN pesos ni consecuencias. */
  situacion?: string;
  /** FICHA DEL VECINO: la pista de iniciales si la pregunta la trae. */
  pista?: string;
  /** Tiempos AUTORITATIVOS del servidor, en epoch ms. */
  empiezaEn: number;
  terminaEn: number;
  /** Hasta cuándo dura la fase de estudio (memoria y secuencia). 0 = no hay. */
  estudioHasta: number;
  /** Modificadores activos, para que la TV los cante. */
  modificadores: { id: string; label: string; multiplier: number }[];
};

/** Lo que un jugador ve de SU propia situación en la pregunta en curso. */
export type VistaPrivada = {
  playerId: string;
  /** Opciones que le ha descartado RADIO PATIO. */
  eliminadas: string[];
  /** Segundos extra que le ha dado UN POQUITO DE POR FAVOR. */
  segundosExtra: number;
  /** Su fin de tiempo personal, ya con los extras aplicados. */
  terminaEn: number;
  /** Apuesta colocada en la ronda final. */
  apuesta: number;
  /** Comodines que le quedan. */
  comodinesDisponibles: string[];
  /** true en cuanto el servidor le ha confirmado la respuesta. */
  haRespondido: boolean;
  /** Su resultado, solo a partir del reveal. */
  resultado?: {
    correcta: boolean;
    puntos: number;
    posicion: number;
    variacion: number;
    respuestaCorrecta: string;
    explicacion?: string;
  };
};

export type VistaSala = {
  version: number;
  code: string;
  fase: FaseSala;
  /** Reloj del servidor al construir la vista: el cliente calcula su desfase con esto. */
  servidorAhora: number;
  locked: boolean;
  autoPilot: boolean;
  teamMode: ModoEquipo;
  lateJoin: LateJoin;
  reactionsEnabled: boolean;
  maxPlayers: number;
  formatoLabel: string;
  dificultadLabel: string;
  categoriaLabel: string;
  sinSpoilers: boolean;
  totalPreguntas: number;
  preguntaIndex: number;
  rondaIndex: number;
  totalRondas: number;
  jugadores: VistaJugador[];
  equipos: VistaEquipo[];
  /** Cuántos han respondido ya, para el «esperando respuestas: 5/8» de la TV. */
  respondidos: number;
  /** Cuántos se espera que respondan (jugadores activos, sin espectadores). */
  esperados: number;
  pregunta: VistaPregunta | null;
  /** Solo en REVEAL y después: reparto de respuestas y solución. */
  revelado: VistaRevelado | null;
  /** Solo cuando el host la muestra. */
  clasificacion: VistaClasificacion | null;
  /** Ronda social en curso. */
  social: VistaSocial | null;
  /** Resumen final. */
  final: VistaFinal | null;
  /** Cuenta atrás del inicio, en epoch ms. */
  countdownHasta: number | null;
};

export type VistaRevelado = {
  questionId: string;
  /** Id (o valor) correcto, ya se puede decir. */
  correctoId: string | null;
  correctoTexto: string;
  explicacion?: string;
  /** Cuántas respuestas ha recibido cada opción. */
  reparto: { id: string; text: string; votos: number; esCorrecta: boolean }[];
  /** Quién acertó, para la coreografía de la TV. */
  aciertos: { playerId: string; nickname: string; puntos: number }[];
  fallos: { playerId: string; nickname: string }[];
  sinResponder: string[];
};

export type VistaClasificacion = {
  motivo: 'PERIODICA' | 'RONDA' | 'MANUAL' | 'FINAL';
  puestos: {
    posicion: number;
    playerId: string;
    nickname: string;
    arquetipo: string;
    colorAvatar: string;
    puntos: number;
    /** Puestos que sube (+) o baja (−) respecto a la última vez que se mostró. */
    variacion: number;
    racha: number;
    teamId: string | null;
    diferenciaConLider: number;
  }[];
  equipos: VistaEquipo[];
};

export type VistaSocial = {
  /** ESCRIBIR: los móviles redactan. VOTAR: la TV enseña y todos votan. */
  subfase: 'ESCRIBIR' | 'VOTAR';
  situacion: string;
  /** Propuestas ANÓNIMAS: el autor no viaja hasta el recuento. */
  propuestas: { id: string; texto: string; votos: number; oculta: boolean }[];
  /** Solo tras el recuento. */
  autores?: Record<string, string>;
  terminaEn: number;
};

export type VistaFinal = {
  podio: {
    posicion: number;
    playerId: string;
    nickname: string;
    arquetipo: string;
    colorAvatar: string;
    puntos: number;
    aciertos: number;
    respondidas: number;
  }[];
  equipoGanador: VistaEquipo | null;
  premios: { id: string; titulo: string; nickname: string; detalle: string }[];
};

// ── Eventos: servidor → cliente ─────────────────────────────────────────────────

export const TIPOS_EVENTO_SALA = [
  'SALA_CREADA',
  'SNAPSHOT',
  'JUGADOR_ENTRO',
  'JUGADOR_SALIO',
  'JUGADOR_RECONECTO',
  'JUGADOR_EXPULSADO',
  'JUGADOR_ESTADO',
  'EQUIPOS_CAMBIARON',
  'CONFIG_CAMBIO',
  'PARTIDA_EMPEZANDO',
  'PARTIDA_EMPEZO',
  'RONDA_EMPEZO',
  'PREGUNTA_EMPEZO',
  'RESPUESTA_ACEPTADA',
  'RESPUESTAS_CONTADAS',
  'PREGUNTA_CERRADA',
  'RESPUESTA_REVELADA',
  'RESULTADO_PERSONAL',
  'COMODIN_USADO',
  'SUCESO_EMPEZO',
  'PUNTUACION_ACTUALIZADA',
  'CLASIFICACION',
  'SOCIAL_ESTADO',
  'REACCION',
  'RONDA_TERMINO',
  'PARTIDA_TERMINO',
  'HOST_CAMBIO',
  'SALA_CERRADA',
  'AVISO',
] as const;

export type TipoEventoSala = (typeof TIPOS_EVENTO_SALA)[number];

export type EventoSala = {
  seq: number;
  type: TipoEventoSala;
  at: number;
  /** El payload va tipado por evento en la unión de abajo; aquí queda abierto para el cable. */
  payload: Record<string, unknown>;
};

/** Audiencia de un evento. Es lo que impide que la solución llegue antes de tiempo. */
export type Audiencia = 'ALL' | 'HOST' | `P:${string}`;

export function audienciaDeJugador(playerId: string): Audiencia {
  return `P:${playerId}`;
}

/** ¿Este evento le corresponde a quien pregunta? */
export function esParaMi(
  audiencia: string,
  quien: { rol: RolSala; playerId: string | null },
): boolean {
  if (audiencia === 'ALL') return true;
  if (audiencia === 'HOST') return quien.rol === 'HOST';
  if (audiencia.startsWith('P:')) return quien.playerId === audiencia.slice(2);
  return false;
}

// ── Intenciones: cliente → servidor ─────────────────────────────────────────────

const opId = z.string().min(8).max(64);

/**
 * Toda intención lleva `opId`: un identificador que genera el cliente y repite si
 * reintenta. El servidor lo usa para no puntuar dos veces un doble toque (§43).
 */
export const intencionClienteSchema = z.discriminatedUnion('type', [
  // ── Jugador ──
  z.object({
    type: z.literal('ANSWER_SUBMIT'),
    opId,
    questionIndex: z.number().int().min(0).max(400),
    submission: answerSubmissionSchema,
  }),
  z.object({
    type: z.literal('POWERUP_USE'),
    opId,
    questionIndex: z.number().int().min(0).max(400),
    powerUpId: z.enum(POWER_UP_IDS),
  }),
  z.object({
    type: z.literal('BET_SUBMIT'),
    opId,
    /** Fracción del marcador: 0, 0.1, 0.25 o 0.5. */
    fraccion: z.union([z.literal(0), z.literal(0.1), z.literal(0.25), z.literal(0.5)]),
  }),
  z.object({
    type: z.literal('TEXT_SUBMIT'),
    opId,
    questionIndex: z.number().int().min(0).max(400),
    texto: z.string().min(1).max(160),
  }),
  z.object({
    type: z.literal('VOTE_SUBMIT'),
    opId,
    propuestaId: z.string().min(1).max(64),
  }),
  z.object({ type: z.literal('REACTION'), opId, emoji: z.enum(REACCIONES) }),
  z.object({ type: z.literal('TEAM_PICK'), opId, teamId: z.string().min(1).max(64) }),
  z.object({ type: z.literal('READY'), opId, listo: z.boolean() }),
  z.object({ type: z.literal('LEAVE'), opId }),

  // ── Host ──
  z.object({ type: z.literal('HOST_START'), opId }),
  z.object({ type: z.literal('HOST_NEXT'), opId }),
  z.object({ type: z.literal('HOST_LOCK_QUESTION'), opId }),
  z.object({ type: z.literal('HOST_REVEAL'), opId }),
  z.object({ type: z.literal('HOST_SKIP'), opId }),
  z.object({ type: z.literal('HOST_ANNUL'), opId }),
  z.object({ type: z.literal('HOST_SHOW_LEADERBOARD'), opId, mostrar: z.boolean() }),
  z.object({ type: z.literal('HOST_LOCK_ROOM'), opId, cerrada: z.boolean() }),
  z.object({ type: z.literal('HOST_KICK'), opId, playerId: z.string().min(1).max(64) }),
  z.object({ type: z.literal('HOST_HIDE_ANSWER'), opId, propuestaId: z.string().min(1).max(64) }),
  z.object({ type: z.literal('HOST_MUTE_REACTIONS'), opId, silenciadas: z.boolean() }),
  z.object({
    type: z.literal('HOST_TEAMS'),
    opId,
    modo: z.enum(MODOS_EQUIPO),
    reparto: z.enum(REPARTO_EQUIPOS),
    equipos: z.number().int().min(2).max(6),
  }),
  z.object({
    type: z.literal('HOST_ASSIGN_TEAM'),
    opId,
    playerId: z.string().min(1).max(64),
    teamId: z.string().min(1).max(64).nullable(),
  }),
  z.object({
    type: z.literal('HOST_CONFIG'),
    opId,
    autoPilot: z.boolean().optional(),
    leaderboardEvery: z.number().int().min(0).max(20).optional(),
    lateJoin: z.enum(LATE_JOIN).optional(),
    reactionsEnabled: z.boolean().optional(),
  }),
  z.object({ type: z.literal('HOST_REGENERATE_CODE'), opId }),
  z.object({ type: z.literal('HOST_FINISH'), opId }),
  z.object({ type: z.literal('HOST_REMATCH'), opId }),
  z.object({ type: z.literal('HOST_CLOSE'), opId }),
  /** Latido del host: mantiene vivo el periodo de gracia. */
  z.object({ type: z.literal('HOST_PING'), opId }),
]);

export type IntencionCliente = z.infer<typeof intencionClienteSchema>;
export type TipoIntencion = IntencionCliente['type'];

/** ¿Esta intención solo la puede mandar el host? */
export function esIntencionDeHost(tipo: TipoIntencion): boolean {
  return tipo.startsWith('HOST_');
}

// ── Respuesta del servidor a una intención ──────────────────────────────────────

export const CODIGOS_ERROR = [
  'SALA_NO_EXISTE',
  'SALA_CERRADA',
  'SALA_LLENA',
  'SALA_EMPEZADA',
  'NO_AUTORIZADO',
  'FASE_INCORRECTA',
  'FUERA_DE_TIEMPO',
  'YA_RESPONDIDA',
  'TIPO_NO_ADMITIDO',
  'NOMBRE_OCUPADO',
  'NOMBRE_INVALIDO',
  'DEMASIADO_RAPIDO',
  'EXPULSADO',
  'COMODIN_NO_DISPONIBLE',
  'PROTOCOLO_ANTIGUO',
  'ENTRADA_INVALIDA',
] as const;

export type CodigoError = (typeof CODIGOS_ERROR)[number];

/** Mensajes de cara al usuario. Nada de códigos técnicos en pantalla (§50). */
export const MENSAJE_ERROR: Record<CodigoError, string> = {
  SALA_NO_EXISTE: 'Esa comunidad no existe. Revisa el código.',
  SALA_CERRADA: 'Esta junta ya se ha disuelto.',
  SALA_LLENA: 'No cabe nadie más en el portal.',
  SALA_EMPEZADA: 'La junta ya ha empezado.',
  NO_AUTORIZADO: 'Esto solo lo puede hacer quien presida la junta.',
  FASE_INCORRECTA: 'Ahora mismo no toca eso.',
  FUERA_DE_TIEMPO: 'Se acabó el tiempo de esta pregunta.',
  YA_RESPONDIDA: 'Ya habías respondido a esta.',
  TIPO_NO_ADMITIDO: 'Esa respuesta no vale para esta pregunta.',
  NOMBRE_OCUPADO: 'Ese nombre ya lo lleva otro vecino. Prueba con otro.',
  NOMBRE_INVALIDO: 'Ese nombre no cuela. Pon algo que puedas decir en voz alta.',
  DEMASIADO_RAPIDO: 'Un poquito de por favor: espera un momento.',
  EXPULSADO: 'La comunidad te ha invitado a salir del portal.',
  COMODIN_NO_DISPONIBLE: 'Ese comodín ya no lo tienes.',
  PROTOCOLO_ANTIGUO: 'Recarga la página: el juego se ha actualizado.',
  ENTRADA_INVALIDA: 'No se ha entendido lo que has enviado.',
};

export type ResultadoIntencion =
  | { ok: true; seq: number }
  | { ok: false; error: CodigoError; mensaje: string };

export function fallo(error: CodigoError): ResultadoIntencion {
  return { ok: false, error, mensaje: MENSAJE_ERROR[error] };
}
