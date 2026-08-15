/**
 * RACHA DIARIA — y por qué esta no castiga.
 *
 * La racha es el mecanismo de retención más eficaz y también el más fácil de convertir en
 * algo desagradable. Aquí se diseña con tres reglas:
 *
 *   1. **Cuenta la actividad, no la visita.** Abrir la app no es nada. Cuenta el reto
 *      diario, una partida de verdad (con su mínimo de preguntas y de duración) o un
 *      desafío completado. Si abrir contara, la racha mediría lealtad a la notificación,
 *      no al juego.
 *   2. **Se pierde despacio.** Hay SEGURO DE DERRAMA: cubre un día perdido de forma
 *      automática, sin pedir nada ni vender nada. Se consiguen jugando.
 *   3. **Y si se pierde, se puede recuperar.** Romper una racha de treinta días y volver a
 *      cero es la mejor forma de que alguien no vuelva. Hay misión de recuperación: unos
 *      días para completar unos objetivos y te devuelven la racha.
 *
 * El día es el día LOCAL del usuario (§71): quien juega a las 00:30 en Madrid no debe
 * perder la racha porque en UTC ya fuera otro día.
 */

export type DiaLocal = string; // 'YYYY-MM-DD'

/** Día local del usuario a partir de un instante y su zona horaria IANA. */
export function diaLocal(instante: Date, timezone: string): DiaLocal {
  try {
    // `en-CA` da directamente YYYY-MM-DD, que es lo que se quiere guardar.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(instante);
  } catch {
    // Zona horaria inválida (dato viejo o manipulado): se cae a UTC en lugar de reventar.
    return instante.toISOString().slice(0, 10);
  }
}

/** Días entre dos días locales. Trabaja con fechas, no con husos: no hay sorpresas. */
export function diasEntre(desde: DiaLocal, hasta: DiaLocal): number {
  const a = Date.parse(`${desde}T00:00:00Z`);
  const b = Date.parse(`${hasta}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

export type EstadoRacha = {
  actual: number;
  mejor: number;
  ultimoDia: DiaLocal | null;
  seguros: number;
  /** Misión de recuperación abierta, si la hay. */
  recuperacion: {
    hasta: DiaLocal;
    objetivo: number;
    hechos: number;
    /** Racha que se devuelve si se completa. */
    racha: number;
  } | null;
};

export function rachaInicial(): EstadoRacha {
  return { actual: 0, mejor: 0, ultimoDia: null, seguros: 0, recuperacion: null };
}

/** Máximo de seguros que se pueden acumular: no es una moneda que se atesore. */
export const MAX_SEGUROS = 2;

/** Cada cuántos días seguidos se regala un seguro. */
export const SEGURO_CADA = 7;

/** A partir de esta racha, romperla abre una misión de recuperación. */
export const RACHA_RECUPERABLE = 5;

/** Días que se dan para completar la misión de recuperación. */
export const DIAS_RECUPERACION = 3;

/** Actividades que hay que completar para recuperar la racha. */
export const OBJETIVO_RECUPERACION = 3;

export type ResultadoRacha = {
  estado: EstadoRacha;
  /** Qué ha pasado, para poder celebrarlo o contarlo. */
  suceso:
    | 'CONTINUA'
    | 'EMPIEZA'
    | 'YA_CONTABA_HOY'
    | 'SALVADA_POR_SEGURO'
    | 'ROTA'
    | 'RECUPERADA';
  /** Seguros ganados en este paso. */
  segurosGanados: number;
  /** Si se ha alcanzado un hito (7, 14, 30…), cuál. */
  hito: number | null;
};

const HITOS = [3, 7, 14, 30, 60, 100, 365];

/**
 * Registra un día con actividad válida.
 *
 * `hoy` es el día LOCAL del usuario. Se llama solo cuando la actividad ha sido
 * significativa: decidir eso no es cosa de este módulo (lo hace `libro.ts` para las
 * partidas), aquí solo se lleva la cuenta.
 */
export function registrarActividad(estado: EstadoRacha, hoy: DiaLocal): ResultadoRacha {
  // Ya contaba hoy: la racha no sube dos veces por jugar dos veces.
  if (estado.ultimoDia === hoy) {
    const conRecuperacion = avanzarRecuperacion(estado, hoy);
    return {
      estado: conRecuperacion.estado,
      suceso: conRecuperacion.recuperada ? 'RECUPERADA' : 'YA_CONTABA_HOY',
      segurosGanados: 0,
      hito: null,
    };
  }

  // Misión de recuperación en marcha: cada día válido suma a la misión.
  if (estado.recuperacion) {
    const resultado = avanzarRecuperacion(estado, hoy);
    if (resultado.recuperada) {
      return {
        estado: { ...resultado.estado, ultimoDia: hoy },
        suceso: 'RECUPERADA',
        segurosGanados: 0,
        hito: null,
      };
    }
    // Aún no ha completado: la racha nueva va contando igualmente.
    const encadenada = encadenar(resultado.estado, hoy);
    return { ...encadenada, estado: { ...encadenada.estado, recuperacion: resultado.estado.recuperacion } };
  }

  return encadenar(estado, hoy);
}

function encadenar(estado: EstadoRacha, hoy: DiaLocal): ResultadoRacha {
  if (!estado.ultimoDia) {
    const actual = 1;
    return {
      estado: { ...estado, actual, mejor: Math.max(estado.mejor, actual), ultimoDia: hoy },
      suceso: 'EMPIEZA',
      segurosGanados: 0,
      hito: null,
    };
  }

  const hueco = diasEntre(estado.ultimoDia, hoy);

  // Día siguiente: la racha continúa.
  if (hueco === 1) {
    const actual = estado.actual + 1;
    const ganaSeguro = actual % SEGURO_CADA === 0 && estado.seguros < MAX_SEGUROS;
    return {
      estado: {
        ...estado,
        actual,
        mejor: Math.max(estado.mejor, actual),
        ultimoDia: hoy,
        seguros: Math.min(MAX_SEGUROS, estado.seguros + (ganaSeguro ? 1 : 0)),
      },
      suceso: 'CONTINUA',
      segurosGanados: ganaSeguro ? 1 : 0,
      hito: HITOS.includes(actual) ? actual : null,
    };
  }

  // Se saltó exactamente un día y hay seguro: se cubre y la racha sigue.
  if (hueco === 2 && estado.seguros > 0) {
    const actual = estado.actual + 1;
    return {
      estado: {
        ...estado,
        actual,
        mejor: Math.max(estado.mejor, actual),
        ultimoDia: hoy,
        seguros: estado.seguros - 1,
      },
      suceso: 'SALVADA_POR_SEGURO',
      segurosGanados: 0,
      hito: HITOS.includes(actual) ? actual : null,
    };
  }

  // Rota. Si era larga, se abre misión de recuperación en lugar de tirarlo todo.
  const merecePena = estado.actual >= RACHA_RECUPERABLE;
  return {
    estado: {
      ...estado,
      actual: 1,
      mejor: Math.max(estado.mejor, estado.actual),
      ultimoDia: hoy,
      recuperacion: merecePena
        ? {
            hasta: sumarDias(hoy, DIAS_RECUPERACION),
            objetivo: OBJETIVO_RECUPERACION,
            hechos: 1,
            racha: estado.actual,
          }
        : null,
    },
    suceso: 'ROTA',
    segurosGanados: 0,
    hito: null,
  };
}

function avanzarRecuperacion(
  estado: EstadoRacha,
  hoy: DiaLocal,
): { estado: EstadoRacha; recuperada: boolean } {
  const mision = estado.recuperacion;
  if (!mision) return { estado, recuperada: false };

  // Plazo agotado: se cierra la misión sin drama.
  if (diasEntre(hoy, mision.hasta) < 0) {
    return { estado: { ...estado, recuperacion: null }, recuperada: false };
  }

  const hechos = mision.hechos + 1;
  if (hechos >= mision.objetivo) {
    const recuperada = Math.max(estado.actual, mision.racha);
    return {
      estado: {
        ...estado,
        actual: recuperada,
        mejor: Math.max(estado.mejor, recuperada),
        recuperacion: null,
      },
      recuperada: true,
    };
  }

  return { estado: { ...estado, recuperacion: { ...mision, hechos } }, recuperada: false };
}

function sumarDias(dia: DiaLocal, dias: number): DiaLocal {
  const base = Date.parse(`${dia}T00:00:00Z`);
  return new Date(base + dias * 86_400_000).toISOString().slice(0, 10);
}

/**
 * ¿Está la racha en peligro? Sirve para el recordatorio, que solo se manda si el jugador
 * lo ha activado y solo si de verdad hay algo que perder.
 */
export function rachaEnPeligro(estado: EstadoRacha, hoy: DiaLocal): boolean {
  if (estado.actual < 2) return false;
  if (estado.ultimoDia === hoy) return false;
  if (!estado.ultimoDia) return false;
  return diasEntre(estado.ultimoDia, hoy) === 1;
}

/** Texto de la racha para la interfaz. Corto y sin urgencias falsas. */
export function textoRacha(estado: EstadoRacha): string {
  if (estado.actual === 0) return 'Sin racha todavía';
  if (estado.actual === 1) return '🔥 1 día';
  return `🔥 ${estado.actual} días`;
}
