/**
 * HUECOS DE IMAGEN DE LA SERIE.
 *
 * La web se puede ilustrar con material de la serie, pero ese material tiene dueño: los
 * fotogramas, promocionales y logotipos de *Aquí no hay quien viva* son de Antena 3 y de
 * la productora, y no se pueden empaquetar en un repositorio ni servir desde un dominio
 * propio sin licencia. Así que no van dentro.
 *
 * En su lugar hay un sistema de HUECOS: cada sitio de la web que pide una imagen declara
 * un hueco con un nombre fijo. Si existe un fichero para ese hueco en `public/serie/`, se
 * usa; si no, se dibuja el arte ORIGINAL del proyecto (SVG/CSS), que es lo que se
 * despliega por defecto. La web está completa sin una sola imagen ajena, y con licencia
 * en la mano basta con copiar los ficheros y volver a desplegar.
 *
 * Instrucciones para quien tenga los derechos: `public/serie/LEEME.md`.
 *
 * SOLO SERVIDOR: se lee el disco al arrancar. No importar desde un componente de cliente.
 */

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Extensiones admitidas, en orden de preferencia. */
const EXTENSIONES = ['webp', 'avif', 'jpg', 'jpeg', 'png', 'svg'] as const;

const CARPETA_PUBLICA = 'serie';

/**
 * Ficheros presentes bajo `public/serie/`, como rutas relativas («vecinos/juan-cuesta.webp»).
 * Se calcula una vez: en producción la carpeta no cambia sin volver a despliegar.
 */
const PRESENTES: ReadonlySet<string> = (() => {
  const encontrados = new Set<string>();
  const raiz = join(process.cwd(), 'public', CARPETA_PUBLICA);

  const recorrer = (relativa: string, profundidad: number): void => {
    if (profundidad > 2) return;
    let entradas;
    try {
      entradas = readdirSync(relativa ? join(raiz, relativa) : raiz, { withFileTypes: true });
    } catch {
      // Sin carpeta (o sin permisos): la web se dibuja entera con arte propio.
      return;
    }
    for (const entrada of entradas) {
      const ruta = relativa ? `${relativa}/${entrada.name}` : entrada.name;
      if (entrada.isDirectory()) recorrer(ruta, profundidad + 1);
      else encontrados.add(ruta);
    }
  };

  recorrer('', 0);
  return encontrados;
})();

/** Nombre de fichero seguro a partir de un texto libre. */
export function slug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Ruta pública de la imagen de un hueco, o null si no hay fichero.
 * `hueco` es la ruta sin extensión: «vecinos/juan-cuesta», «zonas/2-a», «portal/fachada».
 */
export function imagenDe(hueco: string): string | null {
  for (const extension of EXTENSIONES) {
    const candidato = `${hueco}.${extension}`;
    if (PRESENTES.has(candidato)) return `/${CARPETA_PUBLICA}/${candidato}`;
  }
  avisarSiAparecio(hueco);
  return null;
}

/**
 * En DESARROLLO, avisa si el fichero está en disco pero no en la lista.
 *
 * `PRESENTES` se calcula una sola vez al cargar el módulo, y eso está bien: en producción la
 * carpeta no cambia sin volver a desplegar. Lo que no está bien es el silencio — copié la
 * fachada, recargué, y la web seguía sin verla. Media hora buscando un fallo en el código
 * cuando lo único que pasaba era que el servidor se había arrancado antes que el fichero.
 *
 * En producción no hace nada: allí tocar el disco en cada fallo sería absurdo.
 */
const YA_AVISADOS = new Set<string>();

function avisarSiAparecio(hueco: string): void {
  if (process.env.NODE_ENV === 'production') return;
  if (YA_AVISADOS.has(hueco)) return;

  for (const extension of EXTENSIONES) {
    const ruta = join(process.cwd(), 'public', CARPETA_PUBLICA, `${hueco}.${extension}`);
    if (!existsSync(ruta)) continue;
    YA_AVISADOS.add(hueco);
    console.warn(
      `[imagenes] «${hueco}.${extension}» está en disco pero no en el índice: se leyó al ` +
        'arrancar. Reinicia el servidor para que aparezca.',
    );
    return;
  }
}

export function huecoDeVecino(nombre: string): string {
  return `vecinos/${slug(nombre)}`;
}

export function huecoDeZona(etiqueta: string): string {
  return `zonas/${slug(etiqueta)}`;
}

/** Cuántos huecos hay cubiertos: se muestra en el aviso de la web y en el panel. */
export function resumenDeImagenes(): { ficheros: number; vecinos: number; zonas: number } {
  const rutas = [...PRESENTES];
  return {
    ficheros: rutas.length,
    vecinos: rutas.filter((ruta) => ruta.startsWith('vecinos/')).length,
    zonas: rutas.filter((ruta) => ruta.startsWith('zonas/')).length,
  };
}
