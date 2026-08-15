/**
 * CATÁLOGO DE HUECOS — el sitio de cada imagen.
 *
 * `src/content/imagenes.ts` sabe responder «¿hay fichero para este hueco?». Lo que no había
 * era la otra mitad: **la lista de todos los huecos que la aplicación espera**. Sin esa lista
 * no se puede decir si falta algo, porque no consta que debiera estar.
 *
 * Aquí se declaran todos, agrupados por familia, con el nombre exacto del hueco, qué
 * representa y dónde se pinta. De ahí salen tres cosas:
 *
 *   · el inventario del panel, que dice qué está puesto y qué falta;
 *   · las instrucciones para quien tenga los derechos (nombre de fichero exacto);
 *   · las entradas de la lista de deseos, que se generan solas en vez de escribirse a mano.
 *
 * ## Por qué hay huecos que no se van a llenar nunca desde aquí
 *
 * Los fotogramas, promocionales y carteles de la serie son de Atresmedia y de la productora.
 * No se pueden bajar de un buscador y publicarlos: que una imagen sea accesible no la hace
 * reutilizable. Esos huecos existen igual, declarados y con su sitio preparado, y se llenan
 * el día que llegue el material con permiso —copiando el fichero, sin tocar una línea—.
 *
 * Mientras tanto cada uno tiene detrás arte ORIGINAL del proyecto, que es lo que se despliega.
 * La aplicación está entera sin una sola imagen ajena.
 */

import { PERSONAJES, TEMPORADAS, ZONAS } from '../serie';
import { slug } from '../imagenes';

export type FamiliaHueco =
  | 'personaje'
  | 'zona'
  | 'temporada'
  | 'situacion'
  | 'elemento'
  | 'portal';

/** De dónde puede salir legítimamente el material de un hueco. */
export type OrigenPosible =
  | 'propietario' // lo aporta quien es dueño del proyecto o tiene el permiso
  | 'commons' // hay material con licencia libre verificable
  | 'original'; // lo dibujamos nosotros y no hace falta nada más

export type Hueco = {
  /** Nombre exacto del hueco. El fichero va en `public/serie/<hueco>.<ext>`. */
  id: string;
  familia: FamiliaHueco;
  titulo: string;
  /** Qué debería verse. Es lo que lee quien va a aportar el fichero. */
  describe: string;
  /** Dónde se pinta en la aplicación. */
  donde: string;
  origen: OrigenPosible;
  /** Personaje al que pertenece, si aplica: enlaza el hueco con el manifiesto. */
  personaje?: string;
  zonaId?: string;
  temporada?: number;
};

// ── Personajes ──────────────────────────────────────────────────────────────────

/**
 * Dos huecos por personaje, y son distintos a propósito:
 *
 *   · `vecinos/<slug>` es el RETRATO, la cara. Se usa en la ficha, en las preguntas de
 *     «¿quién es?» y en el catálogo. Aquí sí puede entrar una fotografía real del
 *     intérprete si tiene licencia libre —eso lo resuelve el barrido de Commons—.
 *   · `escenas/<slug>` es el personaje EN SITUACIÓN, que solo puede salir de un fotograma.
 *     Ese no va a llegar de Commons nunca; se queda esperando permiso.
 */
const PERSONAJE: Hueco[] = PERSONAJES.flatMap((personaje) => [
  {
    id: `vecinos/${slug(personaje.nombre)}`,
    familia: 'personaje' as const,
    titulo: personaje.nombre,
    describe: `Retrato de ${personaje.nombre} (${personaje.interprete}). Cara reconocible, encuadre de busto.`,
    donde: 'Ficha del personaje, catálogo de vecinos y preguntas de «¿quién es?»',
    origen: 'commons' as const,
    personaje: personaje.nombre,
  },
  {
    id: `escenas/${slug(personaje.nombre)}`,
    familia: 'personaje' as const,
    titulo: `${personaje.nombre} en situación`,
    describe: `${personaje.nombre} dentro de una escena de la serie, no posando.`,
    donde: 'Cabecera de la ficha y preguntas de «¿qué ocurrió?»',
    origen: 'propietario' as const,
    personaje: personaje.nombre,
  },
]);

// ── Zonas del edificio ──────────────────────────────────────────────────────────

const ZONA: Hueco[] = ZONAS.map((zona) => ({
  id: `zonas/${zona.id}`,
  familia: 'zona' as const,
  titulo: zona.etiqueta,
  describe: `${zona.etiqueta} — ${zona.idea}. Habitantes: ${zona.habitantes}.`,
  donde: 'Mapa del edificio, preguntas de «¿dónde estamos?» y fondo de sala',
  origen: 'propietario' as const,
  zonaId: zona.id,
}));

// ── Temporadas ──────────────────────────────────────────────────────────────────

const TEMPORADA: Hueco[] = TEMPORADAS.map((_temporada, indice) => ({
  id: `temporadas/${indice + 1}`,
  familia: 'temporada' as const,
  titulo: `Temporada ${indice + 1}`,
  describe: `Imagen que identifique la temporada ${indice + 1} — reparto o trama de esa etapa.`,
  donde: 'Selector de temporada y preguntas de «¿de qué temporada?»',
  origen: 'propietario' as const,
  temporada: indice + 1,
}));

// ── Situaciones recurrentes ─────────────────────────────────────────────────────

/**
 * Las situaciones que se repiten capítulo tras capítulo y que son la gracia de la serie.
 * Son las que dan ambiente a las pantallas de juego: la junta, la avería del ascensor, el
 * cotilleo en el rellano. Todas salen de fotogramas, así que todas esperan permiso.
 */
const SITUACION: Hueco[] = [
  ['junta', 'La junta de vecinos', 'Reunión de la comunidad, sillas en círculo, discusión'],
  ['ascensor-averiado', 'El ascensor averiado', 'El ascensor parado y el cartel de avería'],
  ['rellano-cotilleo', 'Cotilleo en el rellano', 'Vecinas hablando en la escalera'],
  ['derrama', 'La derrama', 'El momento en que se anuncia lo que hay que pagar'],
  ['mudanza', 'Una mudanza', 'Cajas y muebles subiendo por la escalera'],
  ['obras', 'Obras en el edificio', 'Andamios, escombros y ruido'],
  ['cena-vecinos', 'Cena de vecinos', 'Mesa larga y convivencia forzada'],
  ['discusion-portal', 'Bronca en el portal', 'Dos vecinos discutiendo en la entrada'],
  ['bar', 'En el bar', 'El bar de abajo como punto de encuentro'],
  ['azotea-tendedero', 'La azotea', 'Tendedero, antenas y vistas'],
].map(([id, titulo, describe]) => ({
  id: `situaciones/${id}`,
  familia: 'situacion' as const,
  titulo: titulo!,
  describe: describe!,
  donde: 'Fondo de pregunta, cabecera de ronda y tarjeta de resultados',
  origen: 'propietario' as const,
}));

// ── Elementos del portal ────────────────────────────────────────────────────────

/**
 * Los objetos del portal. Estos SÍ los dibujamos nosotros y ya están hechos: un buzón, un
 * telefonillo o un tablón de anuncios no necesitan ser los de la serie para funcionar, y
 * dibujarlos nos da un portal coherente que además es nuestro.
 */
const ELEMENTO: Hueco[] = [
  ['buzones', 'Los buzones', 'Pared de buzones numerados'],
  ['telefonillo', 'El telefonillo', 'Portero automático con sus botones'],
  ['tablon', 'El tablón de anuncios', 'Corcho con notas clavadas'],
  ['placa', 'La placa de la comunidad', 'Placa metálica con el nombre del edificio'],
  ['escalera', 'La escalera', 'Tramo de escalera con barandilla'],
  ['ascensor', 'El ascensor', 'Cabina y su indicador de planta'],
  ['puerta-vivienda', 'Puerta de vivienda', 'Puerta con mirilla y número'],
  ['felpudo', 'El felpudo', 'Felpudo de entrada'],
].map(([id, titulo, describe]) => ({
  id: `elementos/${id}`,
  familia: 'elemento' as const,
  titulo: titulo!,
  describe: describe!,
  donde: 'Portal interactivo de la portada y decoración de pantallas',
  origen: 'original' as const,
}));

// ── El portal en sí ─────────────────────────────────────────────────────────────

const PORTAL: Hueco[] = [
  {
    id: 'portal/fachada',
    familia: 'portal',
    titulo: 'La fachada',
    describe: 'El edificio visto desde la calle, entero.',
    donde: 'Cabecera de la portada',
    origen: 'propietario',
  },
  {
    id: 'portal/entrada',
    familia: 'portal',
    titulo: 'El portal por dentro',
    describe: 'Entrada, buzones y arranque de la escalera.',
    donde: 'Fondo de la sala de espera y del vestíbulo',
    origen: 'propietario',
  },
  {
    id: 'portal/nocturno',
    familia: 'portal',
    titulo: 'El portal de noche',
    describe: 'La misma fachada con luz de noche, para el modo oscuro.',
    donde: 'Portada en tema oscuro',
    origen: 'original',
  },
];

// ── El catálogo entero ──────────────────────────────────────────────────────────

export const HUECOS: readonly Hueco[] = [
  ...PORTAL,
  ...PERSONAJE,
  ...ZONA,
  ...TEMPORADA,
  ...SITUACION,
  ...ELEMENTO,
];

export const FAMILIAS: readonly { id: FamiliaHueco; label: string; explica: string }[] = [
  { id: 'portal', label: 'El portal', explica: 'La fachada y la entrada' },
  { id: 'personaje', label: 'Personajes', explica: 'Un retrato y una escena por vecino' },
  { id: 'zona', label: 'Zonas', explica: 'Cada vivienda y espacio común' },
  { id: 'temporada', label: 'Temporadas', explica: 'Una imagen por temporada' },
  { id: 'situacion', label: 'Situaciones', explica: 'Lo que pasa una y otra vez' },
  { id: 'elemento', label: 'Elementos', explica: 'Los trastos del portal' },
];

export function huecosDeFamilia(familia: FamiliaHueco): readonly Hueco[] {
  return HUECOS.filter((hueco) => hueco.familia === familia);
}

export function huecoPorId(id: string): Hueco | null {
  return HUECOS.find((hueco) => hueco.id === id) ?? null;
}

/** Huecos de un personaje concreto, por nombre exacto. */
export function huecosDePersonaje(nombre: string): readonly Hueco[] {
  return HUECOS.filter((hueco) => hueco.personaje === nombre);
}
