/**
 * Forma de los ficheros del pack editorial (`src/content/anhqv/data/*.json`).
 *
 * Son datos de terceros: se declaran laxos (lo que el JSON trae de verdad, incluidos
 * los campos que faltan en las entradas antiguas) y se normalizan en `importar.ts`.
 * Nada de este módulo entra al dominio sin pasar por Zod.
 */

/** Las 14 familias de pregunta del pack. */
export const TIPOS_PACK = [
  'opcion_multiple',
  'verdadero_falso',
  'respuesta_corta',
  'pistas_progresivas',
  'emparejar',
  'intruso',
  'clasificacion',
  'ordenar',
  'inferencia',
  'doble_pista',
  'comparacion',
  'seleccion_multiple',
  'cadena_relacional',
  'ficha_rapida',
] as const;

export type TipoPack = (typeof TIPOS_PACK)[number];

export type PreguntaPack = {
  id: string;
  type: string;
  question: string;
  answer: string;
  /** 1..5 en la escala del pack. */
  difficulty: number;
  category: string;
  explanation: string;
  /** Las entradas legacy (Q0001-Q0358) traen una cadena separada por comas. */
  tags: string | string[];
  options: string[];
  spoiler?: string;
  confidence?: string;
  source_hint?: string;
};

export type PruebaPack = {
  id: string;
  name: string;
  kind: string;
  level: string;
  instruction: string;
  scoring: string;
  tags: string | string[];
  players?: string;
  duration_min?: number;
  question_pool_hint?: string;
  source_hint?: string;
};

export type ModoPack = {
  id: string;
  name: string;
  kind: string;
  description: string;
  recommended_players: string;
  session_min: number;
  uses: string[];
  reward_hook: string;
  tags: string[];
};

export type RondaPack = {
  id: string;
  name: string;
  question_ids: string[];
  format: string;
  difficulty_curve: number[];
  recommended_mode: string;
};

export type TarjetaPack = {
  id: string;
  front: string;
  back: string;
  category: string;
  difficulty: number;
  note: string;
  tags: string | string[];
};

/** Las etiquetas llegan como array o como cadena con comas: siempre array. */
export function etiquetas(valor: string | string[] | undefined): string[] {
  if (!valor) return [];
  const bruto = Array.isArray(valor) ? valor : valor.split(',');
  const limpias = bruto
    .map((etiqueta) => etiqueta.trim().toLowerCase())
    .filter((etiqueta) => etiqueta.length > 0 && etiqueta.length <= 40);
  return [...new Set(limpias)];
}
