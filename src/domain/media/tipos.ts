/**
 * BIBLIOTECA DE MEDIOS — el contrato.
 *
 * Todo lo que se ve en la web pasa por aquí. Ningún componente construye rutas a mano:
 * pide un asset por id o por etiquetas y recibe algo que SIEMPRE se puede pintar, porque si
 * no hay material con licencia hay un marcador de posición equivalente.
 *
 * ## Por qué cada asset lleva su licencia encima
 *
 * Este juego habla de una serie ajena. La diferencia entre un proyecto que se puede
 * publicar y uno que no está en si alguien puede responder, para cada imagen, «de dónde
 * salió y con qué permiso». Un campo `license` obligatorio en el tipo obliga a responderlo
 * al añadirla, que es cuando se sabe; hacerlo después es imposible.
 *
 * ## Los cinco estados
 *
 *   · `user-provided` — la ha puesto el dueño del proyecto en `public/serie/`. Se usa.
 *   · `licensed` ····· tiene licencia verificable (Creative Commons, dominio público).
 *                      Se usa, y se pinta la atribución si la licencia la exige.
 *   · `authorized` ··· permiso explícito del titular. Se usa.
 *   · `original` ····· arte propio del proyecto (SVG/CSS). Se usa siempre.
 *   · `placeholder` ·· hueco dibujado mientras no haya nada mejor. Se usa.
 *   · `pending` ······ material localizado del que NO se ha podido verificar el permiso.
 *                      **NO se descarga, NO se sirve y NO se referencia desde una pantalla.**
 *                      Vive en la lista de deseos con su URL y su ficha, para que alguien
 *                      con capacidad de gestionar derechos decida.
 */

export const TIPOS_MEDIA = ['image', 'illustration', 'background', 'icon'] as const;
export type TipoMedia = (typeof TIPOS_MEDIA)[number];

export const CATEGORIAS_MEDIA = [
  'character',
  'location',
  'building',
  'object',
  'episode',
  'decoration',
] as const;
export type CategoriaMedia = (typeof CATEGORIAS_MEDIA)[number];

export const ESTADOS_USO = [
  'user-provided',
  'authorized',
  'licensed',
  'original',
  'placeholder',
  'pending',
] as const;
export type EstadoUso = (typeof ESTADOS_USO)[number];

/** Estados que se pueden pintar en pantalla. `pending` NO está, y esa es la clave. */
export const ESTADOS_SERVIBLES: readonly EstadoUso[] = [
  'user-provided',
  'authorized',
  'licensed',
  'original',
  'placeholder',
];

export type MediaAsset = {
  id: string;
  type: TipoMedia;
  category: CategoriaMedia;
  title: string;

  /** Ruta pública. Ausente en `pending` y en los que se dibujan con SVG. */
  localPath?: string;
  /** Fichero original en su origen. */
  sourceUrl?: string;
  /** Página desde la que se llegó, para poder rehacer la comprobación. */
  sourcePage?: string;

  season?: number;
  episode?: number;

  /** Ids del catálogo de personajes, no nombres sueltos. */
  characters?: string[];
  /** Id del catálogo de lugares. */
  location?: string;
  tags: string[];

  usageStatus: EstadoUso;
  /** Texto exacto que hay que pintar si la licencia lo exige. */
  attribution?: string;
  /** Nombre exacto de la licencia: «CC BY-SA 4.0», «Dominio público»… */
  license?: string;
  /** Cuándo se comprobó la licencia. Sin fecha, la comprobación no vale nada. */
  verifiedAt?: string;

  /** Para el dibujo original: qué componente lo pinta. */
  renderer?: string;
  /** Notas para quien revise. */
  notes?: string;
};

/** ¿Se puede poner en pantalla? */
export function esServible(asset: MediaAsset): boolean {
  return ESTADOS_SERVIBLES.includes(asset.usageStatus);
}

/** ¿Hay que pintar una línea de atribución debajo? */
export function requiereAtribucion(asset: MediaAsset): boolean {
  // «Requiere» es una obligación, no una comprobación de que esté puesta. Si se devolviera
  // `… && Boolean(asset.attribution)`, un asset con licencia y SIN texto de atribución
  // saldría como que no la necesita, que es justo el fallo que hay que poder detectar.
  return asset.usageStatus === 'licensed' || asset.usageStatus === 'authorized';
}

/** Le falta el crédito que debería llevar. Lo usa el panel para avisar. */
export function faltaAtribucion(asset: MediaAsset): boolean {
  return requiereAtribucion(asset) && !asset.attribution;
}

/**
 * Licencias que se admiten al importar. Cualquier otra cosa entra como `pending`.
 *
 * La lista es corta a propósito: si una licencia no está aquí es que nadie ha leído sus
 * condiciones, y usar una imagen sin haber leído sus condiciones es exactamente el problema
 * que este módulo existe para evitar.
 */
export const LICENCIAS_ADMITIDAS = [
  'CC0',
  'Dominio público',
  'Public domain',
  'CC BY 2.0',
  'CC BY 3.0',
  'CC BY 4.0',
  'CC BY-SA 2.0',
  'CC BY-SA 2.5',
  'CC BY-SA 3.0',
  'CC BY-SA 4.0',
] as const;

export function licenciaAdmitida(licencia: string | undefined): boolean {
  if (!licencia) return false;
  const normalizada = licencia.trim().toLowerCase();
  return LICENCIAS_ADMITIDAS.some((admitida) => normalizada.includes(admitida.toLowerCase()));
}

/** Entrada de la lista de deseos: material localizado que NO se puede redistribuir. */
export type DeseoMedia = {
  id: string;
  title: string;
  /** Qué representa: personaje, lugar, escena. */
  describe: string;
  sourcePage: string;
  sourceUrl?: string;
  /** A qué personaje o lugar del catálogo correspondería. */
  characters?: string[];
  location?: string;
  /** Por qué no se puede usar todavía. */
  motivo: string;
  /** Qué habría que conseguir para poder usarla. */
  queHaceFalta: string;
  registradoEl: string;
};
