/**
 * DE DÓNDE SALE UNA CARA — la única respuesta.
 *
 * Había tres caminos que hacían casi lo mismo con prioridades ligeramente distintas
 * (`imagenDe(huecoDeVecino(x))`, `getCharacterAssets(x)` e `inventario()`), y el portal usaba
 * dos a la vez. Consecuencia visible: los créditos del pie se quedaban vacíos cuando había
 * material aportado, porque la sección de créditos miraba una fuente y la rejilla otra.
 *
 * Ahora la cascada se resuelve UNA vez, aquí, y devuelve un objeto que dice exactamente qué
 * pintar y qué crédito lleva. Quien lo pinta no decide nada.
 *
 * El orden es el de siempre y no cambia:
 *
 *   1. lo que aportó el propietario en `public/serie/`;
 *   2. una fotografía con licencia verificada y confirmada a ojo;
 *   3. el dibujo original del proyecto.
 *
 * SOLO SERVIDOR: el paso 1 lee el disco.
 */

import { huecoDeVecino, imagenDe } from '@/content/imagenes';
import { PERSONAJES } from '@/content/serie';
import { requiereAtribucion } from '@/domain/media/tipos';

import { getCharacterAssets } from './service';

/** Lo que hay que pintar, ya decidido. */
export type FuenteCara =
  | {
      tipo: 'foto';
      /** Ruta base (400 px). */
      src: string;
      /** Anchuras disponibles para que el navegador elija. */
      srcSet: string;
      alt: string;
      /** Texto de crédito, solo si la licencia lo exige. */
      credito: string | null;
      origen: string | null;
    }
  | { tipo: 'dibujo'; nombre: string; paleta: string };

const PALETA_POR_NOMBRE: ReadonlyMap<string, string> = new Map(
  PERSONAJES.map((personaje) => [personaje.nombre as string, personaje.paleta as string]),
);

/**
 * Compone el `srcset`. El importador genera `-mini` (160), base (400) y `-grande` (800);
 * cuando alguna variante no existe se omite, porque un `srcset` que apunta a un fichero
 * ausente es peor que no tener `srcset`.
 */
function srcSetDe(base: string, variantes: readonly ('mini' | 'grande')[]): string {
  const partes = [`${base} 400w`];
  if (variantes.includes('mini')) {
    partes.unshift(`${base.replace(/\.webp$/, '-mini.webp')} 160w`);
  }
  if (variantes.includes('grande')) {
    partes.push(`${base.replace(/\.webp$/, '-grande.webp')} 800w`);
  }
  return partes.join(', ');
}

/**
 * La cara de un personaje de la serie.
 *
 * Devuelve siempre algo pintable: si no hay foto, el dibujo, que nunca falla.
 */
export function caraDePersonaje(nombre: string): FuenteCara {
  // 1. Aportado por el propietario.
  const propia = imagenDe(huecoDeVecino(nombre));
  if (propia?.endsWith('.webp')) {
    return {
      tipo: 'foto',
      src: propia,
      srcSet: srcSetDe(propia, ['mini', 'grande']),
      alt: `${nombre}, personaje de Aquí no hay quien viva`,
      credito: null,
      origen: null,
    };
  }
  if (propia) {
    return {
      tipo: 'foto',
      src: propia,
      srcSet: propia,
      alt: `${nombre}, personaje de Aquí no hay quien viva`,
      credito: null,
      origen: null,
    };
  }

  // 2. Fotografía con licencia, ya confirmada (el manifiesto solo sirve las confirmadas).
  const conLicencia = getCharacterAssets(nombre).find(
    (asset) => asset.usageStatus === 'licensed' || asset.usageStatus === 'authorized',
  );
  if (conLicencia?.localPath) {
    return {
      tipo: 'foto',
      src: conLicencia.localPath,
      srcSet: srcSetDe(conLicencia.localPath, conLicencia.miniPath ? ['mini'] : []),
      alt: conLicencia.interprete
        ? `${conLicencia.interprete}, intérprete de ${nombre}`
        : conLicencia.title,
      credito: requiereAtribucion(conLicencia) ? (conLicencia.attribution ?? null) : null,
      origen: conLicencia.sourcePage ?? null,
    };
  }

  // 3. El dibujo.
  return { tipo: 'dibujo', nombre, paleta: PALETA_POR_NOMBRE.get(nombre) ?? 'verde' };
}

/** Todas de golpe, para una rejilla. Una sola resolución por personaje. */
export function carasDePersonajes(nombres: readonly string[]): Map<string, FuenteCara> {
  return new Map(nombres.map((nombre) => [nombre, caraDePersonaje(nombre)]));
}

/**
 * Los créditos de un conjunto de caras, sin repetir.
 *
 * Sale de las MISMAS fuentes que se han pintado, que es lo que antes no pasaba: si arriba se
 * ve una foto aportada por el propietario, abajo no aparece un crédito de Commons que no
 * corresponde a nada de lo que se está viendo.
 */
export function creditosDeCaras(caras: Iterable<FuenteCara>): { texto: string; origen: string | null }[] {
  const vistos = new Map<string, string | null>();
  for (const cara of caras) {
    if (cara.tipo !== 'foto' || !cara.credito) continue;
    if (!vistos.has(cara.credito)) vistos.set(cara.credito, cara.origen);
  }
  return [...vistos].map(([texto, origen]) => ({ texto, origen }));
}
