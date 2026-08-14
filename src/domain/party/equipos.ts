/**
 * PUNTUACIÓN POR EQUIPOS — la fórmula, y por qué es esta.
 *
 * ## El problema
 *
 * Si la puntuación de un equipo es la suma de sus jugadores, el equipo con más gente gana
 * siempre. Y en una casa los equipos NUNCA quedan iguales: son «los del sofá» contra «los
 * de la cocina», y en la cocina hay tres.
 *
 * Si en cambio es la MEDIA, un equipo grande sale perjudicado en cuanto uno se despista o
 * se va al baño, y además incentiva quedarse quieto.
 *
 * ## La fórmula
 *
 * Se usa **la media de los K mejores**, con K el tamaño del equipo más pequeño:
 *
 * ```
 *   K = tamaño del equipo más pequeño (mínimo 1)
 *   puntuación(equipo) = media de los K jugadores con más puntos de ese equipo
 * ```
 *
 * Por qué funciona:
 *
 *   · **Es justa con los tamaños**: todos los equipos aportan exactamente K puntuaciones,
 *     así que tener más gente no suma por sí solo.
 *   · **Premia tener buenos jugadores, no tener muchos**: un equipo de cinco con tres
 *     cracks gana a un equipo de dos flojos, que es lo que la gente espera.
 *   · **No castiga al que se despista**: en un equipo grande, el que se va al baño queda
 *     fuera de los K mejores y no arrastra al resto. Esto es lo que hace que funcione en
 *     una fiesta de verdad.
 *   · **Se entiende en una frase**: «cuentan los N mejores de cada equipo, y N es el
 *     tamaño del equipo más pequeño». Se puede decir en voz alta antes de empezar.
 *
 * Contrapartida asumida: en un equipo grande, los jugadores fuera del top K no cambian el
 * resultado de su equipo en esa foto. Se compensa así:
 *
 *   · el marcador INDIVIDUAL se mantiene siempre y se muestra en el móvil y en la
 *     clasificación final, así que nadie juega para nada;
 *   · como K se recalcula en cada foto, cualquiera puede entrar en los K mejores en
 *     cualquier momento; no hay puestos fijos.
 *
 * En modo COMPARTIDO (un móvil = un equipo) esto es un caso degenerado con K = 1: la
 * puntuación del equipo es la del único mando. La fórmula no necesita casos especiales.
 */

export type JugadorParaEquipos = {
  playerId: string;
  teamId: string | null;
  puntos: number;
  /** Los espectadores no cuentan para la puntuación de equipo. */
  cuenta: boolean;
};

export type PuntuacionEquipo = {
  teamId: string;
  /** Puntuación oficial: media de los K mejores. */
  puntos: number;
  /** Cuántos jugadores han entrado en el cálculo. */
  contados: number;
  /** Cuántos hay en total en el equipo. */
  total: number;
  /** Suma bruta, solo informativa (nunca se usa para clasificar). */
  suma: number;
};

/** K = tamaño del equipo más pequeño con al menos un jugador que cuente. */
export function tamanoDeReferencia(jugadores: readonly JugadorParaEquipos[]): number {
  const porEquipo = new Map<string, number>();
  for (const jugador of jugadores) {
    if (!jugador.cuenta || !jugador.teamId) continue;
    porEquipo.set(jugador.teamId, (porEquipo.get(jugador.teamId) ?? 0) + 1);
  }
  if (porEquipo.size === 0) return 1;
  return Math.max(1, Math.min(...porEquipo.values()));
}

/**
 * Puntuación de cada equipo. `equiposConocidos` permite que un equipo sin jugadores
 * aparezca con 0 en lugar de desaparecer de la clasificación.
 */
export function puntuarEquipos(
  jugadores: readonly JugadorParaEquipos[],
  equiposConocidos: readonly string[] = [],
): PuntuacionEquipo[] {
  const k = tamanoDeReferencia(jugadores);

  const porEquipo = new Map<string, JugadorParaEquipos[]>();
  for (const teamId of equiposConocidos) porEquipo.set(teamId, []);
  for (const jugador of jugadores) {
    if (!jugador.cuenta || !jugador.teamId) continue;
    const lista = porEquipo.get(jugador.teamId);
    if (lista) lista.push(jugador);
    else porEquipo.set(jugador.teamId, [jugador]);
  }

  const resultado: PuntuacionEquipo[] = [];
  for (const [teamId, miembros] of porEquipo) {
    const ordenados = [...miembros].sort((a, b) => b.puntos - a.puntos);
    const mejores = ordenados.slice(0, k);
    const suma = ordenados.reduce((total, jugador) => total + jugador.puntos, 0);
    const puntos =
      mejores.length > 0
        ? Math.round(mejores.reduce((total, jugador) => total + jugador.puntos, 0) / mejores.length)
        : 0;
    resultado.push({ teamId, puntos, contados: mejores.length, total: ordenados.length, suma });
  }

  return resultado.sort((a, b) => b.puntos - a.puntos);
}

/** Frase que se canta en la TV para que nadie discuta la fórmula a mitad de partida. */
export function explicacionFormula(jugadores: readonly JugadorParaEquipos[]): string {
  const k = tamanoDeReferencia(jugadores);
  if (k === 1) return 'Cuenta el mejor de cada equipo: así da igual cuántos seáis.';
  return `Cuentan los ${k} mejores de cada equipo: así da igual cuántos seáis.`;
}

// ── Reparto de equipos ──────────────────────────────────────────────────────────

/**
 * Puertas del portal como nombres de equipo. Son lugares del edificio, nunca personajes:
 * un equipo no se llama «los Cuesta» porque eso sería usar el nombre de un personaje como
 * marca del producto.
 */
export const EQUIPOS_DISPONIBLES = [
  { nombre: '1.º A', color: 'granate' },
  { nombre: '1.º B', color: 'morado' },
  { nombre: '2.º A', color: 'verde' },
  { nombre: '2.º B', color: 'naranja' },
  { nombre: '3.º A', color: 'azul' },
  { nombre: '3.º B', color: 'rojo' },
] as const;

export function equiposParaSala(cuantos: number): { nombre: string; color: string; slot: number }[] {
  const total = Math.max(2, Math.min(cuantos, EQUIPOS_DISPONIBLES.length));
  return EQUIPOS_DISPONIBLES.slice(0, total).map((equipo, indice) => ({
    nombre: equipo.nombre,
    color: equipo.color,
    slot: indice,
  }));
}

/**
 * Reparto automático equilibrado: se ordena por puntos (o por orden de llegada en el
 * lobby) y se reparte en serpiente, que es lo que menos desequilibra.
 */
export function repartoAutomatico(
  jugadores: readonly { playerId: string; puntos: number }[],
  teamIds: readonly string[],
): Record<string, string> {
  if (teamIds.length === 0) return {};
  const ordenados = [...jugadores].sort((a, b) => b.puntos - a.puntos);
  const asignacion: Record<string, string> = {};

  ordenados.forEach((jugador, indice) => {
    const vuelta = Math.floor(indice / teamIds.length);
    const posicion = indice % teamIds.length;
    // Serpiente: la vuelta impar va al revés, para no dar siempre el mejor al mismo equipo.
    const destino = vuelta % 2 === 0 ? posicion : teamIds.length - 1 - posicion;
    const teamId = teamIds[destino];
    if (teamId) asignacion[jugador.playerId] = teamId;
  });

  return asignacion;
}
