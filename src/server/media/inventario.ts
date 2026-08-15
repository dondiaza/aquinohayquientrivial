/**
 * INVENTARIO DE MEDIOS — qué hueco está lleno, con qué y con qué permiso.
 *
 * Cruza tres cosas que hasta ahora vivían separadas:
 *
 *   1. `HUECOS`: todos los sitios que la aplicación espera llenar;
 *   2. `public/serie/`: los ficheros que quien tiene los derechos ha dejado caer;
 *   3. `MANIFIESTO`: el material con licencia verificada y el arte original.
 *
 * El resultado es una respuesta a la única pregunta que importa: **¿qué falta, y qué habría
 * que hacer para que dejara de faltar?** Sin esto, «la web está llena de imágenes» es una
 * impresión; con esto es un número que se puede mirar.
 *
 * SOLO SERVIDOR: `imagenDe` lee el disco.
 */

import { imagenDe } from '@/content/imagenes';
import { FAMILIAS, HUECOS, type FamiliaHueco, type Hueco } from '@/content/media/huecos';
import { MANIFIESTO } from '@/content/media/manifiesto';
import { esServible, type MediaAsset } from '@/domain/media/tipos';

/** Cómo está resuelto un hueco ahora mismo. */
export type EstadoHueco =
  | 'aportado' // hay fichero en public/serie: quien tiene los derechos lo puso
  | 'licencia' // hay material con licencia libre verificada en el manifiesto
  | 'original' // lo dibujamos nosotros y está resuelto
  | 'esperando'; // no hay nada: se pinta el arte de reserva y consta que falta

export type FilaInventario = {
  hueco: Hueco;
  estado: EstadoHueco;
  /** Ruta que se sirve, si hay algo real detrás. */
  ruta: string | null;
  /** El asset del manifiesto que lo resuelve, si lo hay. */
  asset: MediaAsset | null;
  /** Qué haría falta para llenarlo. Vacío si ya está. */
  queFalta: string | null;
};

/** Assets del manifiesto indexados por el personaje al que dan cara. */
function porPersonaje(): Map<string, MediaAsset[]> {
  const mapa = new Map<string, MediaAsset[]>();
  for (const asset of MANIFIESTO) {
    if (!esServible(asset)) continue;
    for (const nombre of asset.characters ?? []) {
      const lista = mapa.get(nombre) ?? [];
      lista.push(asset);
      mapa.set(nombre, lista);
    }
  }
  return mapa;
}

/**
 * Qué haría falta para llenar un hueco. Se dice en castellano y en concreto, porque esto lo
 * lee una persona que quiere ayudar, no un programa.
 */
function queFaltaPara(hueco: Hueco): string {
  switch (hueco.origen) {
    case 'commons':
      return `Una fotografía con licencia libre. Prueba: node scripts/barrer-commons.mjs --bajar`;
    case 'propietario':
      return `Material con permiso del titular. Deja el fichero en public/serie/${hueco.id}.webp`;
    case 'original':
      return 'Arte propio pendiente de dibujar.';
    default:
      return 'Sin definir.';
  }
}

export function inventario(): {
  filas: FilaInventario[];
  porFamilia: { familia: FamiliaHueco; label: string; explica: string; total: number; resueltos: number }[];
  resumen: { total: number; aportados: number; conLicencia: number; originales: number; esperando: number };
} {
  const conPersonaje = porPersonaje();

  const filas: FilaInventario[] = HUECOS.map((hueco) => {
    // 1. Lo que ha aportado quien tiene los derechos manda sobre todo lo demás.
    const aportado = imagenDe(hueco.id);
    if (aportado) {
      return { hueco, estado: 'aportado', ruta: aportado, asset: null, queFalta: null };
    }

    // 2. Material con licencia verificada para ese personaje.
    if (hueco.personaje && hueco.id.startsWith('vecinos/')) {
      const candidatos = conPersonaje.get(hueco.personaje) ?? [];
      const conFoto = candidatos.find(
        (asset) => asset.usageStatus === 'licensed' || asset.usageStatus === 'authorized',
      );
      if (conFoto?.localPath) {
        return { hueco, estado: 'licencia', ruta: conFoto.localPath, asset: conFoto, queFalta: null };
      }
    }

    // 3. Lo que dibujamos nosotros ya está resuelto por definición.
    if (hueco.origen === 'original') {
      return { hueco, estado: 'original', ruta: null, asset: null, queFalta: null };
    }

    return { hueco, estado: 'esperando', ruta: null, asset: null, queFalta: queFaltaPara(hueco) };
  });

  const porFamilia = FAMILIAS.map((familia) => {
    const suyas = filas.filter((fila) => fila.hueco.familia === familia.id);
    return {
      familia: familia.id,
      label: familia.label,
      explica: familia.explica,
      total: suyas.length,
      resueltos: suyas.filter((fila) => fila.estado !== 'esperando').length,
    };
  });

  return {
    filas,
    porFamilia,
    resumen: {
      total: filas.length,
      aportados: filas.filter((fila) => fila.estado === 'aportado').length,
      conLicencia: filas.filter((fila) => fila.estado === 'licencia').length,
      originales: filas.filter((fila) => fila.estado === 'original').length,
      esperando: filas.filter((fila) => fila.estado === 'esperando').length,
    },
  };
}
