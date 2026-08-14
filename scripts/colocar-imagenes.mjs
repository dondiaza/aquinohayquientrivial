/**
 * COLOCA TUS IMÁGENES EN LOS HUECOS DE LA WEB.
 *
 *   node scripts/colocar-imagenes.mjs <carpeta-con-tus-imagenes> [--mover] [--forzar]
 *
 * Este script NO descarga nada de internet. Trabaja con ficheros que TÚ ya tienes en el
 * disco y de los que tienes derecho a disponer: los renombra al nombre que la web espera y
 * los copia a `public/serie/`. El porqué de todo esto está en `public/serie/LEEME.md`:
 * los fotogramas y promocionales de la serie son de Antena 3 y de la productora, así que no
 * viven en el repositorio, pero la web tiene un hueco preparado para cada uno.
 *
 * Cómo empareja: normaliza el nombre del fichero (minúsculas, sin tildes, sin separadores)
 * y lo compara con los huecos conocidos. «Juan Cuesta.jpg», «juan_cuesta.JPG» y
 * «JuanCuesta-01.webp» van todos a `vecinos/juan-cuesta.<ext>`.
 *
 * Lo que no reconoce NO lo toca ni lo borra: lo lista al final para que lo coloques a mano.
 *
 * Opciones:
 *   --mover    mueve en lugar de copiar
 *   --forzar   sobrescribe un hueco que ya estuviera cubierto
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, statSync } from 'node:fs';
import path from 'node:path';

const EXTENSIONES = new Set(['.webp', '.avif', '.jpg', '.jpeg', '.png', '.svg']);

const RAIZ = process.cwd();
const DESTINO = path.join(RAIZ, 'public', 'serie');

/** Los 27 vecinos de la biblia, en el mismo orden que src/content/serie.ts. */
const VECINOS = [
  'Juan Cuesta',
  'Paloma Hurtado',
  'Natalia Cuesta',
  'José Miguel Cuesta',
  'Emilio Delgado',
  'Mariano Delgado',
  'Belén López Vázquez',
  'Alicia Sanz',
  'Lucía Álvarez',
  'Roberto Alonso',
  'Mauri Hidalgo',
  'Fernando Navarro',
  'Marisa Benito',
  'Vicenta Benito',
  'Concha',
  'Isabel Ruiz',
  'Andrés Guerra',
  'Pablo Guerra',
  'Álex Guerra',
  'Bea Villarejo',
  'Paco',
  'Yago',
  'María Jesús Vázquez',
  'Rafael Álvarez',
  'Ana',
  'Nieves Cuesta',
];

const ZONAS = ['1.º A', '1.º B', '2.º A', '2.º B', '3.º A', '3.º B', 'Portería', 'Videoclub', 'Ático'];

const PORTAL = ['fachada', 'portal interior'];

function slug(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Clave de comparación: solo letras y números, para que dé igual cómo separes. */
function clave(texto) {
  return slug(texto).replace(/-/g, '');
}

/** Todos los huecos que la web sabe usar. */
function huecos() {
  const lista = [];
  for (const vecino of VECINOS) lista.push({ carpeta: 'vecinos', slug: slug(vecino), etiqueta: vecino });
  for (const zona of ZONAS) lista.push({ carpeta: 'zonas', slug: slug(zona), etiqueta: zona });
  for (const pieza of PORTAL) lista.push({ carpeta: 'portal', slug: slug(pieza), etiqueta: pieza });
  return lista;
}

/** Busca el hueco de un nombre de fichero. Admite sufijos: «juan-cuesta-2.jpg» vale. */
function huecoDe(nombreFichero, catalogo) {
  const base = clave(path.basename(nombreFichero, path.extname(nombreFichero)));
  if (!base) return null;

  // Coincidencia exacta primero, luego «empieza por» (para los sufijos numéricos).
  const exacto = catalogo.find((hueco) => clave(hueco.slug) === base);
  if (exacto) return exacto;

  const candidatos = catalogo
    .filter((hueco) => base.startsWith(clave(hueco.slug)))
    .sort((a, b) => clave(b.slug).length - clave(a.slug).length);

  return candidatos[0] ?? null;
}

function main() {
  const argumentos = process.argv.slice(2);
  const origen = argumentos.find((argumento) => !argumento.startsWith('--'));
  const mover = argumentos.includes('--mover');
  const forzar = argumentos.includes('--forzar');

  if (!origen) {
    console.log('');
    console.log('  Uso: node scripts/colocar-imagenes.mjs <carpeta> [--mover] [--forzar]');
    console.log('');
    console.log('  Coloca tus imágenes en los huecos de public/serie/.');
    console.log('  Instrucciones y lista de huecos: public/serie/LEEME.md');
    console.log('');
    process.exitCode = 1;
    return;
  }

  const carpeta = path.resolve(origen);
  if (!existsSync(carpeta) || !statSync(carpeta).isDirectory()) {
    console.error(`  No encuentro la carpeta: ${carpeta}`);
    process.exitCode = 1;
    return;
  }

  const catalogo = huecos();
  const colocados = [];
  const saltados = [];
  const sinReconocer = [];

  for (const entrada of readdirSync(carpeta, { withFileTypes: true })) {
    if (!entrada.isFile()) continue;
    const extension = path.extname(entrada.name).toLowerCase();
    if (!EXTENSIONES.has(extension)) continue;

    const hueco = huecoDe(entrada.name, catalogo);
    if (!hueco) {
      sinReconocer.push(entrada.name);
      continue;
    }

    const carpetaDestino = path.join(DESTINO, hueco.carpeta);
    mkdirSync(carpetaDestino, { recursive: true });
    const rutaDestino = path.join(carpetaDestino, `${hueco.slug}${extension}`);

    const yaHabia = EXTENSIONES.has(extension)
      ? [...EXTENSIONES].some((otra) =>
          existsSync(path.join(carpetaDestino, `${hueco.slug}${otra}`)),
        )
      : false;

    if (yaHabia && !forzar) {
      saltados.push(`${hueco.carpeta}/${hueco.slug} (ya cubierto)`);
      continue;
    }

    const rutaOrigen = path.join(carpeta, entrada.name);
    if (mover) renameSync(rutaOrigen, rutaDestino);
    else copyFileSync(rutaOrigen, rutaDestino);

    colocados.push(`${entrada.name}  →  serie/${hueco.carpeta}/${hueco.slug}${extension}`);
  }

  const cubiertos = catalogo.filter((hueco) =>
    [...EXTENSIONES].some((extension) =>
      existsSync(path.join(DESTINO, hueco.carpeta, `${hueco.slug}${extension}`)),
    ),
  );

  console.log('');
  console.log(`  Colocadas: ${colocados.length}`);
  for (const linea of colocados) console.log(`    · ${linea}`);

  if (saltados.length > 0) {
    console.log('');
    console.log(`  Saltadas (usa --forzar para sobrescribir): ${saltados.length}`);
    for (const linea of saltados) console.log(`    · ${linea}`);
  }

  if (sinReconocer.length > 0) {
    console.log('');
    console.log(`  No sé dónde van (colócalas a mano): ${sinReconocer.length}`);
    for (const linea of sinReconocer) console.log(`    · ${linea}`);
    console.log('    Los nombres de hueco válidos están en public/serie/LEEME.md');
  }

  const faltan = catalogo.filter((hueco) => !cubiertos.includes(hueco));
  console.log('');
  console.log(`  Huecos cubiertos: ${cubiertos.length} de ${catalogo.length}`);
  if (faltan.length > 0 && faltan.length <= 40) {
    console.log('  Siguen dibujados:');
    for (const hueco of faltan) console.log(`    · ${hueco.carpeta}/${hueco.slug} — ${hueco.etiqueta}`);
  }
  console.log('');
  console.log('  Recuerda: la web funciona igual sin ninguna imagen. Lo que pongas aquí');
  console.log('  sustituye al dibujo original; si lo borras, vuelve el dibujo.');
  console.log('');
}

main();
