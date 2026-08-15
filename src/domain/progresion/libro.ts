/**
 * LIBRO MAYOR DE EXPERIENCIA — de dónde sale el XP y qué lo frena.
 *
 * Fase 2 ya calculaba el XP de una partida (`domain/progression`). Fase 4 no lo sustituye:
 * lo mete en un LIBRO MAYOR con motivo y origen, y le pone freno.
 *
 * ## Por qué un libro mayor y no `user.xp += 500`
 *
 * Un contador no se puede auditar ni arreglar. Si un reintento concede XP dos veces, con un
 * contador no hay forma de saberlo; con un libro, la clave única (usuario, motivo, origen)
 * hace que la segunda concesión ni siquiera exista. `UserProfile.xp` es la suma cacheada.
 *
 * ## Freno al farmeo (§78)
 *
 * Tres capas, y ninguna castiga a quien juega normal:
 *
 *   1. **Partida significativa.** Una partida que no llega a un mínimo de preguntas
 *      respondidas o que dura cuatro segundos no da XP. Dos amigos creando salas de una
 *      pregunta no farmean nada.
 *   2. **Rendimientos decrecientes por día.** A partir de cierto número de partidas en un
 *      día, cada una vale menos. La quinta partida del día sigue dando; la decimoquinta,
 *      casi nada. No se prohíbe jugar: se deja de pagar por repetir.
 *   3. **Topes diarios por fuente.** El reto diario paga una vez al día por definición; los
 *      logros pagan una vez en la vida.
 *
 * Todo se calcula con funciones puras a las que se les pasa lo que ya se concedió hoy: no
 * hay estado escondido y se puede probar sin base de datos.
 */

import { XP, xpForGame, type EntradaXp } from '../progression/progression';

/** De dónde puede venir el XP. Un motivo nuevo se añade aquí y en `TOPES`. */
export const MOTIVOS_XP = [
  'PARTIDA',
  'VICTORIA_SALA',
  'RETO_DIARIO',
  'RETO_SEMANAL',
  'LOGRO',
  'INSIGNIA',
  'DESAFIO_COMPLETADO',
  'PARTIDA_CON_AMIGOS',
  'RACHA_HITO',
  'TEMPORADA',
] as const;

export type MotivoXp = (typeof MOTIVOS_XP)[number];

/**
 * Tope diario por motivo, en XP. `null` = sin tope (los logros no se repiten, así que no
 * hace falta limitarlos).
 */
export const TOPES_DIARIOS: Record<MotivoXp, number | null> = {
  PARTIDA: 1200,
  VICTORIA_SALA: 600,
  RETO_DIARIO: 400,
  RETO_SEMANAL: 900,
  LOGRO: null,
  INSIGNIA: null,
  DESAFIO_COMPLETADO: 500,
  PARTIDA_CON_AMIGOS: 400,
  RACHA_HITO: 300,
  TEMPORADA: null,
};

/** Una partida por debajo de esto no cuenta para nada: ni XP, ni racha, ni liga. */
export const MINIMOS_PARTIDA = {
  /** Preguntas efectivamente respondidas (no vale abrir y salir). */
  respuestas: 5,
  /** Segundos de duración. Cinco preguntas en tres segundos no las ha leído nadie. */
  segundos: 45,
} as const;

/**
 * A partir de la enésima partida del día, cada una vale menos. La curva es suave: la
 * cuarta todavía paga bien, y no se llega a cero nunca (jugar siempre suma algo).
 */
export const DECRECIENTES = {
  desdePartida: 3,
  /** Factor que se multiplica por cada partida extra del día. */
  factor: 0.65,
  /** Suelo: nunca se paga menos de esta fracción. */
  suelo: 0.1,
} as const;

export type PartidaParaXp = EntradaXp & {
  /** Id de la partida. Es el `sourceId` del apunte: lo que lo hace idempotente. */
  gameId: string;
  /** Respuestas efectivamente enviadas. */
  respuestas: number;
  /** Duración real de la partida, en segundos. */
  segundos: number;
};

/** ¿Esta partida cuenta como actividad de verdad? */
export function partidaSignificativa(partida: {
  respuestas: number;
  segundos: number;
}): boolean {
  return (
    partida.respuestas >= MINIMOS_PARTIDA.respuestas && partida.segundos >= MINIMOS_PARTIDA.segundos
  );
}

/** Factor de rendimientos decrecientes según cuántas partidas lleve hoy. */
export function factorDelDia(partidasHoy: number): number {
  if (partidasHoy < DECRECIENTES.desdePartida) return 1;
  const exceso = partidasHoy - DECRECIENTES.desdePartida + 1;
  return Math.max(DECRECIENTES.suelo, DECRECIENTES.factor ** exceso);
}

export type ConcesionXp = {
  motivo: MotivoXp;
  sourceId: string;
  /** XP que se concede de verdad. */
  cantidad: number;
  /** Cuánto se ha recortado, y por qué, para poder explicárselo al jugador. */
  recortado: number;
  motivoRecorte: 'NINGUNO' | 'NO_SIGNIFICATIVA' | 'DECRECIENTE' | 'TOPE_DIARIO';
};

export type ContextoDia = {
  /** XP ya concedido HOY por cada motivo. */
  concedidoHoy: Partial<Record<MotivoXp, number>>;
  /** Partidas ya jugadas hoy que contaron. */
  partidasHoy: number;
};

/** Aplica el tope diario a una cantidad ya calculada. */
function aplicarTope(
  motivo: MotivoXp,
  cantidad: number,
  contexto: ContextoDia,
): { cantidad: number; recortado: number } {
  const tope = TOPES_DIARIOS[motivo];
  if (tope === null) return { cantidad, recortado: 0 };

  const yaConcedido = contexto.concedidoHoy[motivo] ?? 0;
  const margen = Math.max(0, tope - yaConcedido);
  const final = Math.min(cantidad, margen);
  return { cantidad: final, recortado: cantidad - final };
}

/**
 * XP por terminar una partida. Reutiliza la fórmula de Fase 2 y le aplica los frenos.
 */
export function xpDePartida(partida: PartidaParaXp, contexto: ContextoDia): ConcesionXp {
  const base = {
    motivo: 'PARTIDA' as const,
    sourceId: partida.gameId,
    recortado: 0,
    motivoRecorte: 'NINGUNO' as const,
  };

  if (!partidaSignificativa(partida)) {
    return { ...base, cantidad: 0, recortado: 0, motivoRecorte: 'NO_SIGNIFICATIVA' };
  }

  const bruto = xpForGame(partida);
  const factor = factorDelDia(contexto.partidasHoy);
  const conFactor = Math.round(bruto * factor);
  const recorteDecreciente = bruto - conFactor;

  const conTope = aplicarTope('PARTIDA', conFactor, contexto);

  return {
    ...base,
    cantidad: conTope.cantidad,
    recortado: recorteDecreciente + conTope.recortado,
    motivoRecorte:
      conTope.recortado > 0
        ? 'TOPE_DIARIO'
        : recorteDecreciente > 0
          ? 'DECRECIENTE'
          : 'NINGUNO',
  };
}

/** XP de cualquier otra fuente (retos, logros, desafíos…). */
export function xpDeFuente(
  motivo: MotivoXp,
  sourceId: string,
  cantidad: number,
  contexto: ContextoDia,
): ConcesionXp {
  const conTope = aplicarTope(motivo, Math.max(0, Math.round(cantidad)), contexto);
  return {
    motivo,
    sourceId,
    cantidad: conTope.cantidad,
    recortado: conTope.recortado,
    motivoRecorte: conTope.recortado > 0 ? 'TOPE_DIARIO' : 'NINGUNO',
  };
}

/** Cuánto paga cada cosa. Números redondos a propósito: se explican en una línea. */
export const RECOMPENSAS = {
  retoDiario: 150,
  retoDiarioPerfecto: 250,
  retoSemanal: 400,
  logro: 120,
  insignia: 200,
  desafioCompletado: 90,
  desafioGanado: 160,
  partidaConAmigos: 80,
  victoriaEnSala: 140,
  hitoDeRacha: 100,
} as const;

/**
 * Frase para el jugador cuando se le recorta XP. Nunca se le oculta: se le dice, sin
 * regañarle. «Ya has sacado el máximo de hoy» es información; «has jugado demasiado» es
 * una reprimenda, y eso no.
 */
export function explicarRecorte(concesion: ConcesionXp): string | null {
  switch (concesion.motivoRecorte) {
    case 'NO_SIGNIFICATIVA':
      return 'Esta partida ha sido demasiado corta para contar.';
    case 'DECRECIENTE':
      return 'Las partidas de después de las primeras del día dan menos experiencia.';
    case 'TOPE_DIARIO':
      return 'Ya has sacado toda la experiencia de hoy por aquí. Mañana vuelve a contar.';
    case 'NINGUNO':
      return null;
  }
}

export { XP };
