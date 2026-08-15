/**
 * REESCALA LO DESCARGADO A TAMAÑO DE WEB.
 *
 *   node scripts/optimizar-medios.mjs
 *
 * Commons sirve los originales de cámara: el barrido se trajo 43 retratos y 236 MB. Eso no
 * se despliega —ni cabe razonablemente en un repositorio, ni hay ninguna excusa para mandarle
 * cinco megas a un móvil para pintar una cara de 200 píxeles—.
 *
 * Aquí se convierten a WebP en dos tamaños:
 *
 *   · `<nombre>.webp`     640 px de ancho, para la ficha del personaje y las preguntas;
 *   · `<nombre>-mini.webp` 160 px, para listas y marcadores.
 *
 * El recorte es apaisado-vertical centrado en la parte ALTA de la foto, que es donde está la
 * cara en un retrato de alfombra roja. Recortar por el centro geométrico deja medio cuerpo y
 * ninguna cabeza.
 *
 * Los originales se borran después: ya está el informe con su URL si hiciera falta rehacerlo.
 */

import { readdirSync, statSync, unlinkSync } from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

const CARPETA = path.join(process.cwd(), 'public', 'media', 'licensed');
const ORIGINALES = ['.jpg', '.jpeg', '.png'];

const GRANDE = 640;
const MINI = 160;

function humano(bytes) {
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

async function main() {
  const ficheros = readdirSync(CARPETA).filter((fichero) =>
    ORIGINALES.includes(path.extname(fichero).toLowerCase()),
  );

  if (ficheros.length === 0) {
    console.log('\n  No hay originales que optimizar.\n');
    return;
  }

  let antes = 0;
  let despues = 0;

  for (const fichero of ficheros) {
    const origen = path.join(CARPETA, fichero);
    const base = path.basename(fichero, path.extname(fichero));
    antes += statSync(origen).size;

    // `position: 'top'` es lo que salva los retratos: en una foto de alfombra roja la cara
    // está arriba, y un recorte centrado se queda con el torso.
    await sharp(origen)
      .resize(GRANDE, GRANDE, { fit: 'cover', position: 'top' })
      .webp({ quality: 82 })
      .toFile(path.join(CARPETA, `${base}.webp`));

    await sharp(origen)
      .resize(MINI, MINI, { fit: 'cover', position: 'top' })
      .webp({ quality: 78 })
      .toFile(path.join(CARPETA, `${base}-mini.webp`));

    despues +=
      statSync(path.join(CARPETA, `${base}.webp`)).size +
      statSync(path.join(CARPETA, `${base}-mini.webp`)).size;

    unlinkSync(origen);
    console.log(`  ✓ ${base}`);
  }

  console.log('');
  console.log(`  ${ficheros.length} retratos · ${humano(antes)} → ${humano(despues)}`);
  console.log('');
}

await main();
