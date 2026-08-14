/**
 * PROGRESIÓN — ligera a propósito. No es un RPG: es una escalera de vecindad.
 *
 * La experiencia premia TERMINAR partidas, la PRECISIÓN, la DIFICULTAD y la VARIEDAD.
 * No premia repetir la partida más corta en el nivel más fácil: eso es lo que evita el
 * farmeo (una partida express perfecta en «novato» da muy poco).
 */

export const RANGOS = [
  { id: 'visitante', label: 'Visitante', xp: 0, icon: '🔔', linea: 'Has llamado al telefonillo.' },
  { id: 'inquilino', label: 'Inquilino', xp: 600, icon: '🗝️', linea: 'Ya tienes llave del portal.' },
  { id: 'propietario', label: 'Propietario', xp: 1800, icon: '📄', linea: 'Pagas la derrama y opinas.' },
  { id: 'vocal', label: 'Vocal', xp: 4000, icon: '📋', linea: 'Te sientas en la mesa de la junta.' },
  { id: 'presidente', label: 'Presidente', xp: 7500, icon: '🏛️', linea: 'Nadie quería el cargo.' },
  {
    id: 'administrador',
    label: 'Administrador honorífico',
    xp: 12500,
    icon: '🗂️',
    linea: 'Hasta Fincas Tabares te consulta.',
  },
  {
    id: 'leyenda',
    label: 'Leyenda del portal',
    xp: 20000,
    icon: '📡',
    linea: 'Se cuentan cosas de ti que no han pasado.',
  },
] as const;

export type RangoId = (typeof RANGOS)[number]['id'];
export type Rango = (typeof RANGOS)[number];

export const XP = {
  /** Base por terminar una partida. */
  porPartida: 60,
  /** Por respuesta correcta. */
  porAcierto: 12,
  /** Por punto de dificultad media (multiplica el total de aciertos). */
  factorDificultad: 0.06,
  /** Bonus por precisión: se aplica sobre el subtotal. */
  bonusPrecisionMaxima: 0.5,
  /** Bonus por variedad de tipos de prueba distintos jugados. */
  porTipoDistinto: 15,
  /** Bonus por mejor racha. */
  porRacha: 8,
  /** El reto del día paga un poco más: es la cita diaria. */
  factorRetoDiario: 1.25,
} as const;

export type EntradaXp = {
  correctAnswers: number;
  totalQuestions: number;
  accuracyRatio: number;
  averageDifficulty: number;
  bestStreak: number;
  distinctTypes: number;
  /** ¿Se ha terminado la partida (llegó a resultados)? */
  finished: boolean;
  esRetoDiario?: boolean;
};

/** Experiencia de una partida. Función pura y acotada. */
export function xpForGame(entrada: EntradaXp): number {
  if (!entrada.finished || entrada.totalQuestions === 0) return 0;

  const dificultad = 1 + Math.max(0, entrada.averageDifficulty - 5) * XP.factorDificultad;
  const base = XP.porPartida + entrada.correctAnswers * XP.porAcierto * dificultad;
  const precision = 1 + Math.max(0, entrada.accuracyRatio) * XP.bonusPrecisionMaxima;
  const variedad = entrada.distinctTypes * XP.porTipoDistinto;
  const racha = Math.min(10, entrada.bestStreak) * XP.porRacha;

  const total = (base * precision + variedad + racha) * (entrada.esRetoDiario ? XP.factorRetoDiario : 1);
  return Math.round(total);
}

export function rangoParaXp(xp: number): Rango {
  let rango: Rango = RANGOS[0];
  for (const candidato of RANGOS) {
    if (xp >= candidato.xp) rango = candidato;
  }
  return rango;
}

export function rangoPorId(id: string): Rango {
  return RANGOS.find((rango) => rango.id === id) ?? RANGOS[0];
}

export function siguienteRango(xp: number): Rango | undefined {
  return RANGOS.find((rango) => rango.xp > xp);
}

/** Nivel numérico (1..7), útil para desbloquear marcos de avatar. */
export function nivelParaXp(xp: number): number {
  return RANGOS.filter((rango) => xp >= rango.xp).length;
}

/** Progreso hacia el siguiente rango, 0..1. */
export function progresoDeRango(xp: number): number {
  const actual = rangoParaXp(xp);
  const siguiente = siguienteRango(xp);
  if (!siguiente) return 1;
  const recorrido = xp - actual.xp;
  const tramo = siguiente.xp - actual.xp;
  return tramo <= 0 ? 1 : Math.max(0, Math.min(1, Math.round((recorrido / tramo) * 100) / 100));
}
