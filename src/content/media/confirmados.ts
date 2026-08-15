/**
 * FOTOS CONFIRMADAS A OJO — la lista blanca de caras.
 *
 * ## Por qué existe este fichero
 *
 * El barrido de Commons comprueba la licencia perfectamente. Lo que NO puede comprobar es
 * **quién sale en la foto**, y se demostró de la peor manera: se publicaron 55 retratos y
 * bastó mirarlos para encontrar una lápida en el hueco de Eduardo García, un partido de
 * fútbol en el de Santiago Ramos y un grabado militar del siglo XIX en el de Elio González.
 *
 * Se intentó arreglar con filtros de texto cada vez más estrictos. No funciona, y no puede
 * funcionar: el texto no dice quién sale en la foto. Restringirlo a las categorías personales
 * de Commons —que las mantiene gente que mira las imágenes— mejoró mucho pero tampoco basta,
 * porque los nombres colisionan: hay un piloto llamado Santiago Ramos y su categoría son
 * coches.
 *
 * Así que el sistema deja de fingir que sabe. Todo lo que baja el barrido entra como
 * `pending`, que **no es servible** (ver `ESTADOS_SERVIBLES`), y solo se publica lo que
 * aparece en esta lista porque alguien lo ha mirado.
 *
 * ## Cómo se amplía
 *
 * En `/admin/medios/revisar` salen los candidatos con su foto grande, su licencia y su origen.
 * Lo que sea correcto se añade aquí con una línea. Lo que no, se queda fuera para siempre —y
 * también se anota, porque un rechazo sin registrar se vuelve a proponer en el siguiente
 * barrido—.
 */

/** Ids del manifiesto que una persona ha mirado y ha dado por buenos. */
export const CONFIRMADOS: readonly string[] = [
  // Caras públicas reconocibles, retrato individual, coherentes con el papel.
  'commons:fernando-tejero',
  'commons:fernando-tejero-2',
  'commons:malena-alterio',
  'commons:malena-alterio-2',
  'commons:maria-adanez',
  'commons:maria-adanez-2',
  'commons:loles-leon',
  'commons:loles-leon-2',
  'commons:cristina-castano',
  'commons:cristina-castano-2',
  'commons:eva-isanta',
  'commons:eva-isanta-2',
  'commons:isabel-ordaz',
  'commons:isabel-ordaz-2',
  'commons:laura-pamplona',
  'commons:laura-pamplona-2',
  'commons:vanesa-romero',
  'commons:vanesa-romero-2',
  'commons:emilio-gutierrez-caba-2',
  'commons:beatriz-carvajal-2',
  'commons:carmen-balague',
  'commons:gemma-cuervo',
  'commons:emma-penella',

  // La calle del Desengaño real, en Madrid. Mirada: es la calle, con sus edificios
  // decimonónicos y su azulejo. Libertad de panorama más licencia CC del fotógrafo.
  'commons:desengano-calle',
  'commons:desengano-azulejo',
];

/**
 * Rechazados, con el motivo. No es documentación: es memoria.
 *
 * Sin esta lista el siguiente barrido vuelve a bajar la lápida, vuelve a proponerla y alguien
 * vuelve a tener que descubrir que está mal. Con ella, el barrido ya sabe que no.
 */
export const RECHAZADOS: readonly { id: string; motivo: string }[] = [
  { id: 'commons:eduardo-garcia', motivo: 'Otro Eduardo García: señor mayor, y el papel es un niño' },
  { id: 'commons:eduardo-gomez', motivo: 'No se ha podido confirmar que sea el intérprete' },
  { id: 'commons:santiago-ramos', motivo: 'Es el piloto homónimo: sale un coche de Fórmula' },
  { id: 'commons:santiago-ramos-2', motivo: 'Es el piloto homónimo: sale un coche de Fórmula' },
  { id: 'commons:luis-merlo', motivo: 'Collage de personas con libros, no es un retrato suyo' },
  { id: 'commons:luis-merlo-2', motivo: 'Collage de personas con libros, no es un retrato suyo' },
  { id: 'commons:sofia-nieto', motivo: 'Otra Sofía Nieto: no es la intérprete de la serie' },
  { id: 'commons:sofia-nieto-2', motivo: 'Otra Sofía Nieto: no es la intérprete de la serie' },
  { id: 'commons:daniel-guzman', motivo: 'Foto de carné de otra persona' },
  { id: 'commons:daniel-guzman-2', motivo: 'Foto de grupo: no se distingue a quién retrata' },
  { id: 'commons:antonio-molero', motivo: 'Rueda de prensa de tres personas, no es un retrato' },
  { id: 'commons:antonio-molero-2', motivo: 'Acto de otra persona homónima' },
  { id: 'commons:nathalie-sesena', motivo: 'Escena con dos personas, no es un retrato' },
  { id: 'commons:nathalie-sesena-2', motivo: 'Escena con dos personas, no es un retrato' },
  { id: 'commons:beatriz-carvajal', motivo: 'Escena de teatro a contraluz, no se ve la cara' },
  { id: 'commons:carmen-balague-2', motivo: 'Foto de grupo de cuatro personas' },
  { id: 'commons:emilio-gutierrez-caba', motivo: 'Foto de grupo en los Goya' },
];

const RECHAZADOS_POR_ID = new Set(RECHAZADOS.map((entrada) => entrada.id));

export function estaConfirmado(id: string): boolean {
  return CONFIRMADOS.includes(id);
}

export function estaRechazado(id: string): boolean {
  return RECHAZADOS_POR_ID.has(id);
}

/** Ni confirmado ni rechazado: hay que mirarlo. */
export function estaPorRevisar(id: string): boolean {
  return !estaConfirmado(id) && !estaRechazado(id);
}
