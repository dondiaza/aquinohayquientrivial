/**
 * EL PRESENTADOR — la voz del edificio.
 *
 * No hay personaje ni actor: habla la propia comunidad, con su acta, su tablón y su
 * Radio Patio. Cada momento tiene variantes suficientes para que no se repita en una
 * partida larga, y la elección es DETERMINISTA (se deriva del RNG de la partida), así
 * que una misma semilla cuenta la misma historia.
 *
 * Todos los textos del juego pasan por src/domain/copy/: cambiar el tono es editar aquí.
 */

export const MOMENTOS_ANUNCIO = [
  'INICIO',
  'RONDA',
  'ACIERTO',
  'FALLO',
  'COMBO',
  'COMBO_ALTO',
  'EVENTO',
  'ULTIMA_PREGUNTA',
  'RECORD',
  'FINAL_BUENO',
  'FINAL_REGULAR',
  'FINAL_MALO',
  'ESPERA',
] as const;

export type MomentoAnuncio = (typeof MOMENTOS_ANUNCIO)[number];

export const ANUNCIOS: Record<MomentoAnuncio, string[]> = {
  INICIO: [
    'Se abre la sesión. Que conste en acta.',
    'Buenas tardes. Empezamos con retraso, como siempre.',
    'Silencio, por favor. Y un poquito de por favor.',
    'Orden del día: demostrar que sabes de este portal.',
    'El portero ha abierto. Pasa y no toques el felpudo.',
  ],
  RONDA: [
    'Cambiamos de asunto.',
    'Siguiente punto del orden del día.',
    'Atención, que esto cambia.',
    'Nueva ronda. Nadie se levante.',
    'Se levanta la sesión… y se vuelve a sentar.',
  ],
  ACIERTO: [
    'Correcto. Que conste en acta.',
    'Eso es. El portal aprueba.',
    'Bien visto, vecino.',
    'Toma nota, secretario: acertó.',
    'Ni el administrador lo tenía tan claro.',
  ],
  FALLO: [
    'Esto se está poniendo feo.',
    'Alguien debería llamar al administrador.',
    'No era esa. Radio Patio ya lo está contando.',
    'Se anota en el acta, y no para bien.',
    'Vaya. En la próxima junta se comenta.',
  ],
  COMBO: [
    'Radio Patio tiene novedades.',
    'Van dos seguidas. El rellano murmura.',
    'Esto empieza a oler a presidencia.',
    'El portal levanta la cabeza.',
  ],
  COMBO_ALTO: [
    '¡Esto ya es un escándalo vecinal!',
    'Han convocado junta para hablar de ti.',
    'Nadie te tose en el ascensor.',
    'Que alguien traiga una placa con tu nombre.',
  ],
  EVENTO: [
    'Se convoca junta extraordinaria.',
    'Atención al tablón: hay aviso nuevo.',
    'Esto no estaba en el orden del día.',
    'La administradora ha llamado. Malas noticias.',
  ],
  ULTIMA_PREGUNTA: [
    'Última pregunta. Aquí se decide el portal.',
    'Se cierra la sesión con esta.',
    'Lo que pase ahora va al acta para siempre.',
  ],
  RECORD: [
    '¡Récord del portal! Que lo firme el secretario.',
    'Nunca se había visto algo así en esta comunidad.',
    'Esto va directo al tablón de honor.',
  ],
  FINAL_BUENO: [
    'Junta ejemplar. El portal está en buenas manos.',
    'Aprobado por unanimidad. Cosa rarísima.',
    'Se levanta la sesión con aplausos.',
  ],
  FINAL_REGULAR: [
    'Ni bien ni mal: una junta normal.',
    'Se aprueba con matices y algún voto en contra.',
    'Podría haber sido peor. Y mejor.',
  ],
  FINAL_MALO: [
    'Junta suspendida por falta de aciertos.',
    'El acta de hoy es corta y triste.',
    'Habrá que convocar otra. Y estudiar.',
  ],
  ESPERA: [
    'El ascensor está subiendo…',
    'Buscando la llave del cuarto de contadores…',
    'Radio Patio está confirmando la información…',
  ],
};

/** Elige un anuncio de forma determinista (roll en [0,1)). */
export function anunciar(momento: MomentoAnuncio, roll: number): string {
  const variantes = ANUNCIOS[momento];
  if (variantes.length === 0) return '';
  const indice = Math.abs(Math.floor(roll * variantes.length)) % variantes.length;
  return variantes[indice] ?? variantes[0] ?? '';
}

/** Anuncio para el final de partida según lo bien que haya ido (0..1). */
export function anuncioFinal(indiceRendimiento: number, roll: number): string {
  if (indiceRendimiento >= 0.75) return anunciar('FINAL_BUENO', roll);
  if (indiceRendimiento >= 0.4) return anunciar('FINAL_REGULAR', roll);
  return anunciar('FINAL_MALO', roll);
}

/** Rumores para el ticker de Radio Patio (decorativos, nunca informan de reglas). */
export const RUMORES_TICKER = [
  'Dicen que el del 2ºA ha vuelto a empezar la obra',
  'Se busca dueño de un paquete sin nombre',
  'Alguien ha movido el felpudo de la portería',
  'La antena vuelve a estar torcida',
  'El repetidor del WiFi ha desaparecido otra vez',
  'Hay una silla nueva en el patio y nadie sabe de quién es',
  'Se comenta que la próxima derrama viene con sorpresa',
  'El ascensor ha funcionado dos días seguidos: milagro',
  'Cuidado con la plaza 7 del garaje',
  'La gata del 1ºA ha vuelto a escaparse',
];
