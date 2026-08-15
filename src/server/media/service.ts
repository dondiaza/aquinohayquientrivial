/**
 * SERVICIO DE MEDIOS — la única puerta para pedir una imagen.
 *
 * Ninguna pantalla construye rutas a mano. Se pide por id, por personaje, por lugar o por
 * etiquetas, y siempre se recibe algo pintable: si no hay material con licencia, se
 * devuelve el dibujo original equivalente.
 *
 * Dos garantías que se cumplen aquí y no en los componentes:
 *
 *   1. **Nunca se sirve un `pending`.** Se filtra en el único sitio por el que se pasa.
 *   2. **La atribución viaja con la imagen.** Si una licencia exige crédito, el crédito va
 *      pegado al asset, así que es imposible pintar la foto y olvidarse de la línea.
 */

import {
  esServible,
  faltaAtribucion,
  requiereAtribucion,
  type CategoriaMedia,
  type MediaAsset,
} from '@/domain/media/tipos';
import { MANIFIESTO, MANIFIESTO_POR_ID } from '@/content/media/manifiesto';
import { huecoDeVecino, huecoDeZona, imagenDe } from '@/content/imagenes';

/** Asset por id. `null` si no existe o si no se puede servir. */
export function getMediaAsset(id: string): MediaAsset | null {
  const asset = MANIFIESTO_POR_ID.get(id);
  if (!asset || !esServible(asset)) return null;
  return asset;
}

/**
 * Todo lo que hay de un personaje, del mejor al peor:
 *
 *   1. lo que el dueño haya puesto en `public/serie/vecinos/` (manda siempre);
 *   2. material con licencia verificada;
 *   3. el retrato dibujado, que existe siempre.
 */
export function getCharacterAssets(nombre: string): MediaAsset[] {
  const resultado: MediaAsset[] = [];

  const propia = imagenDe(huecoDeVecino(nombre));
  if (propia) {
    resultado.push({
      id: `propio:${nombre}`,
      type: 'image',
      category: 'character',
      title: nombre,
      localPath: propia,
      characters: [nombre],
      tags: ['vecino', 'propio'],
      usageStatus: 'user-provided',
    });
  }

  for (const asset of MANIFIESTO) {
    if (!esServible(asset)) continue;
    if (asset.category !== 'character') continue;
    if (!asset.characters?.includes(nombre)) continue;
    resultado.push(asset);
  }

  return resultado.sort((a, b) => prioridad(a) - prioridad(b));
}

/** El mejor asset de un personaje: el primero de la lista anterior. */
export function getCharacterAsset(nombre: string): MediaAsset | null {
  return getCharacterAssets(nombre)[0] ?? null;
}

export function getLocationAssets(zonaId: string, etiqueta: string): MediaAsset[] {
  const resultado: MediaAsset[] = [];

  const propia = imagenDe(huecoDeZona(etiqueta));
  if (propia) {
    resultado.push({
      id: `propio:zona:${zonaId}`,
      type: 'background',
      category: 'location',
      title: etiqueta,
      localPath: propia,
      location: zonaId,
      tags: ['zona', 'propio'],
      usageStatus: 'user-provided',
    });
  }

  for (const asset of MANIFIESTO) {
    if (!esServible(asset)) continue;
    if (asset.category !== 'location') continue;
    if (asset.location !== zonaId) continue;
    resultado.push(asset);
  }

  return resultado.sort((a, b) => prioridad(a) - prioridad(b));
}

/**
 * Material utilizable para una pregunta visual.
 *
 * Devuelve `null` si no hay nada REAL (foto con licencia o del dueño). Es a propósito: una
 * pregunta de «¿quién es esta persona?» con un dibujo geométrico no tiene sentido, así que
 * el motor no debe activarla. Lo dice el enunciado y lo decide esta función.
 */
export function getQuestionMedia(opciones: {
  characters?: string[];
  location?: string;
  categoria?: CategoriaMedia;
}): MediaAsset | null {
  const candidatos = MANIFIESTO.filter((asset) => {
    if (!esServible(asset)) return false;
    // Solo material fotográfico real: el dibujo no sirve para preguntar «quién es». Un
    // retrato geométrico no identifica a nadie, así que una pregunta visual sobre él sería
    // imposible de responder y de justificar.
    const esFoto =
      asset.usageStatus === 'licensed' ||
      asset.usageStatus === 'user-provided' ||
      asset.usageStatus === 'authorized';
    if (!esFoto) return false;
    if (opciones.categoria && asset.category !== opciones.categoria) return false;
    if (opciones.location && asset.location !== opciones.location) return false;
    if (opciones.characters?.length) {
      return opciones.characters.some((nombre) => asset.characters?.includes(nombre));
    }
    return true;
  });

  return candidatos[0] ?? null;
}

/** Material del dueño para un personaje: lo que de verdad permite preguntas visuales. */
export function getQuestionMediaDePersonaje(nombre: string): MediaAsset | null {
  const propia = imagenDe(huecoDeVecino(nombre));
  if (propia) {
    return {
      id: `propio:${nombre}`,
      type: 'image',
      category: 'character',
      title: nombre,
      localPath: propia,
      characters: [nombre],
      tags: ['vecino', 'propio'],
      usageStatus: 'user-provided',
    };
  }
  return getQuestionMedia({ characters: [nombre], categoria: 'character' });
}

export function getRandomMediaByTags(etiquetas: readonly string[], semilla = 0): MediaAsset | null {
  const candidatos = MANIFIESTO.filter(
    (asset) => esServible(asset) && etiquetas.some((etiqueta) => asset.tags.includes(etiqueta)),
  );
  if (candidatos.length === 0) return null;
  const indice = Math.abs(semilla) % candidatos.length;
  return candidatos[indice] ?? null;
}

/** Orden de preferencia: lo del dueño primero, el dibujo el último. */
function prioridad(asset: MediaAsset): number {
  switch (asset.usageStatus) {
    case 'user-provided':
      return 0;
    case 'authorized':
      return 1;
    case 'licensed':
      return 2;
    case 'original':
      return 3;
    case 'placeholder':
      return 4;
    default:
      return 9;
  }
}

/** Créditos de una pantalla: lo que hay que pintar al pie si se usa material con licencia. */
export function creditosDe(assets: readonly MediaAsset[]): string[] {
  return [
    ...new Set(
      assets.filter(requiereAtribucion).map((asset) => asset.attribution ?? ''),
    ),
  ].filter(Boolean);
}

/** Resumen para el panel: qué hay, de dónde y con qué permiso. */
export function inventarioDeMedios(): {
  porEstado: Record<string, number>;
  conAtribucion: number;
  /** Con licencia pero sin el crédito puesto: es un fallo, y el panel debe cantarlo. */
  sinCredito: string[];
  total: number;
} {
  const porEstado: Record<string, number> = {};
  for (const asset of MANIFIESTO) {
    porEstado[asset.usageStatus] = (porEstado[asset.usageStatus] ?? 0) + 1;
  }
  return {
    porEstado,
    conAtribucion: MANIFIESTO.filter(
      (asset) => requiereAtribucion(asset) && Boolean(asset.attribution),
    ).length,
    sinCredito: MANIFIESTO.filter(faltaAtribucion).map((asset) => asset.id),
    total: MANIFIESTO.length,
  };
}
