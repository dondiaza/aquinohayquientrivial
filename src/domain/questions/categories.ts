/**
 * Catálogo de categorías temáticas.
 *
 * Vive en código (y no como enum de base de datos) porque el enunciado pide que
 * añadir una categoría sea trivial: basta con añadir una entrada aquí. La columna
 * `Question.category` es un String validado contra este catálogo en el boundary.
 */

export const QUESTION_CATEGORIES = [
  {
    id: 'general',
    label: 'La serie',
    tagline: 'Antena 3, 2003-2006 y Desengaño 21',
    icon: '📺',
  },
  {
    id: 'personajes',
    label: 'Personajes',
    tagline: 'Quién es quién en Desengaño 21',
    icon: '🧑‍🤝‍🧑',
  },
  {
    id: 'reparto',
    label: 'Reparto',
    tagline: 'Qué actor puso la cara a cada vecino',
    icon: '🎭',
  },
  {
    id: 'lugares',
    label: 'Lugares',
    tagline: 'Pisos, portería, videoclub y ático',
    icon: '🚪',
  },
  {
    id: 'relaciones',
    label: 'Relaciones',
    tagline: 'Parejas, familias y quién no se habla con quién',
    icon: '💍',
  },
  {
    id: 'tramas',
    label: 'Tramas',
    tagline: 'Líos que duran varios capítulos',
    icon: '🧵',
  },
  {
    id: 'temporadas',
    label: 'Cronología',
    tagline: 'Qué pasó y en qué temporada',
    icon: '📅',
  },
  {
    id: 'situaciones',
    label: 'Situaciones',
    tagline: 'Derramas, juntas, obras y malentendidos',
    icon: '🧯',
  },
  {
    id: 'frases',
    label: 'Frases',
    tagline: 'Un poquito de por favor',
    icon: '💬',
  },
  {
    id: 'produccion',
    label: 'Producción',
    tagline: 'Quién estaba detrás de la cámara',
    icon: '🎬',
  },
  {
    id: 'audiencias',
    label: 'Audiencias',
    tagline: 'Cuota, espectadores y récords',
    icon: '📈',
  },
  {
    id: 'curiosidades',
    label: 'Curiosidades',
    tagline: 'PUF, Campanadas y detalles menores',
    icon: '🔎',
  },
  {
    id: 'ecosistema',
    label: 'Ecosistema',
    tagline: 'Campanadas, especiales y lo que vino después',
    icon: '🎉',
  },
  {
    id: 'adaptaciones',
    label: 'Adaptaciones',
    tagline: 'El portal en otros países',
    icon: '🌍',
  },
] as const;

export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];
export type CategoryId = QuestionCategory['id'];

export const CATEGORY_IDS = QUESTION_CATEGORIES.map((category) => category.id) as [CategoryId, ...CategoryId[]];

/** Opción de setup que NO filtra por categoría. No es una categoría del banco. */
export const CATEGORY_MIX = 'mezcla' as const;
export type CategorySelection = CategoryId | typeof CATEGORY_MIX;

export const CATEGORY_SELECTIONS = [...CATEGORY_IDS, CATEGORY_MIX] as [
  CategorySelection,
  ...CategorySelection[],
];

export function getCategory(id: string): QuestionCategory | undefined {
  return QUESTION_CATEGORIES.find((category) => category.id === id);
}

export function categoryLabel(id: string): string {
  if (id === CATEGORY_MIX) return 'Mezcla total';
  return getCategory(id)?.label ?? id;
}

export function isCategoryId(value: string): value is CategoryId {
  return QUESTION_CATEGORIES.some((category) => category.id === value);
}
