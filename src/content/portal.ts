/**
 * LA COMUNIDAD DEMO — «Travesía del Portalón, 13»
 *
 * ¿Por qué existe este fichero?
 *
 * El juego está inspirado TEMÁTICAMENTE en el universo de las comunidades de vecinos
 * españolas de principios de los 2000, pero el banco de preguntas de Fase 1 NO afirma
 * datos de ninguna serie real: no se puede verificar canon sin fuentes fiables, y el
 * enunciado prohíbe presentar información inventada como si lo fuera.
 *
 * Solución: una comunidad de vecinos ORIGINAL, inventada para este proyecto, con su
 * propio elenco, sus lugares y sus cinco "temporadas" de crónica del portal. Así:
 *
 *   · el contenido es 100 % coherente consigo mismo (se puede jugar y aprender),
 *   · no atribuye hechos falsos a una obra ajena,
 *   · todo va marcado con `verified: false` y `sourceNote` de contenido DEMO,
 *   · el banco queda listo para importar preguntas verificadas cuando existan.
 *
 * Este fichero es la "biblia" del contenido: si añades preguntas, respétala.
 */

export const PORTAL = {
  address: 'Travesía del Portalón, 13',
  builtYear: 1968,
  floors: '5 plantas, bajo comercial y ático',
  elevator: 'un Otis de 1974 que se para entre el segundo y el tercero',
  wifi: 'PORTALON13_FIBRA',
  bar: 'Bar Los Faroles',
  admin: 'Fincas Tabares',
} as const;

/** Elenco original. Usa estos nombres exactos en el campo `characters`. */
export const NEIGHBOURS = {
  amancio: 'Amancio Quintela',
  yeyo: 'Yeyo',
  charo: 'Charo Peláez',
  braulio: 'Braulio Quiles',
  nieves: 'Nieves Arrondo',
  kevin: 'Kevin Salgado',
  ramiro: 'Ramiro Cifuentes',
  chusa: 'Chusa Vega',
  puri: 'Puri Bocanegra',
  sagrario: 'Sagrario Bocanegra',
  tino: 'Tino Palomeque',
  merche: 'Merche Roldán',
  fefa: 'Doña Fefa Marín',
  vichi: 'Vichi Nadal',
  loli: 'Loli Tabares',
  susi: 'Susi Berrocal',
  tremino: 'Los Tremiño',
} as const;

/**
 * Quién vive dónde. Es la referencia para las preguntas de PERSONAJES y LUGARES.
 *
 *   Bajo A  · Susi Berrocal — regenta el Bar Los Faroles
 *   Bajo C  · Braulio Quiles — vota no a todo, tres bicicletas en el rellano
 *   1º A    · Nieves Arrondo — profesora de latín jubilada, gata Pelusa
 *   1º B    · Kevin Salgado — repartidor, la moto en el portal
 *   2º A    · Ramiro Cifuentes y Chusa Vega — obras desde hace catorce meses
 *   2º B    · Puri y Sagrario Bocanegra — Radio Patio, silla en la ventana
 *   3º A    · Tino Palomeque y Merche Roldán — recién casados
 *   3º B    · Doña Fefa Marín — desde 1971, lo ha visto todo
 *   4º A    · Charo Peláez — presidenta desde 2019, carpeta de tapas rojas
 *   4º B    · Vichi Nadal — músico, ensaya el bajo a las tres
 *   Ático   · Los Tremiño — nunca están, macetas al mando
 *   Portería· Amancio Quintela — treinta y un años y un felpudo intocable
 */
export const TENANTS = {
  'bajo A': NEIGHBOURS.susi,
  'bajo C': NEIGHBOURS.braulio,
  '1ºA': NEIGHBOURS.nieves,
  '1ºB': NEIGHBOURS.kevin,
  '2ºA': `${NEIGHBOURS.ramiro} y ${NEIGHBOURS.chusa}`,
  '2ºB': `${NEIGHBOURS.puri} y ${NEIGHBOURS.sagrario}`,
  '3ºA': `${NEIGHBOURS.tino} y ${NEIGHBOURS.merche}`,
  '3ºB': NEIGHBOURS.fefa,
  '4ºA': NEIGHBOURS.charo,
  '4ºB': NEIGHBOURS.vichi,
  ático: NEIGHBOURS.tremino,
} as const;

/**
 * Crónica del portal por temporadas (las "temporadas" del contenido DEMO):
 *
 *   T1 · La derrama del ascensor (2.400 €). Braulio se opone; se aprueba por un voto.
 *   T2 · La gotera del 1ºA que sale de las obras del 2ºA. Catorce meses de escombro.
 *   T3 · La desaparición de Pelusa, la gata de Nieves. Siete días. Apareció en el trastero 4.
 *   T4 · La antena de la azotea y el reparto del WiFi comunitario.
 *   T5 · La plaza 7 del garaje: la moto de Kevin, la raya de Braulio y una junta extraordinaria.
 */
export const SEASONS = [
  { number: 1, title: 'La derrama del ascensor' },
  { number: 2, title: 'La gotera del primero' },
  { number: 3, title: 'Pelusa no aparece' },
  { number: 4, title: 'La antena y el WiFi' },
  { number: 5, title: 'La plaza 7' },
] as const;
