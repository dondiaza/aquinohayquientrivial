/**
 * TIEMPO AUTORITATIVO.
 *
 * El problema: el reloj de un móvil no vale nada. Puede ir dos minutos adelantado, puede
 * congelarse cuando la pantalla se bloquea, y `setInterval` en segundo plano hace lo que
 * quiere. Si el servidor se creyera el «he tardado 1.200 ms» que manda el cliente, el
 * juego se rompería con un `curl`.
 *
 * La solución tiene tres partes:
 *
 *   1. EL SERVIDOR MANDA VENTANAS, NO CUENTAS ATRÁS. Con cada pregunta viajan `empiezaEn`,
 *      `terminaEn` y `servidorAhora` (epoch ms). El cliente calcula su desfase una vez y
 *      pinta la barra con el reloj corregido. Nunca pinta «20, 19, 18…» a ciegas.
 *   2. EL TIEMPO DE RESPUESTA LO MIDE EL SERVIDOR. `responseMs` sale de la hora de llegada
 *      de la petición menos `empiezaEn`. El cliente no lo envía.
 *   3. HAY GRACIA, PERO ACOTADA. Una respuesta que llega poco después del cierre se acepta
 *      (§11: tolerar latencia razonable), pero el bonus por tiempo se calcula sobre la
 *      ventana real, así que llegar tarde no se premia.
 *
 * Lo que NO se hace: premiar la buena conexión. El bonus por rapidez está topado en la
 * fórmula de puntuación de Fase 1 (máximo 300 puntos en tramos de 50), justamente para que
 * 200 ms de diferencia casi nunca decidan nada.
 */

/**
 * Margen que se perdona a una respuesta que llega después del cierre. Cubre el viaje de red
 * y el intervalo del transporte; por encima de esto es que no llegó a tiempo.
 */
export const GRACIA_RESPUESTA_MS = 1_200;

/** Margen para colocar la apuesta de la ronda final. Más holgado: se elige con calma. */
export const GRACIA_APUESTA_MS = 2_000;

/** Cuánto se espera al host desconectado antes de ofrecer traspasar la presidencia. */
export const GRACIA_HOST_MS = 45_000;

/** Sin señal durante este tiempo, un jugador pasa a RECONNECTING. */
export const UMBRAL_RECONECTANDO_MS = 8_000;

/** Y a partir de aquí, a AWAY (ausente). Nunca se expulsa por inactividad. */
export const UMBRAL_AUSENTE_MS = 45_000;

/** Duración de la cuenta atrás del arranque. Tres segundos, como en la tele. */
export const COUNTDOWN_MS = 3_200;

/** Cuánto se queda el revelado en pantalla antes de avanzar en modo automático. */
export const REVEAL_MS = 6_000;

/** Y la cartela de ronda. */
export const ROUND_INTRO_MS = 5_000;

export type Ventana = {
  /** Epoch ms en que empieza a contar el tiempo de respuesta. */
  empiezaEn: number;
  /** Epoch ms en que se cierra. */
  terminaEn: number;
  /** Hasta cuándo hay fase de estudio (memoria y secuencia). Igual a `empiezaEn` si no hay. */
  estudioHasta: number;
};

export function ventana(ahora: number, segundos: number, estudioMs = 0): Ventana {
  const estudioHasta = ahora + estudioMs;
  return {
    empiezaEn: estudioHasta,
    terminaEn: estudioHasta + Math.round(segundos * 1000),
    estudioHasta,
  };
}

/** ¿Llega dentro de la ventana, con la gracia aplicada? */
export function dentroDeVentana(
  ventanaActual: Pick<Ventana, 'empiezaEn' | 'terminaEn'>,
  llegada: number,
  graciaMs = GRACIA_RESPUESTA_MS,
): boolean {
  return llegada <= ventanaActual.terminaEn + graciaMs;
}

/**
 * Tiempo de respuesta que se usa para puntuar. Se acota a la ventana: responder antes de
 * que arranque cuenta como 0 y llegar en el margen de gracia cuenta como el límite.
 */
export function tiempoDeRespuesta(
  ventanaActual: Pick<Ventana, 'empiezaEn' | 'terminaEn'>,
  llegada: number,
): number {
  const bruto = llegada - ventanaActual.empiezaEn;
  const maximo = ventanaActual.terminaEn - ventanaActual.empiezaEn;
  return Math.max(0, Math.min(bruto, maximo));
}

/** Milisegundos que quedan, nunca negativos. Para pintar barras. */
export function restante(hasta: number, ahora: number): number {
  return Math.max(0, hasta - ahora);
}

/**
 * Estado de presencia derivado de la última señal de vida. Es una función pura del reloj:
 * no hay temporizadores por jugador, se calcula al leer.
 */
export function presenciaPorUltimaSenal(
  ultimaSenal: number,
  ahora: number,
): 'ACTIVE' | 'RECONNECTING' | 'AWAY' {
  const silencio = ahora - ultimaSenal;
  if (silencio >= UMBRAL_AUSENTE_MS) return 'AWAY';
  if (silencio >= UMBRAL_RECONECTANDO_MS) return 'RECONNECTING';
  return 'ACTIVE';
}
