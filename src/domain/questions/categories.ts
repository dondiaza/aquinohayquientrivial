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
    label: 'General',
    tagline: 'De todo un poco, como en la junta',
    icon: '🏢',
  },
  {
    id: 'personajes',
    label: 'Personajes',
    tagline: 'Quién es quién en el portal',
    icon: '🧑‍🤝‍🧑',
  },
  {
    id: 'lugares',
    label: 'Lugares',
    tagline: 'Portal, azotea, cuarto de contadores',
    icon: '🚪',
  },
  {
    id: 'situaciones',
    label: 'Situaciones',
    tagline: 'Derramas, obras y malentendidos',
    icon: '🧯',
  },
  {
    id: 'tramas',
    label: 'Tramas',
    tagline: 'Líos que duran varios capítulos',
    icon: '🧵',
  },
  {
    id: 'temporadas',
    label: 'Temporadas',
    tagline: 'Qué pasó y cuándo',
    icon: '📅',
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
