/**
 * CONVIERTE EL INFORME DEL BARRIDO EN ENTRADAS DEL MANIFIESTO.
 *
 *   node scripts/generar-manifiesto-commons.mjs
 *
 * Escribe `src/content/media/commons.ts`. Se GENERA, no se edita a mano: si alguien corrige
 * una atribución en el fichero generado, el siguiente barrido se la lleva por delante. Lo que
 * se corrige es el barrido.
 *
 * La atribución se compone aquí y no en la pantalla, porque es una obligación legal y tiene
 * que viajar pegada al asset: autor, licencia y enlace a la página del fichero. Las CC BY y
 * CC BY-SA no son «gratis», son «gratis citando», y citar mal es no citar.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const INFORME = path.join(process.cwd(), 'medios', 'informe-commons.json');
const SALIDA = path.join(process.cwd(), 'src', 'content', 'media', 'commons.ts');

function texto(valor) {
  return String(valor ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapar(valor) {
  return texto(valor).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** El crédito completo. Si falta el autor se dice, en vez de inventarlo o callarlo. */
function atribucionDe(admitido) {
  const autor = texto(admitido.autor) || 'autor no identificado en Commons';
  const licencia = texto(admitido.licencia) || 'licencia sin identificar';
  return `Foto: ${autor} · ${licencia} · vía Wikimedia Commons`;
}

/** Un título legible. La descripción de Commons suele ser larguísima. */
function tituloDe(admitido, interprete) {
  const descripcion = texto(admitido.descripcion);
  if (descripcion && descripcion.length <= 110) return descripcion;
  const fecha = texto(admitido.fecha).slice(0, 4);
  return fecha ? `${interprete} (${fecha})` : interprete;
}

function main() {
  const informe = JSON.parse(readFileSync(INFORME, 'utf8'));

  /**
   * Un intérprete puede dar cara a DOS personajes —Guillermo Ortega es Álex Guerra y también
   * Paco—. La versión anterior descartaba la segunda aparición por id repetido y con ella se
   * perdía el personaje: Paco se quedaba sin foto teniendo una perfectamente válida.
   *
   * Ahora la foto es una y la lista de personajes es la que crece.
   */
  const porId = new Map();

  for (const bloque of informe.interpretes) {
    for (const admitido of bloque.admitidos) {
      if (!admitido.bajado) continue;
      const id = `commons:${path.basename(admitido.localPath, path.extname(admitido.localPath))}`;

      const yaEstaba = porId.get(id);
      if (yaEstaba) {
        if (!yaEstaba.personajes.includes(bloque.personaje)) {
          yaEstaba.personajes.push(bloque.personaje);
        }
        continue;
      }
      porId.set(id, { id, admitido, interprete: bloque.interprete, personajes: [bloque.personaje] });
    }
  }

  const entradas = [];
  for (const { id, admitido, interprete, personajes } of porId.values()) {
    {
      const bloque = { interprete, personaje: personajes[0] };

      // Lo descargado se optimizó a WebP: el manifiesto apunta a lo que de verdad se sirve.
      const webp = admitido.localPath.replace(/\.(jpe?g|png)$/i, '.webp');

      entradas.push(
        [
          '  {',
          `    id: '${escapar(id)}',`,
          "    type: 'image',",
          "    category: 'character',",
          `    title: '${escapar(tituloDe(admitido, bloque.interprete))}',`,
          `    localPath: '${escapar(webp)}',`,
          `    miniPath: '${escapar(webp.replace(/\.webp$/, '-mini.webp'))}',`,
          `    sourceUrl: '${escapar(admitido.pagina)}',`,
          `    sourcePage: '${escapar(admitido.pagina)}',`,
          `    characters: [${personajes.map((nombre) => `'${escapar(nombre)}'`).join(', ')}],`,
          `    interprete: '${escapar(bloque.interprete)}',`,
          `    tags: ['personaje', 'reparto', '${escapar(bloque.interprete.toLowerCase())}'],`,
          "    usageStatus: 'licensed',",
          `    license: '${escapar(admitido.licencia)}',`,
          `    attribution: '${escapar(atribucionDe(admitido))}',`,
          `    verifiedAt: '${escapar(informe.generadoEl)}',`,
          '  },',
        ].join('\n'),
      );
    }
  }

  const cabecera = `/**
 * RETRATOS REALES DEL REPARTO, CON LICENCIA VERIFICADA.
 *
 * FICHERO GENERADO — no editar a mano.
 *   node scripts/barrer-commons.mjs --bajar
 *   node scripts/optimizar-medios.mjs
 *   node scripts/generar-manifiesto-commons.mjs
 *
 * Cada entrada es una fotografía real de un intérprete de la serie que estaba en Wikimedia
 * Commons bajo una licencia de la lista blanca. De cada una se comprobó la licencia con la
 * API antes de descargarla, y su atribución viaja aquí pegada porque las CC BY y CC BY-SA
 * obligan a citar: son gratis citando, no gratis.
 *
 * Lo que NO hay aquí, y no es un descuido: fotogramas, promocionales, carteles y el logotipo
 * de la serie. Ese material tiene dueño y no se publica sin permiso. Sus huecos están
 * declarados en \`huecos.ts\` esperando, con arte propio detrás mientras tanto.
 *
 * Generado el ${new Date().toISOString().slice(0, 10)} · ${entradas.length} retratos.
 */

import type { MediaAsset } from '@/domain/media/tipos';

export const RETRATOS_COMMONS: readonly MediaAsset[] = [
`;

  writeFileSync(SALIDA, `${cabecera}${entradas.join('\n')}\n];\n`, 'utf8');
  console.log(`\n  ${entradas.length} retratos escritos en src/content/media/commons.ts\n`);
}

main();
