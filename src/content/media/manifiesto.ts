/**
 * MANIFIESTO DE MEDIOS.
 *
 * La lista completa de lo que la web puede pintar, con su procedencia y su licencia. Es
 * DATOS: añadir material es añadir una entrada aquí, no tocar componentes.
 *
 * ## Cómo está poblado hoy
 *
 * 1. **Arte original** (`original`) — la fachada, los retratos, las placas, los buzones. Son
 *    componentes SVG del proyecto; no hay fichero, hay un `renderer`. Es lo que se despliega
 *    por defecto y lo que hace que la web esté completa sin depender de nadie.
 * 2. **Huecos del dueño** (`user-provided`) — se detectan solos en `public/serie/`. No se
 *    listan aquí porque aparecen y desaparecen según lo que haya en disco
 *    (`src/content/imagenes.ts`).
 * 3. **Material con licencia verificada** (`licensed`) — se importa con
 *    `node scripts/importar-commons.mjs`, que solo acepta licencias de la lista blanca y
 *    guarda autor, licencia y fecha de comprobación. Las entradas de abajo salieron de ahí.
 * 4. **Lista de deseos** (`wishlist.ts`) — todo lo interesante que se ha encontrado y NO se
 *    puede redistribuir. Se registra con su URL y su ficha, y no se descarga.
 */

import type { MediaAsset } from '@/domain/media/tipos';

import { RETRATOS_COMMONS } from './commons';
import { estaConfirmado } from './confirmados';
import { PERSONAJES, ZONAS } from '@/content/serie';

/**
 * Retratos originales: uno por vecino. No hay fichero — los dibuja `Retrato.tsx` a partir
 * del nombre, así que están siempre disponibles y pesan cero.
 */
const RETRATOS_ORIGINALES: MediaAsset[] = PERSONAJES.map((personaje) => ({
  id: `retrato:${personaje.corto.toLowerCase().replace(/\s+/g, '-')}`,
  type: 'illustration',
  category: 'character',
  title: `Retrato de ${personaje.nombre}`,
  characters: [personaje.nombre],
  tags: ['retrato', 'vecino', personaje.zona.toLowerCase()],
  usageStatus: 'original',
  renderer: 'Retrato',
  notes: 'Dibujo geométrico propio. No busca el parecido con nadie.',
}));

/** Placas y escenas de cada zona del edificio, dibujadas con CSS y SVG. */
const ZONAS_ORIGINALES: MediaAsset[] = ZONAS.map((zona) => ({
  id: `zona:${zona.id}`,
  type: 'illustration',
  category: 'location',
  title: zona.etiqueta,
  location: zona.id,
  tags: ['zona', 'edificio', zona.id],
  usageStatus: 'original',
  renderer: 'PlacaZona',
}));

/** Piezas sueltas del portal. Son las que dan ambiente. */
const AMBIENTE_ORIGINAL: MediaAsset[] = [
  {
    id: 'portal:fachada',
    type: 'background',
    category: 'building',
    title: 'Fachada de Desengaño 21',
    tags: ['portal', 'fachada', 'edificio'],
    usageStatus: 'original',
    renderer: 'PortalFacade',
  },
  {
    id: 'portal:telefonillo',
    type: 'illustration',
    category: 'object',
    title: 'Telefonillo del portal',
    tags: ['telefonillo', 'portal', 'unirse'],
    usageStatus: 'original',
    renderer: 'IntercomPanel',
  },
  {
    id: 'portal:buzones',
    type: 'illustration',
    category: 'object',
    title: 'Pared de buzones',
    tags: ['buzones', 'portal', 'notificaciones'],
    usageStatus: 'original',
    renderer: 'MailboxWall',
  },
  {
    id: 'portal:ascensor',
    type: 'illustration',
    category: 'object',
    title: 'Ascensor',
    tags: ['ascensor', 'portal', 'ranking'],
    usageStatus: 'original',
    renderer: 'ElevatorDisplay',
  },
  {
    id: 'portal:tablon',
    type: 'illustration',
    category: 'object',
    title: 'Tablón de anuncios',
    tags: ['tablon', 'portal', 'retos'],
    usageStatus: 'original',
    renderer: 'NoticeBoard',
  },
  {
    id: 'portal:placa',
    type: 'illustration',
    category: 'object',
    title: 'Placa de puerta',
    tags: ['placa', 'puerta', 'perfil'],
    usageStatus: 'original',
    renderer: 'ApartmentPlaque',
  },
];

/**
 * Material con licencia verificada.
 *
 * Se comprueba UNA POR UNA en su página de origen antes de entrar aquí. Las que están son
 * fotos de reparto en actos públicos con licencia libre; NO hay fotogramas de la serie ni
 * promocionales, porque esos no tienen licencia libre y no la van a tener.
 *
 * Para añadir más: `node scripts/importar-commons.mjs "Nombre de archivo.jpg" --personaje "X"`.
 * El script rechaza cualquier licencia que no esté en la lista blanca.
 */
/**
 * Entradas con licencia escritas a mano.
 *
 * Aquí va lo que el barrido de reparto no puede traer: lugares, y material que llegue por
 * permiso escrito del titular (que se añadiría con su correo de autorización citado en
 * `notes`).
 *
 * ## La calle del Desengaño, que es real
 *
 * El edificio de la serie NO se puede fotografiar: no existe. El rodaje fue en una nave
 * industrial de 2.000 m² en Moraleja de Enmedio y la fachada era decorado. Todas las imágenes
 * de «Desengaño 21» son fotogramas o promocionales de Atresmedia.
 *
 * Pero la **calle del Desengaño sí existe**, en el centro de Madrid, y sus edificios son
 * decimonónicos con balcones y bajos comerciales, exactamente como el de la ficción. España
 * tiene libertad de panorama (art. 35.2 LPI): las obras permanentemente situadas en la vía
 * pública se pueden fotografiar y publicar libremente. Y estas dos fotos, además, tienen
 * licencia Creative Commons del propio fotógrafo.
 *
 * Así que la portada enseña la calle de verdad. Es lo más cerca que se puede llegar de forma
 * legítima, y resulta que es bastante cerca.
 */
const CON_LICENCIA: MediaAsset[] = [
  {
    id: 'commons:desengano-calle',
    type: 'image',
    category: 'building',
    title: 'La calle del Desengaño, en el centro de Madrid',
    localPath: '/media/licensed/desengano-calle.webp',
    miniPath: '/media/licensed/desengano-calle-mini.webp',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Calle_del_Desenga%C3%B1o_(Madrid)_01.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Calle_del_Desenga%C3%B1o_(Madrid)_01.jpg',
    location: 'portal',
    tags: ['portal', 'fachada', 'madrid', 'desengano', 'calle'],
    usageStatus: 'licensed',
    license: 'CC BY-SA 3.0 es',
    attribution: 'Foto: Luis García (Zaqarbal) · CC BY-SA 3.0 es · vía Wikimedia Commons',
    verifiedAt: '2026-08-15',
    notes:
      'La calle real que da nombre al edificio de la serie. Libertad de panorama (art. 35.2 LPI) más licencia CC del fotógrafo. No es el edificio del rodaje, porque ese era un decorado en una nave de Moraleja de Enmedio.',
  },
  {
    id: 'commons:desengano-azulejo',
    type: 'image',
    category: 'decoration',
    title: 'Azulejo de la calle del Desengaño',
    localPath: '/media/licensed/desengano-azulejo.webp',
    miniPath: '/media/licensed/desengano-azulejo-mini.webp',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Calle_del_Desenga%C3%B1o_(Madrid).jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Calle_del_Desenga%C3%B1o_(Madrid).jpg',
    location: 'portal',
    tags: ['portal', 'placa', 'madrid', 'desengano', 'azulejo'],
    usageStatus: 'licensed',
    license: 'CC BY-SA 3.0',
    attribution: 'Foto: Basilio · CC BY-SA 3.0 · vía Wikimedia Commons',
    verifiedAt: '2026-08-15',
    notes: 'El azulejo cerámico de rotulación madrileña, con la escena que da nombre a la calle.',
  },
];

export const MANIFIESTO: readonly MediaAsset[] = [
  ...RETRATOS_ORIGINALES,
  ...ZONAS_ORIGINALES,
  ...AMBIENTE_ORIGINAL,
  ...CON_LICENCIA,
  // Los retratos del barrido pasan por la lista blanca: lo que nadie ha mirado queda como
  // `pending`, y `pending` no se sirve. El barrido acierta la licencia; la CARA la confirma
  // una persona. Ver `confirmados.ts` para lo que costó aprenderlo.
  ...RETRATOS_COMMONS.map((asset) =>
    estaConfirmado(asset.id) ? asset : { ...asset, usageStatus: 'pending' as const },
  ),
];

/** Índice por id, para las búsquedas del servicio. */
export const MANIFIESTO_POR_ID: ReadonlyMap<string, MediaAsset> = new Map(
  MANIFIESTO.map((asset) => [asset.id, asset]),
);

export const RESUMEN_MEDIA = {
  total: MANIFIESTO.length,
  original: MANIFIESTO.filter((asset) => asset.usageStatus === 'original').length,
  conLicencia: MANIFIESTO.filter((asset) => asset.usageStatus === 'licensed').length,
} as const;
