/**
 * FAMILIAS DEL PACK ANHQV.
 *
 * El pack editorial trae 14 familias de pregunta (`opcion_multiple`, `emparejar`,
 * `doble_pista`, `ficha_rapida`…). El motor de juego solo necesita saber CÓMO se
 * responde —y eso ya lo dice `Question.type`—, pero el jugador sí nota la diferencia
 * entre «empareja» y «elige al intruso»: cambia el rótulo, la instrucción y la manera
 * de presentar el enunciado.
 *
 * Por eso `variant` es metadato de presentación y no un tipo del motor: así el pack
 * conserva sus 14 familias sin duplicar catorce vistas casi idénticas ni tocar la
 * evaluación.
 *
 * `layout` es la única pista que la vista de opciones necesita:
 *
 *   normal  · enunciado y opciones, tal cual
 *   duo     · el enunciado enfrenta dos partes («Juan Cuesta ↔ …»): se parte en dos
 *   pistas  · el enunciado lleva pistas enumeradas: se muestran como fichas
 *   bloques · la respuesta es una casilla de un conjunto cerrado (temporadas)
 *   ficha   · la respuesta es un campo de la ficha de un vecino
 */

export type VariantLayout = 'normal' | 'duo' | 'pistas' | 'bloques' | 'ficha';

export type QuestionVariantMeta = {
  id: string;
  /** Rótulo de cara al jugador. */
  label: string;
  /** Instrucción que sustituye a la genérica del tipo. */
  instruction: string;
  layout: VariantLayout;
  icon: string;
};

export const QUESTION_VARIANTS: Record<string, QuestionVariantMeta> = {
  opcion_multiple: {
    id: 'opcion_multiple',
    label: 'Opción múltiple',
    instruction: 'Elige una respuesta',
    layout: 'normal',
    icon: '🔢',
  },
  verdadero_falso: {
    id: 'verdadero_falso',
    label: 'Verdadero o falso',
    instruction: '¿Verdadero o falso?',
    layout: 'normal',
    icon: '⚖️',
  },
  respuesta_corta: {
    id: 'respuesta_corta',
    label: 'Respuesta corta',
    instruction: 'Escríbelo tú: sin opciones que copiar',
    layout: 'normal',
    icon: '✍️',
  },
  pistas_progresivas: {
    id: 'pistas_progresivas',
    label: 'Pistas progresivas',
    instruction: 'Cada pista que esperas vale menos puntos',
    layout: 'pistas',
    icon: '🕵️',
  },
  emparejar: {
    id: 'emparejar',
    label: 'Empareja',
    instruction: 'Completa la pareja que falta',
    layout: 'duo',
    icon: '🔗',
  },
  intruso: {
    id: 'intruso',
    label: 'El intruso',
    instruction: 'Tres encajan, uno no',
    layout: 'normal',
    icon: '🚨',
  },
  clasificacion: {
    id: 'clasificacion',
    label: 'Clasifica',
    instruction: 'Colócalo en su temporada',
    layout: 'bloques',
    icon: '🗂️',
  },
  ordenar: {
    id: 'ordenar',
    label: 'Ordena',
    instruction: 'De lo primero a lo último',
    layout: 'normal',
    icon: '🔀',
  },
  inferencia: {
    id: 'inferencia',
    label: 'Inferencia',
    instruction: 'Ata los cabos: solo una combinación encaja',
    layout: 'pistas',
    icon: '🧩',
  },
  doble_pista: {
    id: 'doble_pista',
    label: 'Doble pista',
    instruction: 'Dos pistas apuntan a la misma persona',
    layout: 'pistas',
    icon: '🎯',
  },
  comparacion: {
    id: 'comparacion',
    label: 'Comparación',
    instruction: 'Empareja los dos lados',
    layout: 'duo',
    icon: '⚗️',
  },
  seleccion_multiple: {
    id: 'seleccion_multiple',
    label: 'Ficha correcta',
    instruction: 'Solo una ficha está bien rellenada',
    layout: 'ficha',
    icon: '🗃️',
  },
  cadena_relacional: {
    id: 'cadena_relacional',
    label: 'Cadena vecinal',
    instruction: 'Encadena el vínculo que falta',
    layout: 'normal',
    icon: '⛓️',
  },
  ficha_rapida: {
    id: 'ficha_rapida',
    label: 'Ficha relámpago',
    instruction: 'Un dato, sin pensarlo mucho',
    layout: 'ficha',
    icon: '⚡',
  },
  // Familias derivadas de la biblia editorial (no vienen numeradas en el pack).
  memoria_portal: {
    id: 'memoria_portal',
    label: 'Memoria del portal',
    instruction: 'Mira bien: lo que ves ahora te lo preguntan después',
    layout: 'normal',
    icon: '🧠',
  },
  escena_portal: {
    id: 'escena_portal',
    label: 'Escena del portal',
    instruction: 'Mira la escena y di qué NO está',
    layout: 'normal',
    icon: '🔍',
  },
  junta_vecinos: {
    id: 'junta_vecinos',
    label: 'La junta',
    instruction: 'Decide como presidente: hay opciones mejores y peores',
    layout: 'normal',
    icon: '🗳️',
  },
  telefonillo: {
    id: 'telefonillo',
    label: 'Portero automático',
    instruction: 'Repite la secuencia de timbres',
    layout: 'normal',
    icon: '🔔',
  },
};

export const QUESTION_VARIANT_IDS = Object.keys(QUESTION_VARIANTS);

export function variantMeta(id: string | undefined): QuestionVariantMeta | undefined {
  if (!id) return undefined;
  return QUESTION_VARIANTS[id];
}

export function variantLabel(id: string | undefined): string | undefined {
  return variantMeta(id)?.label;
}

/**
 * Parte un enunciado de familia `duo` en sus dos lados.
 * «Empareja correctamente: Juan Cuesta ↔ ¿quién…?» → ['Juan Cuesta', '¿quién…?']
 * Devuelve null si el enunciado no tiene la forma esperada.
 */
export function partirDuo(prompt: string): [string, string] | null {
  const cuerpo = prompt.includes(':') ? prompt.slice(prompt.indexOf(':') + 1) : prompt;
  const partes = cuerpo.split('↔');
  if (partes.length !== 2) return null;
  const izquierda = (partes[0] ?? '').trim();
  const derecha = (partes[1] ?? '').trim().replace(/^¿/, '').replace(/\?$/, '');
  if (!izquierda || !derecha) return null;
  return [izquierda, derecha];
}

/**
 * Extrae las pistas de un enunciado de familia `pistas`. El pack las separa con `;`
 * detrás de los dos puntos. Devuelve [] si no hay forma de partirlo.
 */
export function extraerPistas(prompt: string): string[] {
  if (!prompt.includes(':')) return [];
  const cuerpo = prompt.slice(prompt.indexOf(':') + 1).trim();
  if (!cuerpo.includes(';')) return [];
  return cuerpo
    .replace(/\.$/, '')
    .split(';')
    .map((pista) => pista.trim())
    .filter((pista) => pista.length > 2);
}
