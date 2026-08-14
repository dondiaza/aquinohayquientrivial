/**
 * CATÁLOGOS DEL PACK: pruebas, modos, rondas y tarjetas.
 *
 * Estos cuatro ficheros son pequeños y se leen desde páginas del servidor, así que se
 * importan como módulos normales. El banco de preguntas (470 KB) NO: ese solo lo
 * necesitan el seed y los tests, y se carga con `fs` desde `banco.ts` para no arrastrarlo
 * al bundle ni al type-check de la app.
 *
 * Qué es cada cosa, según la guía de importación del pack:
 *
 *   · pruebas  → reglas de minijuegos y retos (260). Catálogo de cara al jugador.
 *   · modos    → configuración de producto (48): campañas, eventos, sesiones.
 *   · rondas   → 120 lotes de 10 preguntas. Son material de QA y de «ronda ya montada»;
 *                en juego normal las rondas se generan por filtros.
 *   · tarjetas → 174 microcontenidos. Se usan como cartelas entre rondas y como
 *                colección consultable.
 */

import modosBruto from './data/modos.json';
import pruebasBruto from './data/pruebas.json';
import rondasBruto from './data/rondas.json';
import tarjetasBruto from './data/tarjetas.json';
import { etiquetas, type ModoPack, type PruebaPack, type RondaPack, type TarjetaPack } from './tipos';

// ── Pruebas y retos ─────────────────────────────────────────────────────────────

export type Prueba = {
  id: string;
  nombre: string;
  /** Familia de mecánica: `adivinanza`, `clasificacion`, `memoria`, `reto`… */
  familia: string;
  nivel: string;
  instruccion: string;
  puntuacion: string;
  etiquetas: string[];
  jugadores?: string;
  minutos?: number;
  /** Con qué filtros del banco se alimenta esta prueba. */
  bancoSugerido?: string;
};

export const PRUEBAS: readonly Prueba[] = (pruebasBruto as PruebaPack[]).map((prueba) => ({
  id: prueba.id,
  nombre: prueba.name,
  familia: prueba.kind,
  nivel: prueba.level,
  instruccion: prueba.instruction.replace(/\s+con pistas muy directas\.$/, '.').trim(),
  puntuacion: prueba.scoring,
  etiquetas: etiquetas(prueba.tags),
  ...(prueba.players ? { jugadores: prueba.players } : {}),
  ...(prueba.duration_min ? { minutos: prueba.duration_min } : {}),
  ...(prueba.question_pool_hint ? { bancoSugerido: prueba.question_pool_hint } : {}),
}));

export const FAMILIAS_PRUEBA: readonly string[] = [
  ...new Set(PRUEBAS.map((prueba) => prueba.familia)),
].sort((a, b) => a.localeCompare(b, 'es'));

export const NIVELES_PRUEBA: readonly string[] = ['Fácil', 'Medio', 'Difícil', 'Experto'].filter(
  (nivel) => PRUEBAS.some((prueba) => prueba.nivel === nivel),
);

export function pruebasDeFamilia(familia: string): readonly Prueba[] {
  return PRUEBAS.filter((prueba) => prueba.familia === familia);
}

// ── Modos de juego ──────────────────────────────────────────────────────────────

export type Modo = {
  id: string;
  nombre: string;
  familia: string;
  descripcion: string;
  jugadores: string;
  minutos: number;
  usa: string[];
  recompensa: string;
};

export const MODOS: readonly Modo[] = (modosBruto as ModoPack[]).map((modo) => ({
  id: modo.id,
  nombre: modo.name,
  familia: modo.kind,
  descripcion: modo.description,
  jugadores: modo.recommended_players,
  minutos: modo.session_min,
  usa: modo.uses,
  recompensa: modo.reward_hook,
}));

export const FAMILIAS_MODO: readonly string[] = [
  ...new Set(MODOS.map((modo) => modo.familia)),
].sort((a, b) => a.localeCompare(b, 'es'));

export function modo(id: string): Modo | undefined {
  return MODOS.find((candidato) => candidato.id === id);
}

// ── Rondas preconstruidas ───────────────────────────────────────────────────────

export type Ronda = {
  id: string;
  nombre: string;
  preguntas: string[];
  formato: string;
  curva: number[];
  modoRecomendado: string;
};

export const RONDAS: readonly Ronda[] = (rondasBruto as RondaPack[]).map((ronda) => ({
  id: ronda.id,
  nombre: ronda.name,
  preguntas: ronda.question_ids,
  formato: ronda.format,
  curva: ronda.difficulty_curve,
  modoRecomendado: ronda.recommended_mode,
}));

// ── Tarjetas ────────────────────────────────────────────────────────────────────

export type Tarjeta = {
  id: string;
  anverso: string;
  reverso: string;
  categoria: string;
  dificultad: number;
  nota: string;
  etiquetas: string[];
};

/**
 * Erratas de las tarjetas, en la misma línea que las del banco
 * (`src/content/anhqv/importar.ts`): se corrigen aquí y el JSON del pack se queda como
 * llegó.
 */
const ERRATAS_TARJETA: Record<string, { reverso?: string; nota?: string }> = {
  // «Un poquito de por favor» es de Juan Cuesta, no de Emilio.
  C0102: {
    reverso: 'Juan Cuesta',
    nota: 'Es la muletilla del presidente de la comunidad, interpretado por José Luis Gil.',
  },
};

export const TARJETAS: readonly Tarjeta[] = (tarjetasBruto as TarjetaPack[]).map((tarjeta) => {
  const errata = ERRATAS_TARJETA[tarjeta.id];
  return {
    id: tarjeta.id,
    anverso: tarjeta.front,
    reverso: errata?.reverso ?? tarjeta.back,
    categoria: tarjeta.category,
    dificultad: tarjeta.difficulty,
    nota: errata?.nota ?? tarjeta.note,
    etiquetas: etiquetas(tarjeta.tags),
  };
});

export const CATEGORIAS_TARJETA: readonly string[] = [
  ...new Set(TARJETAS.map((tarjeta) => tarjeta.categoria)),
].sort((a, b) => a.localeCompare(b, 'es'));

/**
 * Tarjetas para las cartelas entre rondas. Determinista a partir de la semilla de la
 * partida: dos personas con el mismo desafío ven las mismas curiosidades.
 */
export function tarjetasParaCartelas(semilla: string, cuantas: number): readonly Tarjeta[] {
  let acumulado = 0;
  for (let indice = 0; indice < semilla.length; indice += 1) {
    acumulado = (acumulado * 31 + semilla.charCodeAt(indice)) % 100000;
  }
  const inicio = TARJETAS.length ? acumulado % TARJETAS.length : 0;
  return Array.from({ length: Math.min(cuantas, TARJETAS.length) }, (_, paso) => {
    const tarjeta = TARJETAS[(inicio + paso * 7) % TARJETAS.length];
    return tarjeta as Tarjeta;
  });
}

export const RESUMEN_PACK = {
  preguntas: 958,
  pruebas: PRUEBAS.length,
  modos: MODOS.length,
  rondas: RONDAS.length,
  tarjetas: TARJETAS.length,
} as const;
