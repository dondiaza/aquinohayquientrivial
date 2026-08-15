/**
 * TRAE LAS IMÁGENES DE AQUINOLAB — SOLO PARA VERLAS EN LOCAL.
 *
 *   node scripts/importar-aquinolab.mjs ../aquinolab
 *
 * ## Por qué no se despliegan
 *
 * El `ATTRIBUTION.md` de AQUINOLAB dice de dónde salen sus imágenes y bajo qué condición.
 * Son fotogramas de la serie y promocionales de Atresmedia recogidos de FormulaTV, GQ,
 * 20minutos, La Vanguardia y Fandom, y el propio fichero termina así:
 *
 *   «These frames and promotional assets are used as editorial references in a local
 *    prototype. Obtain the appropriate rights before any public or commercial distribution.»
 *
 * Es decir: el proyecto que las reunió ya dejó escrito que valen en local y no para publicar.
 * Este script respeta exactamente eso. Copia las imágenes a `public/serie/`, que está
 * gitignorada, así que:
 *
 *   · en `npm run dev` la web se ve con las caras de la serie, que es para lo que se quieren;
 *   · `git status` sigue limpio y el deploy no las lleva.
 *
 * El día que haya autorización de Atresmedia, se quita la regla del .gitignore y ya está.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const origenRaiz = process.argv[2];

if (!origenRaiz) {
  console.log('\n  Uso:  node scripts/importar-aquinolab.mjs <ruta al repo aquinolab>\n');
  process.exit(1);
}

const ORIGEN = path.resolve(origenRaiz, 'public', 'anhqv');
const DESTINO = path.join(process.cwd(), 'public', 'serie', 'vecinos');

if (!existsSync(ORIGEN)) {
  console.error(`\n  No encuentro ${ORIGEN}\n`);
  process.exit(1);
}

/**
 * Los nombres de AQUINOLAB no son los del catálogo de esta web: allí `paloma-cuesta`, aquí
 * `paloma-hurtado`; allí `belen-lopez`, aquí `belen-lopez-vazquez`. Se traducen a mano porque
 * son veintitantos y adivinarlo con parecidos de cadena es cómo se acaba poniendo la cara de
 * uno en la ficha de otro, que es justo el problema del que venimos.
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
  'paco': 'paco',
  'carlos-de-haro': 'carlos-de-haro',
  'higinio-heredia': 'higinio-heredia',
};

function main() {
  const atribucion = path.join(ORIGEN, 'ATTRIBUTION.md');
  if (existsSync(atribucion)) {
    const texto = readFileSync(atribucion, 'utf8');
    if (/obtain the appropriate rights/i.test(texto)) {
      console.log('');
      console.log('  ⚠  El ATTRIBUTION.md de origen advierte:');
      console.log('     «Obtain the appropriate rights before any public or commercial');
      console.log('      distribution.»');
      console.log('     Por eso esto va a public/serie/, que está gitignorada. NO se despliega.');
    }
  }

  mkdirSync(DESTINO, { recursive: true });

  let copiados = 0;
  const sinEquivalencia = [];

  for (const fichero of readdirSync(ORIGEN)) {
    if (fichero.toLowerCase().endsWith('.md')) continue;
    const base = path.basename(fichero, path.extname(fichero));
    const destino = EQUIVALENCIAS[base];
    if (!destino) {
      sinEquivalencia.push(base);
      continue;
    }
    // La extensión miente en el origen (hay .jpg que son WebP y PNG). Se conserva el nombre
    // con .jpg porque `imagenDe` prueba extensiones y el navegador va por el contenido.
    copyFileSync(path.join(ORIGEN, fichero), path.join(DESTINO, `${destino}.jpg`));
    copiados += 1;
  }

  console.log('');
  console.log(`  ${copiados} imágenes copiadas a public/serie/vecinos/ (solo local)`);
  if (sinEquivalencia.length > 0) {
    console.log(`  Sin equivalencia en el catálogo: ${sinEquivalencia.join(', ')}`);
  }
  console.log('');
  console.log('  Arranca `npm run dev` y las verás. `git status` sigue limpio.');
  console.log('');
}

main();
