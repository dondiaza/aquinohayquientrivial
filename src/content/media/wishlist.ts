/**
 * LISTA DE DESEOS — material localizado que NO se puede usar todavía.
 *
 * Al buscar material visual de la serie aparece mucha cosa buena: fotogramas, promocionales,
 * carteles, fotos de rodaje. Casi nada de eso tiene licencia de reutilización, y que algo
 * esté accesible públicamente no significa que se pueda redistribuir.
 *
 * En lugar de descargarlo «por si acaso» o de fingir que no existe, se registra aquí con lo
 * que hace falta para que alguien con capacidad de gestionar derechos pueda decidir: qué es,
 * dónde está, qué representa, por qué no se puede usar y qué habría que conseguir.
 *
 * **Nada de esta lista se descarga, se sirve ni se referencia desde una pantalla.** El
 * tipo `pending` no está en `ESTADOS_SERVIBLES` justamente por eso.
 *
 * ## Qué se comprobó (agosto de 2026)
 *
 * · **Wikimedia Commons** tiene una categoría de la serie y subcategorías de varios
 *   intérpretes. Casi todo son fotos de actos públicos (festivales, premios) con licencia
 *   libre: eso SÍ se puede usar, y lo que se verifica entra en el manifiesto.
 * · El promocional de la serie que hay en Commons no lleva licencia libre.
 * · Los fotogramas, carteles y promocionales de Antena 3 / Miramón Mendi no están bajo
 *   ninguna licencia de reutilización. La vía para tenerlos es un permiso del titular, no
 *   una descarga.
 * · ATRESplayer aloja la serie completa, pero su material es de la plataforma.
 */

import type { DeseoMedia } from '@/domain/media/tipos';

export const LISTA_DE_DESEOS: readonly DeseoMedia[] = [
  {
    id: 'atresmedia:desengano-21',
    title: 'La fachada de Desengaño 21',
    describe:
      'Imagen promocional del edificio de la serie publicada por Antena 3. Es la fachada que todo el mundo reconoce.',
    sourcePage: 'https://www.atresplayer.com/antena3/series/aqui-no-hay-quien-viva/',
    motivo:
      'Promocional de Atresmedia. Está en el proyecto AQUINOLAB del propietario, cuyo ATTRIBUTION.md la marca «© Atresmedia, editorial reference in a local prototype» y advierte de obtener derechos antes de cualquier distribución pública.',
    queHaceFalta:
      'Autorización de Atresmedia para uso no comercial en una web pública. Mientras tanto la portada usa una foto real de la calle del Desengaño de Madrid, que sí es libre.',
    registradoEl: '2026-08-15',
  },
  {
    id: 'atresmedia:retratos-personajes',
    title: 'Los 28 retratos de personaje de AQUINOLAB',
    describe:
      'Fotogramas y retratos promocionales de los personajes, uno por vecino, recogidos de FormulaTV, GQ España, 20minutos/Cinemanía, La Vanguardia y Series de España Wiki.',
    sourcePage: 'https://github.com/dondiaza/aquinolab',
    motivo:
      'Todos son material de Atresmedia. El ATTRIBUTION.md que los acompaña autoriza su uso como referencia editorial en un prototipo local y pide obtener derechos antes de distribuirlos públicamente.',
    queHaceFalta:
      'Autorización de Atresmedia. Se pueden usar YA en local: node scripts/importar-aquinolab.mjs <ruta a aquinolab> los copia a public/serie/, que está gitignorada y no se despliega.',
    registradoEl: '2026-08-15',
  },
  {
    id: 'deseo:promocional-serie',
    title: 'Imagen promocional de la serie',
    describe: 'Foto de grupo del reparto en el portal. Sería la cabecera ideal de la portada.',
    sourcePage: 'https://commons.wikimedia.org/wiki/Category:Aqu%C3%AD_no_hay_quien_viva_(Espa%C3%B1a)',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Aqu%C3%AD_no_hay_quien_viva.jpg',
    motivo:
      'Es material promocional de la productora. Está en Commons pero sin licencia libre de reutilización.',
    queHaceFalta: 'Permiso escrito de Atresmedia o de Miramón Mendi para uso en este proyecto.',
    registradoEl: '2026-08-15',
  },
  {
    id: 'deseo:fotogramas-portal',
    title: 'Fotogramas del portal y el rellano',
    describe:
      'Planos del portal de Desengaño 21, la portería, el rellano y el ascensor. Cubrirían los huecos de zonas.',
    sourcePage: 'https://www.atresplayer.com/',
    location: 'porteria',
    motivo: 'Fotogramas de la serie: propiedad de Antena 3 / Atresmedia. Sin licencia de reutilización.',
    queHaceFalta:
      'Licencia de la cadena, o un press kit con condiciones de uso explícitas para terceros.',
    registradoEl: '2026-08-15',
  },
  {
    id: 'deseo:retratos-personajes',
    title: 'Retratos de los personajes caracterizados',
    describe:
      'Los 27 vecinos de la biblia, en personaje. Rellenarían los huecos de vecinos y las preguntas de ¿quién es?',
    sourcePage: 'https://es.wikipedia.org/wiki/Aqu%C3%AD_no_hay_quien_viva_(Espa%C3%B1a)',
    motivo:
      'Un retrato «en personaje» es un fotograma o un promocional: derechos de la productora, y además derechos de imagen de cada intérprete.',
    queHaceFalta: 'Doble permiso: titular de la obra e intérpretes.',
    registradoEl: '2026-08-15',
  },
  {
    id: 'deseo:fotos-reparto-commons',
    title: 'Más fotos de reparto con licencia libre en Wikimedia Commons',
    describe:
      'Hay subcategorías de María Adánez, Malena Alterio, Daniel Guzmán, Eduardo Gómez y Emma Ozores con decenas de fotos de premios y festivales.',
    sourcePage: 'https://commons.wikimedia.org/wiki/Category:Aqu%C3%AD_no_hay_quien_viva_(Espa%C3%B1a)',
    characters: ['Lucía Álvarez', 'Belén López Vázquez', 'Roberto Alonso', 'Mariano Delgado'],
    motivo:
      'No es que no se puedan usar: es que cada fichero tiene SU licencia y hay que comprobarla una a una antes de importarla.',
    queHaceFalta:
      'Pasar `node scripts/importar-commons.mjs "<fichero>"` por cada una. El script rechaza lo que no tenga licencia admitida.',
    registradoEl: '2026-08-15',
  },
  {
    id: 'deseo:cabecera-sintonia',
    title: 'Cabecera y sintonía',
    describe: 'La cabecera de Vocal Factory. Daría muchísimo carácter a la pantalla de inicio de partida.',
    sourcePage: 'https://es.wikipedia.org/wiki/Aqu%C3%AD_no_hay_quien_viva_(Espa%C3%B1a)',
    motivo: 'Obra audiovisual y musical con derechos. No hay versión libre.',
    queHaceFalta: 'Licencia de sincronización. Mientras tanto, el juego usa sonido sintetizado propio.',
    registradoEl: '2026-08-15',
  },
];

/** Deseos que corresponden a un personaje concreto, para enseñarlos en el panel. */
export function deseosDePersonaje(nombre: string): readonly DeseoMedia[] {
  return LISTA_DE_DESEOS.filter((deseo) => deseo.characters?.includes(nombre));
}
