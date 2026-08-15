/**
 * MOTOR DE NOTIFICACIONES.
 *
 * Nada dispara una notificación directamente. Todo pasa por aquí, y aquí se decide, en este
 * orden y sin saltarse un paso:
 *
 *   suceso → regla → preferencia del usuario → tope de frecuencia → horario silencioso →
 *   canal → entrega → analítica
 *
 * ## La regla que manda
 *
 * **El buzón dentro de la app SIEMPRE se escribe.** Lo que se filtra es el push y el correo.
 * Así, un jugador que ha apagado todas las notificaciones no se pierde nada: lo tiene todo
 * al entrar. Esto es lo que hace que el producto no dependa del push (§91) y, de paso, quita
 * la tentación de insistir por push «porque si no no se entera».
 *
 * ## Lo que NO se hace
 *
 * · no se manda push por cada cambio pequeño (§42: solo hitos que signifiquen algo);
 * · no se repite un recordatorio idéntico;
 * · si alguien lleva días sin jugar, la frecuencia BAJA sola y acaba parándose (§43);
 * · el push nunca se pide al entrar, sino después de una acción que le dé sentido (§34).
 *
 * Todo esto son funciones puras: se les pasa el estado y devuelven una decisión. La entrega
 * de verdad la hace el servicio, que es quien habla con la base de datos y con Web Push.
 */

import type { CanalNotificacion } from './catalogo';
import { CATEGORIA_DE_TIPO, REGLAS, type TipoNotificacion } from './catalogo';

export type PreferenciasUsuario = {
  /** Preferencia por categoría y canal. Si falta, se usa el valor por defecto de la regla. */
  activa: (categoria: string, canal: CanalNotificacion) => boolean | undefined;
  silencioActivo: boolean;
  /** Minutos desde medianoche, en hora local. */
  silencioDesde: number;
  silencioHasta: number;
  timezone: string;
};

export type HistorialEnvios = {
  /** Cuántos push de «enganche» se han mandado hoy. */
  pushEngancheHoy: number;
  /** Cuántos en los últimos siete días. */
  pushEngancheSemana: number;
  /** Cuándo se mandó por última vez este mismo tipo, en epoch ms. */
  ultimoDeEsteTipo: number | null;
  /** Días seguidos sin actividad del jugador. */
  diasInactivo: number;
};

export type Decision = {
  /** El buzón se escribe prácticamente siempre: es el registro. */
  inApp: boolean;
  push: boolean;
  email: boolean;
  /** Por qué se ha descartado cada canal, para poder responder «¿por qué no me llegó?». */
  motivos: Partial<Record<CanalNotificacion, string>>;
};

/** Tope de push de enganche. Los sociales de verdad van aparte y no cuentan aquí. */
export const TOPES_PUSH = {
  engancheDia: 2,
  engancheSemana: 6,
  /** No repetir el mismo tipo antes de esto. */
  mismoTipoMs: 20 * 60 * 60 * 1000,
} as const;

/** A partir de estos días sin jugar, se reduce; y a partir del segundo umbral, se para. */
export const INACTIVIDAD = {
  reducirDesde: 7,
  pararDesde: 21,
} as const;

/** Minutos locales de un instante en una zona horaria. */
export function minutosLocales(instante: Date, timezone: string): number {
  try {
    const formato = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const partes = formato.format(instante).split(':');
    const horas = Number.parseInt(partes[0] ?? '0', 10);
    const minutos = Number.parseInt(partes[1] ?? '0', 10);
    return horas * 60 + minutos;
  } catch {
    return instante.getUTCHours() * 60 + instante.getUTCMinutes();
  }
}

/**
 * ¿Estamos en horario silencioso? Contempla el caso normal (23:00 → 09:00), que cruza la
 * medianoche y por eso no se puede comparar con un simple `>=` y `<=`.
 */
export function enSilencio(
  ahora: Date,
  preferencias: Pick<PreferenciasUsuario, 'silencioActivo' | 'silencioDesde' | 'silencioHasta' | 'timezone'>,
): boolean {
  if (!preferencias.silencioActivo) return false;
  const minutos = minutosLocales(ahora, preferencias.timezone);
  const { silencioDesde: desde, silencioHasta: hasta } = preferencias;
  if (desde === hasta) return false;
  return desde < hasta ? minutos >= desde && minutos < hasta : minutos >= desde || minutos < hasta;
}

/**
 * Decide por qué canales sale una notificación.
 *
 * `ahora` entra como parámetro (nada de `new Date()` dentro): así se puede probar el
 * horario silencioso sin tocar el reloj del sistema.
 */
export function decidirCanales(
  tipo: TipoNotificacion,
  preferencias: PreferenciasUsuario,
  historial: HistorialEnvios,
  ahora: Date,
): Decision {
  const regla = REGLAS[tipo];
  const categoria = CATEGORIA_DE_TIPO[tipo];
  const motivos: Decision['motivos'] = {};

  // ── Buzón: siempre, salvo que la regla diga explícitamente que no ──
  const inApp = regla.canales.includes('IN_APP');

  // ── Push ──
  let push = regla.canales.includes('PUSH');

  if (push) {
    const preferido = preferencias.activa(categoria, 'PUSH');
    if (preferido === false) {
      push = false;
      motivos.PUSH = 'PREFERENCIA';
    }
  }

  if (push && regla.esEnganche) {
    if (historial.diasInactivo >= INACTIVIDAD.pararDesde) {
      push = false;
      motivos.PUSH = 'INACTIVO';
    } else if (
      historial.diasInactivo >= INACTIVIDAD.reducirDesde &&
      historial.pushEngancheSemana >= 1
    ) {
      // Ya se le ha escrito esta semana y no vuelve: no se insiste más.
      push = false;
      motivos.PUSH = 'INACTIVO_REDUCIDO';
    } else if (historial.pushEngancheHoy >= TOPES_PUSH.engancheDia) {
      push = false;
      motivos.PUSH = 'TOPE_DIARIO';
    } else if (historial.pushEngancheSemana >= TOPES_PUSH.engancheSemana) {
      push = false;
      motivos.PUSH = 'TOPE_SEMANAL';
    }
  }

  if (push && historial.ultimoDeEsteTipo !== null) {
    if (ahora.getTime() - historial.ultimoDeEsteTipo < TOPES_PUSH.mismoTipoMs) {
      push = false;
      motivos.PUSH = 'REPETIDO';
    }
  }

  // El horario silencioso se aplica al final: una invitación en tiempo real puede saltárselo
  // SOLO si la regla lo declara y el jugador lo ha permitido activando esa categoría.
  if (push && enSilencio(ahora, preferencias) && !regla.ignoraSilencio) {
    push = false;
    motivos.PUSH = 'SILENCIO';
  }

  // ── Correo ──
  let email = regla.canales.includes('EMAIL');
  if (email && preferencias.activa(categoria, 'EMAIL') === false) {
    email = false;
    motivos.EMAIL = 'PREFERENCIA';
  }

  return { inApp, push, email, motivos };
}

/**
 * Ventana buena para un recordatorio. Si se sabe a qué hora suele jugar, se apunta a un
 * rato antes; si no, a una hora razonable. Nunca de madrugada.
 */
export function momentoParaRecordatorio(
  horaHabitualMinutos: number | null,
  preferencias: Pick<PreferenciasUsuario, 'silencioDesde' | 'silencioHasta' | 'silencioActivo'>,
): number {
  const propuesta = horaHabitualMinutos !== null ? Math.max(0, horaHabitualMinutos - 30) : 19 * 60;
  if (!preferencias.silencioActivo) return propuesta;

  const { silencioDesde: desde, silencioHasta: hasta } = preferencias;
  const dentro =
    desde < hasta ? propuesta >= desde && propuesta < hasta : propuesta >= desde || propuesta < hasta;

  // Si cae en horario silencioso, se corre al final del silencio.
  return dentro ? hasta : propuesta;
}
