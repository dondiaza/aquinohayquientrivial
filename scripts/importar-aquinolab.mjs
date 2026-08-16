/**
 * TRAE LAS IMÁGENES DE AQUINOLAB Y LAS DEJA LISTAS PARA LA WEB.
 *
 *   node scripts/importar-aquinolab.mjs ../aquinolab
 *
 * Copia los retratos de personaje y la fachada, los normaliza y genera las tres anchuras que
 * usa la web. El propietario del proyecto decidió publicarlas; la procedencia de cada una
 * está registrada en la lista de deseos y el aviso de no afiliación se pinta junto a ellas.
 *
 * ## El recorte, que es lo que costó
 *
 * La primera versión recortaba a cuadrado con `position: 'top'`, dando por hecho que la cara
 * está arriba. En un retrato de estudio vale; en un fotograma apaisado de escena, no: catorce
 * de las veintiocho imágenes son 1280×720 o 728×400, y ahí el recorte cuadrado se quedaba con
 * la nuca de otro personaje. Se veía en Juan Cuesta —que es el que abre la portada—, en Belén
 * y en Lucía.
 *
 * Ahora se usa `sharp.strategy.attention`, que busca la región de mayor interés visual en vez
 * de suponer dónde está. Para las que aun así queden mal existe `ENCUADRES`, una tabla de
 * recortes a mano: cuando el automatismo falla, la respuesta es una excepción declarada, no
 * un algoritmo más complicado.
 *
 * ## Tres anchuras
 *
 * 160 para listas y marcadores, 400 para fichas, 800 para la tele y el modo galería. Servir
 * 400 px donde se pintan 28 era bajarse catorce veces los píxeles necesarios.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

const origenRaiz = process.argv[2];

if (!origenRaiz) {
  console.log('\n  Uso:  node scripts/importar-aquinolab.mjs <ruta al repo aquinolab>\n');
  process.exit(1);
}

const ORIGEN = path.resolve(origenRaiz, 'public', 'anhqv');
const VECINOS = path.join(process.cwd(), 'public', 'serie', 'vecinos');
const PORTAL = path.join(process.cwd(), 'public', 'serie', 'portal');

if (!existsSync(ORIGEN)) {
  console.error(`\n  No encuentro ${ORIGEN}\n`);
  process.exit(1);
}

/**
 * Los nombres de AQUINOLAB no son los del catálogo: allí `paloma-cuesta`, aquí
 * `paloma-hurtado`. Se traducen a mano porque son veintitantos y adivinarlo con parecidos de
 * cadena es cómo se acaba poniendo la cara de uno en la ficha de otro.
 */
const EQUIVALENCIAS = {
  'juan-cuesta': 'juan-cuesta',
  'paloma-cuesta': 'paloma-hurtado',
  'natalia-cuesta': 'natalia-cuesta',
  'josemi-cuesta': 'jose-miguel-cuesta',
  'nieves-cuesta': 'nieves-cuesta',
  'emilio-delgado': 'emilio-delgado',
  'mariano-delgado': 'mariano-delgado',
  'belen-lopez': 'belen-lopez-vazquez',
  'alicia-sanz': 'alicia-sanz',
  'lucia-alvarez': 'lucia-alvarez',
  'roberto-alonso': 'roberto-alonso',
  'mauri-hidalgo': 'mauri-hidalgo',
  'fernando-navarro': 'fernando-navarro',
  'marisa-benito': 'marisa-benito',
  'vicenta-benito': 'vicenta-benito',
  'concha-de-la-fuente': 'concha',
  'isabel-la-hierbas': 'isabel-ruiz',
  'andres-guerra': 'andres-guerra',
  'pablo-guerra': 'pablo-guerra',
  'alex-guerra': 'alex-guerra',
  'armando-rubio': 'armando-ruiz',
  'bea-villarejo': 'bea-villarejo',
  'yago-castro': 'yago',
  'maria-jesus-torrijas': 'maria-jesus-vazquez',
  'ana-inga': 'ana',
  paco: 'paco',
  'carlos-de-haro': 'carlos-de-haro',
  'higinio-heredia': 'higinio-heredia',
};

/**
 * Recortes a mano, en fracciones del original (0–1), para las que el recorte automático no
 * resuelve bien. Se añaden mirando el resultado, que es la única forma honesta de saberlo.
 */
const ENCUADRES = {
  // Plano de dos: Juan a la izquierda, la nuca de José Miguel a la derecha.
  'juan-cuesta': { izquierda: 0.04, arriba: 0.0, ancho: 0.52 },
  // Belén a la izquierda, con otro personaje entrando por la derecha.
  'belen-lopez-vazquez': { izquierda: 0.04, arriba: 0.0, ancho: 0.52 },
  // Lucía a la izquierda; a la derecha, la nuca de Roberto.
  'lucia-alvarez': { izquierda: 0.02, arriba: 0.0, ancho: 0.5 },
  // Firma de libros con cuatro personas en una mesa: Mariano es el del extremo derecho.
  'mariano-delgado': { izquierda: 0.7, arriba: 0.0, ancho: 0.3 },
  // Marisa y Vicenta comparten el mismo fotograma en la puerta: una a cada lado.
  'marisa-benito': { izquierda: 0.16, arriba: 0.06, ancho: 0.34 },
  'vicenta-benito': { izquierda: 0.44, arriba: 0.06, ancho: 0.32 },
  // Yago al centro-izquierda; a la derecha una nuca y abajo la marca de agua de FormulaTV,
  // que el recorte cuadrado desde arriba deja fuera.
  yago: { izquierda: 0.26, arriba: 0.0, ancho: 0.42 },
};

const ANCHURAS = [
  { sufijo: '-mini', lado: 160, calidad: 78 },
  { sufijo: '', lado: 400, calidad: 82 },
  { sufijo: '-grande', lado: 800, calidad: 80 },
];

function humano(bytes) {
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

/** Recorta a cuadrado: con encuadre declarado si lo hay, y si no por atención. */
async function aCuadrado(origen, destinoBase, nombre) {
  const encuadre = ENCUADRES[nombre];
  let base = sharp(origen);

  if (encuadre) {
    const meta = await sharp(origen).metadata();
    const anchoTotal = meta.width ?? 0;
    const altoTotal = meta.height ?? 0;
    const ancho = Math.round(anchoTotal * encuadre.ancho);
    const lado = Math.min(ancho, altoTotal);
    base = sharp(origen).extract({
      left: Math.max(0, Math.min(anchoTotal - lado, Math.round(anchoTotal * encuadre.izquierda))),
      top: Math.max(0, Math.min(altoTotal - lado, Math.round(altoTotal * encuadre.arriba))),
      width: lado,
      height: lado,
    });
  }

  const buffer = await base.toBuffer();
  let escritos = 0;

  for (const { sufijo, lado, calidad } of ANCHURAS) {
    const salida = await sharp(buffer)
      .resize(lado, lado, {
        fit: 'cover',
        // Sin encuadre declarado: que sharp busque dónde está lo interesante.
        position: encuadre ? 'centre' : sharp.strategy.attention,
      })
      .webp({ quality: calidad })
      .toBuffer();
    writeFileSync(`${destinoBase}${sufijo}.webp`, salida);
    escritos += salida.length;
  }

  return escritos;
}

async function main() {
  const atribucion = path.join(ORIGEN, 'ATTRIBUTION.md');
  if (existsSync(atribucion) && /obtain the appropriate rights/i.test(readFileSync(atribucion, 'utf8'))) {
    console.log('');
    console.log('  ℹ  El ATTRIBUTION.md de origen recuerda que hay que obtener derechos antes');
    console.log('     de distribuir públicamente. La procedencia está registrada en');
    console.log('     src/content/media/wishlist.ts y el aviso de no afiliación se pinta');
    console.log('     junto a las caras.');
  }

  mkdirSync(VECINOS, { recursive: true });
  mkdirSync(PORTAL, { recursive: true });

  // Se limpia antes: si un nombre cambia, no queremos el fichero viejo suelto.
  for (const fichero of readdirSync(VECINOS)) {
    if (fichero.endsWith('.webp')) rmSync(path.join(VECINOS, fichero));
  }

  let copiados = 0;
  let antes = 0;
  let despues = 0;
  const sinEquivalencia = [];

  for (const fichero of readdirSync(ORIGEN)) {
    if (fichero.toLowerCase().endsWith('.md')) continue;
    const base = path.basename(fichero, path.extname(fichero));
    const origen = path.join(ORIGEN, fichero);

    if (base === 'desengano-21') {
      // La fachada va apaisada, no cuadrada.
      antes += readFileSync(origen).length;
      const ancha = await sharp(origen).resize(1600, 700, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();
      writeFileSync(path.join(PORTAL, 'fachada.webp'), ancha);
      despues += ancha.length;
      copiados += 1;
      continue;
    }

    const destino = EQUIVALENCIAS[base];
    if (!destino) {
      sinEquivalencia.push(base);
      continue;
    }

    antes += readFileSync(origen).length;
    despues += await aCuadrado(origen, path.join(VECINOS, destino), destino);
    copiados += 1;
  }

  console.log('');
  console.log(`  ${copiados} imágenes · ${humano(antes)} → ${humano(despues)} en tres anchuras`);
  console.log(`  Encuadre a mano en: ${Object.keys(ENCUADRES).join(', ')}`);
  if (sinEquivalencia.length > 0) {
    console.log(`  Sin equivalencia en el catálogo: ${sinEquivalencia.join(', ')}`);
  }
  console.log('');
}

await main();
