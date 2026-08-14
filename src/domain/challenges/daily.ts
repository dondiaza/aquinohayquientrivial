/**
 * RETO DEL DÍA y DESAFÍOS CON SEMILLA.
 *
 * · RETO DEL DÍA: todo el mundo juega exactamente la misma partida durante el mismo día.
 *   La configuración se DERIVA del día (`YYYY-MM-DD`), así que no hace falta guardar
 *   nada en el servidor ni coordinar a nadie: dos navegadores distintos, en cualquier
 *   sitio, generan la misma secuencia. No requiere cuenta.
 *
 * · DESAFÍO: una etiqueta legible tipo «#21DESENGAÑO» que ES la semilla. Al ser
 *   reversible, se puede compartir por mensaje y jugar la misma partida en diferido.
 *   Esto es la base de las competiciones asíncronas y, en Fase 3, de las salas.
 */

import { createRng } from '../rng';
import { CATEGORY_IDS, CATEGORY_MIX, type CategorySelection } from '../questions/categories';
import { DIFFICULTY_LEVEL_IDS, type DifficultyLevelId } from '../difficulty/levels';
import type { GameFormatId } from '../rounds/formats';

/** Zona horaria de referencia: el reto cambia a medianoche en España. */
export const ZONA_RETO = 'Europe/Madrid';

/** Clave del día en formato YYYY-MM-DD según la zona de referencia. */
export function claveDelDia(fecha: Date, zona: string = ZONA_RETO): string {
  const formateador = new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formateador.format(fecha);
}

export type ConfiguracionReto = {
  dailyKey: string;
  formatId: GameFormatId;
  difficultyId: DifficultyLevelId;
  category: CategorySelection;
  seed: string;
  seedLabel: string;
  /** Texto de presentación del reto. */
  titular: string;
};

const TITULARES = [
  'El reto de hoy viene con la escoba en la mano.',
  'Hoy Radio Patio ha madrugado.',
  'La administradora ha dejado esto en el buzón de todos.',
  'Junta relámpago: mismas preguntas para todo el portal.',
  'Hoy el ascensor funciona. Aprovecha.',
  'El portero ha elegido las preguntas. Suerte.',
];

/**
 * Configuración determinista del reto de un día.
 *
 * El formato es siempre EXPRESS: el reto diario es una cita corta, comparable y que
 * apetece repetir. Lo que rota es la dificultad, la temática y, por supuesto, la semilla.
 */
export function configuracionDelReto(dailyKey: string): ConfiguracionReto {
  const rng = createRng(`reto:${dailyKey}`);
  const dificultades: DifficultyLevelId[] = ['vecino', 'presidente', 'radio-patio'];
  const categorias: CategorySelection[] = [CATEGORY_MIX, ...CATEGORY_IDS];

  const difficultyId =
    dificultades[rng.int(0, dificultades.length - 1)] ??
    (DIFFICULTY_LEVEL_IDS[1] as DifficultyLevelId);
  const category = categorias[rng.int(0, categorias.length - 1)] ?? CATEGORY_MIX;
  const titular = TITULARES[rng.int(0, TITULARES.length - 1)] ?? TITULARES[0]!;

  return {
    dailyKey,
    formatId: 'express',
    difficultyId,
    category,
    seed: `reto:${dailyKey}`,
    seedLabel: etiquetaDeSemilla(`reto:${dailyKey}`),
    titular,
  };
}

// ── Desafíos con etiqueta ────────────────────────────────────────────────────

const PALABRAS_DESAFIO = [
  'DESENGANO',
  'PORTALON',
  'DERRAMA',
  'GOTELE',
  'FELPUDO',
  'BUZONES',
  'AZOTEA',
  'CONTADORES',
  'TRASTERO',
  'RELLANO',
  'ASCENSOR',
  'TELEFONILLO',
  'PATIO',
  'JUNTA',
  'ACTA',
] as const;

/**
 * Normaliza una etiqueta escrita por una persona a una semilla canónica.
 * «#21 desengaño» → «21DESENGANO».
 */
export function normalizarEtiqueta(entrada: string): string {
  return entrada
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 24);
}

/** Etiqueta legible y estable a partir de cualquier semilla. */
export function etiquetaDeSemilla(seed: string): string {
  const rng = createRng(`etiqueta:${seed}`);
  const numero = rng.int(1, 99);
  const palabra = PALABRAS_DESAFIO[rng.int(0, PALABRAS_DESAFIO.length - 1)] ?? PALABRAS_DESAFIO[0];
  return `#${numero}${palabra}`;
}

/** Genera una etiqueta nueva para compartir. Determinista dada la semilla de origen. */
export function nuevaEtiquetaDesafio(semillaDeOrigen: string): string {
  return etiquetaDeSemilla(semillaDeOrigen);
}

/**
 * Configuración de un desafío a partir de su etiqueta. La etiqueta ES la semilla, así
 * que dos personas con la misma etiqueta juegan exactamente la misma partida.
 */
export function configuracionDelDesafio(etiqueta: string): {
  seed: string;
  seedLabel: string;
  formatId: GameFormatId;
  difficultyId: DifficultyLevelId;
  category: CategorySelection;
} | null {
  const canonica = normalizarEtiqueta(etiqueta);
  if (canonica.length < 3) return null;

  const rng = createRng(`desafio:${canonica}`);
  const dificultades: DifficultyLevelId[] = ['vecino', 'presidente', 'radio-patio', 'superfan'];
  const categorias: CategorySelection[] = [CATEGORY_MIX, CATEGORY_MIX, ...CATEGORY_IDS];

  return {
    seed: `desafio:${canonica}`,
    seedLabel: `#${canonica}`,
    formatId: 'normal',
    difficultyId: dificultades[rng.int(0, dificultades.length - 1)] ?? 'vecino',
    category: categorias[rng.int(0, categorias.length - 1)] ?? CATEGORY_MIX,
  };
}
