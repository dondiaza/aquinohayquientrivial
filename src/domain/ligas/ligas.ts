/**
 * LIGAS — competición por temporadas, en grupos pequeños.
 *
 * ## Por qué grupos pequeños
 *
 * Competir contra «el mundo» no motiva a nadie que no sea de los cien primeros. Compitiendo
 * contra veinte personas de tu nivel, el ascenso está siempre a un par de partidas, y eso es
 * lo que hace que merezca la pena jugar una más.
 *
 * ## Los puntos de liga NO son XP
 *
 * El XP mide **tiempo jugado**; los puntos de liga miden **cómo lo has hecho esta semana**.
 * Si fueran lo mismo, ganaría siempre quien más horas eche, que es justo lo que hay que
 * evitar (§28). Por eso:
 *
 *   · los puntos salen de la PRECISIÓN y la DIFICULTAD, no del número de partidas;
 *   · hay tope diario, así que catorce horas seguidas no compran la primera posición;
 *   · una partida que no cumple los mínimos no puntúa, igual que con el XP.
 *
 * ## Ascensos y descensos
 *
 * Suben los primeros, bajan los últimos, el resto se queda. Y quien no ha jugado NADA no
 * desciende: bajar de liga por estar de vacaciones es un castigo por vivir.
 */

export const LIGAS = [
  { id: 'portal', nombre: 'Portal', icon: '🚪', orden: 0 },
  { id: 'bronce', nombre: 'Bronce', icon: '🥉', orden: 1 },
  { id: 'plata', nombre: 'Plata', icon: '🥈', orden: 2 },
  { id: 'oro', nombre: 'Oro', icon: '🥇', orden: 3 },
  { id: 'presidencia', nombre: 'Presidencia', icon: '🏛️', orden: 4 },
  { id: 'radio-patio', nombre: 'Radio Patio', icon: '📡', orden: 5 },
] as const;

export type LigaId = (typeof LIGAS)[number]['id'];

export function ligaPorId(id: string): (typeof LIGAS)[number] {
  return LIGAS.find((liga) => liga.id === id) ?? LIGAS[0];
}

export function ligaSiguiente(id: string): (typeof LIGAS)[number] | null {
  const actual = ligaPorId(id);
  return LIGAS.find((liga) => liga.orden === actual.orden + 1) ?? null;
}

export function ligaAnterior(id: string): (typeof LIGAS)[number] | null {
  const actual = ligaPorId(id);
  return LIGAS.find((liga) => liga.orden === actual.orden - 1) ?? null;
}

/** Tamaño objetivo de un grupo. Suficiente para que haya carrera, poco para reconocer nombres. */
export const TAMANO_GRUPO = 20;

/** Cuántos suben y cuántos bajan de cada grupo. */
export const ASCIENDEN = 5;
export const DESCIENDEN = 5;

/** Tope de puntos de liga que se pueden sacar en un día. */
export const TOPE_DIARIO_LIGA = 300;

export type PartidaParaLiga = {
  /** 0..1 */
  precision: number;
  /** Escala interna 1-10. */
  dificultadMedia: number;
  /** Respuestas efectivamente enviadas. */
  respuestas: number;
  segundos: number;
  /** ¿Ha ganado, si era una sala con más gente? */
  gano: boolean;
  /** ¿Era el reto diario? */
  esRetoDiario: boolean;
};

/** Mínimos para que una partida puntúe en liga. Los mismos que para el XP. */
export const MINIMOS_LIGA = { respuestas: 5, segundos: 45 } as const;

/**
 * Puntos de liga de una partida.
 *
 * La fórmula, en una frase: **la precisión manda, la dificultad multiplica y el volumen no
 * cuenta**. Una partida impecable en difícil vale más que tres mediocres en fácil.
 */
export function puntosDeLiga(partida: PartidaParaLiga): number {
  if (partida.respuestas < MINIMOS_LIGA.respuestas) return 0;
  if (partida.segundos < MINIMOS_LIGA.segundos) return 0;

  const precision = Math.max(0, Math.min(1, partida.precision));

  // Por debajo del 50 % de acierto no se puntúa: la liga mide acertar, no participar.
  if (precision < 0.5) return 0;

  // 0.5 → 0 puntos; 1.0 → 100 puntos. Curva lineal sobre la mitad alta.
  const base = Math.round((precision - 0.5) * 2 * 100);

  // La dificultad multiplica entre 0,8 y 1,4.
  const dificultad = 0.8 + Math.max(0, Math.min(10, partida.dificultadMedia)) * 0.06;

  const extra = (partida.gano ? 25 : 0) + (partida.esRetoDiario ? 30 : 0);

  return Math.max(0, Math.round(base * dificultad) + extra);
}

/** Aplica el tope diario. Devuelve lo que de verdad se suma. */
export function conTopeDiario(puntos: number, yaHoy: number): { suma: number; recortado: number } {
  const margen = Math.max(0, TOPE_DIARIO_LIGA - yaHoy);
  const suma = Math.min(puntos, margen);
  return { suma, recortado: puntos - suma };
}

export type ParticipanteLiga = {
  userId: string;
  puntos: number;
  /** Para desempatar: quien ha jugado menos partidas con los mismos puntos, primero. */
  partidas: number;
};

export type ResultadoCierre = {
  userId: string;
  posicion: number;
  resultado: 'ASCIENDE' | 'MANTIENE' | 'DESCIENDE';
  ligaNueva: string;
};

/**
 * Cierra un grupo: ordena, decide quién sube y quién baja.
 *
 * Quien tiene 0 puntos **no desciende**: no ha competido, así que no ha perdido. Descender a
 * alguien por no haber jugado es castigarle por tener vida.
 */
export function cerrarGrupo(
  liga: string,
  participantes: readonly ParticipanteLiga[],
): ResultadoCierre[] {
  const ordenados = [...participantes].sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    if (a.partidas !== b.partidas) return a.partidas - b.partidas;
    return a.userId.localeCompare(b.userId);
  });

  const arriba = ligaSiguiente(liga);
  const abajo = ligaAnterior(liga);
  const total = ordenados.length;

  return ordenados.map((participante, indice) => {
    const posicion = indice + 1;

    if (posicion <= ASCIENDEN && arriba) {
      return { userId: participante.userId, posicion, resultado: 'ASCIENDE', ligaNueva: arriba.id };
    }

    const enZonaDeDescenso = posicion > total - DESCIENDEN;
    // Sin puntos no se desciende: no ha competido.
    if (enZonaDeDescenso && abajo && participante.puntos > 0) {
      return { userId: participante.userId, posicion, resultado: 'DESCIENDE', ligaNueva: abajo.id };
    }

    return { userId: participante.userId, posicion, resultado: 'MANTIENE', ligaNueva: liga };
  });
}

/**
 * Reparte gente en grupos del tamaño objetivo, emparejando por habilidad para que la carrera
 * tenga sentido. Se reparte en serpiente, igual que los equipos.
 */
export function repartirEnGrupos(
  jugadores: readonly { userId: string; skillRating: number }[],
): string[][] {
  if (jugadores.length === 0) return [];

  const ordenados = [...jugadores].sort((a, b) => b.skillRating - a.skillRating);
  const cuantosGrupos = Math.max(1, Math.ceil(ordenados.length / TAMANO_GRUPO));
  const grupos: string[][] = Array.from({ length: cuantosGrupos }, () => []);

  ordenados.forEach((jugador, indice) => {
    const vuelta = Math.floor(indice / cuantosGrupos);
    const posicion = indice % cuantosGrupos;
    const destino = vuelta % 2 === 0 ? posicion : cuantosGrupos - 1 - posicion;
    grupos[destino]?.push(jugador.userId);
  });

  return grupos;
}

// ── Habilidad (separada del XP) ─────────────────────────────────────────────────

/** Rating inicial. Se mueve despacio: una mala tarde no debe hundir a nadie. */
export const RATING_INICIAL = 1000;
const K_INICIAL = 48;
const K_ESTABLE = 20;
const PARTIDAS_PARA_ESTABILIZAR = 15;

/**
 * Actualiza la habilidad estimada tras una partida.
 *
 * Se usa un Elo simplificado contra un «rival» que es la dificultad de lo jugado: no hace
 * falta que haya oponente, porque en solitario también se demuestra nivel. El resultado es
 * la precisión, no ganar o perder.
 */
export function actualizarSkill(
  actual: number,
  partidas: number,
  partida: { precision: number; dificultadMedia: number },
): number {
  const k = partidas < PARTIDAS_PARA_ESTABILIZAR ? K_INICIAL : K_ESTABLE;

  // La dificultad se traduce a un rating de referencia: 1 → 700, 10 → 1600.
  const referencia = 700 + Math.max(0, Math.min(10, partida.dificultadMedia)) * 100;
  const esperado = 1 / (1 + 10 ** ((referencia - actual) / 400));
  const obtenido = Math.max(0, Math.min(1, partida.precision));

  return Math.max(100, Math.round(actual + k * (obtenido - esperado)));
}
