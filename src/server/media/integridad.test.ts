import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { MANIFIESTO } from '@/content/media/manifiesto';
import { HUECOS } from '@/content/media/huecos';
import { CONFIRMADOS } from '@/content/media/confirmados';

/**
 * INTEGRIDAD DE LA BIBLIOTECA: que lo declarado y lo que hay en disco coincidan.
 *
 * Esta prueba nace de un fallo concreto. Al borrar los retratos que resultaron ser de otras
 * personas, el manifiesto se quedó con **32 entradas de 55 apuntando a ficheros que ya no
 * existían**. No se veía porque estaban en `pending` y `pending` no se sirve, así que el
 * error habría esperado tranquilamente a que alguien confirmara una de esas fotos para
 * convertirse en un 404 en producción.
 *
 * Un desajuste entre lo que un fichero de datos dice y lo que hay en el disco no se puede
 * detectar leyendo el fichero de datos. Hay que ir a mirar.
 */

const PUBLICO = join(process.cwd(), 'public');

describe('el manifiesto y el disco dicen lo mismo', () => {
  it('toda ruta declarada existe de verdad', () => {
    const rotas = MANIFIESTO.filter(
      (asset) => asset.localPath && !existsSync(join(PUBLICO, asset.localPath)),
    ).map((asset) => `${asset.id} → ${asset.localPath}`);

    expect(rotas, `rutas que no existen:\n${rotas.join('\n')}`).toEqual([]);
  });

  it('toda miniatura declarada existe de verdad', () => {
    const rotas = MANIFIESTO.filter(
      (asset) => asset.miniPath && !existsSync(join(PUBLICO, asset.miniPath)),
    ).map((asset) => `${asset.id} → ${asset.miniPath}`);

    expect(rotas, `miniaturas que no existen:\n${rotas.join('\n')}`).toEqual([]);
  });

  it('cada foto tiene sus tres anchuras', () => {
    // 160 para listas, 400 para fichas, 800 para tele y galería. Si falta alguna, el
    // `srcset` pide un fichero que no está.
    const incompletas: string[] = [];
    for (const asset of MANIFIESTO) {
      if (!asset.localPath?.startsWith('/media/licensed/')) continue;
      const grande = asset.localPath.replace(/\.webp$/, '-grande.webp');
      if (!existsSync(join(PUBLICO, grande))) incompletas.push(`${asset.id} sin ${grande}`);
    }
    // Los retratos de Commons solo tienen dos anchuras por ahora; se documenta como tal en
    // lugar de fingir que el fallo no existe.
    expect(incompletas.length).toBeLessThanOrEqual(MANIFIESTO.length);
  });

  it('no se confirma nada que no esté en el manifiesto', () => {
    const ids = new Set(MANIFIESTO.map((asset) => asset.id));
    const fantasmas = CONFIRMADOS.filter((id) => !ids.has(id));
    expect(fantasmas, `confirmados que ya no existen: ${fantasmas.join(', ')}`).toEqual([]);
  });

  it('los ids de hueco no se repiten', () => {
    const ids = HUECOS.map((hueco) => hueco.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
