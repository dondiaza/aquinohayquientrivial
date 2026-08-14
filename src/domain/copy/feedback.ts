/**
 * Frases de feedback tras responder. Un único sitio para ajustar el tono del juego.
 *
 * La elección es DETERMINISTA (índice derivado del RNG de la partida), para que el
 * motor siga siendo reproducible con la misma semilla.
 */

export const CORRECT_LINES = [
  '¡Correcto! Eso merece un aplauso en la junta.',
  '¡Bien! Ni el administrador lo tenía tan claro.',
  '¡Toma! Apuntado en el acta.',
  '¡Exacto! Radio Patio lo confirma.',
  '¡Acertaste! Y sin subir la derrama.',
];

export const PARTIAL_LINES = [
  'Casi. Algo has puesto en su sitio.',
  'A medias, como las obras del 3º.',
  'Parcialmente ordenado. El caos gana por poco.',
];

export const WRONG_LINES = [
  'Pues no. Y encima se ha enterado todo el portal.',
  'Error. Esto va a acabar en junta extraordinaria.',
  'No era esa. Vuelve a leer el tablón.',
  'Nada. El administrador te mira con pena.',
];

export const TIMEOUT_LINES = [
  'Se acabó el tiempo. Como la paciencia del portero.',
  'Ni contestaste. El ascensor tampoco.',
  'Tiempo. La junta continúa sin ti.',
];

export const REVEAL_CORRECT_LABEL = 'Respuesta correcta';
export const REVEAL_YOUR_ANSWER_LABEL = 'Tu respuesta';
export const REVEAL_EXPLANATION_LABEL = 'Por qué';

/** Selección determinista dentro de una lista. */
export function pickLine(lines: string[], roll: number): string {
  if (lines.length === 0) return '';
  const index = Math.abs(Math.floor(roll * lines.length)) % lines.length;
  return lines[index] ?? lines[0] ?? '';
}
