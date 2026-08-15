/**
 * IMPORTA UNA IMAGEN DE WIKIMEDIA COMMONS, COMPROBANDO SU LICENCIA.
 *
 *   node scripts/importar-commons.mjs "Marivi Bilbao.jpg" --personaje "Marisa Benito"
 *   node scripts/importar-commons.mjs "Foo.jpg" --zona porteria
 *   node scripts/importar-commons.mjs --categoria "Malena Alterio"   (lista, no descarga)
 *
 * ## Por qué existe este script
 *
 * En Commons hay material perfectamente reutilizable de los intérpretes de la serie: fotos
 * de festivales y premios con licencia libre. Pero **cada fichero tiene su propia licencia**
 * y mezclarlas es exactamente cómo se acaba publicando algo que no se podía publicar.
 *
 * Así que aquí no se descarga nada «porque está en Commons»: se pregunta a la API por la
 * licencia y el autor, se comprueba contra una lista blanca, y solo entonces se baja el
 * fichero y se imprime la entrada lista para pegar en el manifiesto, con su atribución y su
 * fecha de comprobación.
 *
 * Si la licencia no está en la lista blanca, NO se descarga y se dice por qué.
 *
 * Lo que este script NO hace, a propósito: bajar fotogramas, promocionales o carteles. Eso
 * no está en Commons con licencia libre y no lo va a estar.
 *
 * ## La trampa de los logotipos
 *
 * Commons marca muchos logotipos como dominio público con {{PD-textlogo}}: significa que la
 * FORMA no llega al umbral de originalidad para tener copyright. **No significa que se
 * puedan usar.** Un logotipo sigue siendo una marca registrada, y usar la marca de una
 * serie ajena como identidad de un producto es un problema de marcas, no de copyright.
 *
 * Por eso, además de la licencia, se mira QUÉ es: cualquier cosa que huela a logotipo,
 * marca, cartel o carátula se rechaza aunque su licencia sea impecable.
 */

import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';

const API = 'https://commons.wikimedia.org/w/api.php';
const DESTINO = path.join(process.cwd(), 'public', 'media', 'licensed');

/** Licencias que se aceptan. Cualquier otra cosa se rechaza y se explica. */
const ADMITIDAS = [
  'cc0',
  'public domain',
  'dominio público',
  'pd-self',
  'pd-user',
  'cc-by-2.0',
  'cc-by-3.0',
  'cc-by-4.0',
  'cc-by-sa-2.0',
  'cc-by-sa-2.5',
  'cc-by-sa-3.0',
  'cc-by-sa-4.0',
];

function opcion(nombre) {
  const argumentos = process.argv.slice(2);
  const indice = argumentos.indexOf(`--${nombre}`);
  if (indice === -1) return null;
  const valor = argumentos[indice + 1];
  return valor && !valor.startsWith('--') ? valor : true;
}

function slug(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function pedir(parametros) {
  const url = new URL(API);
  for (const [clave, valor] of Object.entries({ format: 'json', origin: '*', ...parametros })) {
    url.searchParams.set(clave, String(valor));
  }
  const respuesta = await fetch(url, {
    headers: { 'user-agent': 'DesenganyoVeintiuno/1.0 (juego de aficionados; importador de medios)' },
  });
  if (!respuesta.ok) throw new Error(`Commons ha respondido ${respuesta.status}`);
  return respuesta.json();
}

/** Lista los ficheros de una categoría, sin descargar nada. */
async function listarCategoria(nombre) {
  const datos = await pedir({
    action: 'query',
    list: 'categorymembers',
    cmtitle: `Category:${nombre}`,
    cmtype: 'file',
    cmlimit: '100',
  });

  const miembros = datos?.query?.categorymembers ?? [];
  console.log('');
  console.log(`  Ficheros en «${nombre}»: ${miembros.length}`);
  for (const miembro of miembros) {
    console.log(`    · ${String(miembro.title).replace(/^File:/, '')}`);
  }
  console.log('');
  console.log('  Para importar uno:');
  console.log('    node scripts/importar-commons.mjs "<nombre del fichero>" --personaje "<Nombre>"');
  console.log('');
}

/** Metadatos de licencia de un fichero. */
async function metadatosDe(fichero) {
  const datos = await pedir({
    action: 'query',
    titles: `File:${fichero}`,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|mime|size',
  });

  const paginas = datos?.query?.pages ?? {};
  const primera = Object.values(paginas)[0];
  const info = primera?.imageinfo?.[0];
  if (!info) return null;

  const extra = info.extmetadata ?? {};
  const limpiar = (valor) =>
    typeof valor?.value === 'string' ? valor.value.replace(/<[^>]*>/g, '').trim() : null;

  return {
    url: info.url,
    mime: info.mime,
    ancho: info.width,
    alto: info.height,
    licenciaCorta: limpiar(extra.LicenseShortName),
    licencia: limpiar(extra.License),
    autor: limpiar(extra.Artist),
    credito: limpiar(extra.Credit),
    descripcion: limpiar(extra.ImageDescription),
    paginaDescripcion: info.descriptionurl,
  };
}

function esAdmitida(metadatos) {
  const candidatas = [metadatos.licenciaCorta, metadatos.licencia]
    .filter(Boolean)
    .map((valor) => valor.toLowerCase());
  return candidatas.some((valor) => ADMITIDAS.some((admitida) => valor.includes(admitida)));
}

/**
 * Palabras que delatan una marca. Un logotipo con licencia libre de copyright sigue siendo
 * una marca registrada: la licencia dice que puedes copiar el dibujo, no que puedas usarlo
 * como identidad de tu producto.
 */
const PALABRAS_DE_MARCA = [
  'logo',
  'logotipo',
  'isotipo',
  'wordmark',
  'brand',
  'marca',
  'cartel',
  'poster',
  'caratula',
  'carátula',
  'portada',
];

function pareceMarca(metadatos, fichero) {
  const texto = [metadatos.descripcion, metadatos.credito, fichero]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return PALABRAS_DE_MARCA.some((palabra) => texto.includes(palabra));
}

async function descargar(url, destino) {
  const respuesta = await fetch(url, {
    headers: { 'user-agent': 'DesenganyoVeintiuno/1.0 (juego de aficionados; importador de medios)' },
  });
  if (!respuesta.ok || !respuesta.body) throw new Error(`No se ha podido descargar (${respuesta.status})`);
  mkdirSync(path.dirname(destino), { recursive: true });
  await pipeline(respuesta.body, createWriteStream(destino));
}

async function main() {
  const categoria = opcion('categoria');
  if (typeof categoria === 'string') {
    await listarCategoria(categoria);
    return;
  }

  const fichero = process.argv.slice(2).find((argumento) => !argumento.startsWith('--'));
  if (!fichero) {
    console.log('');
    console.log('  Uso:');
    console.log('    node scripts/importar-commons.mjs "<fichero>.jpg" --personaje "Marisa Benito"');
    console.log('    node scripts/importar-commons.mjs --categoria "Malena Alterio"');
    console.log('');
    console.log('  Solo importa material con licencia libre verificable. Lo demás lo rechaza.');
    console.log('');
    process.exitCode = 1;
    return;
  }

  const personaje = opcion('personaje');
  const zona = opcion('zona');

  console.log('');
  console.log(`  Consultando «${fichero}» en Wikimedia Commons…`);

  const metadatos = await metadatosDe(fichero);
  if (!metadatos) {
    console.error('  No existe ese fichero en Commons.');
    process.exitCode = 1;
    return;
  }

  console.log(`  Licencia:  ${metadatos.licenciaCorta ?? metadatos.licencia ?? 'desconocida'}`);
  console.log(`  Autor:     ${metadatos.autor ?? 'desconocido'}`);
  console.log(`  Tamaño:    ${metadatos.ancho}×${metadatos.alto}`);

  if (pareceMarca(metadatos, fichero)) {
    console.log('');
    console.log('  ✗ RECHAZADO: esto parece un logotipo, cartel o carátula.');
    console.log('    Aunque su licencia de copyright sea libre, una marca no se puede usar');
    console.log('    como identidad de otro producto. Dominio público en copyright NO es');
    console.log('    lo mismo que libre en marcas.');
    console.log('');
    console.log(`    Página del fichero: ${metadatos.paginaDescripcion}`);
    console.log('');
    process.exitCode = 1;
    return;
  }

  if (!esAdmitida(metadatos)) {
    console.log('');
    console.log('  ✗ RECHAZADO: esa licencia no está en la lista blanca.');
    console.log('    No se descarga nada. Si crees que se puede usar, léela entera y añádela');
    console.log('    a ADMITIDAS en este script y a LICENCIAS_ADMITIDAS en');
    console.log('    src/domain/media/tipos.ts, con el motivo escrito.');
    console.log('');
    console.log(`    Página del fichero: ${metadatos.paginaDescripcion}`);
    console.log('');
    process.exitCode = 1;
    return;
  }

  const nombreLocal = `${slug(path.basename(fichero, path.extname(fichero)))}${path.extname(fichero).toLowerCase()}`;
  const destino = path.join(DESTINO, nombreLocal);

  if (existsSync(destino)) {
    console.log(`  Ya estaba descargado en ${destino}`);
  } else {
    await descargar(metadatos.url, destino);
    console.log(`  ✓ Descargado en public/media/licensed/${nombreLocal}`);
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const licencia = metadatos.licenciaCorta ?? metadatos.licencia ?? 'desconocida';
  const atribucion = [
    metadatos.autor ? `Foto: ${metadatos.autor}` : null,
    metadatos.credito && metadatos.credito !== metadatos.autor ? metadatos.credito : null,
    licencia,
  ]
    .filter(Boolean)
    .join(' · ');

  console.log('');
  console.log('  Pega esto en CON_LICENCIA de src/content/media/manifiesto.ts:');
  console.log('');
  console.log('  {');
  console.log(`    id: 'commons:${slug(path.basename(fichero, path.extname(fichero)))}',`);
  console.log("    type: 'image',");
  console.log(`    category: '${zona ? 'location' : 'character'}',`);
  console.log(`    title: ${JSON.stringify(metadatos.descripcion?.slice(0, 90) ?? fichero)},`);
  console.log(`    localPath: '/media/licensed/${nombreLocal}',`);
  console.log(`    sourceUrl: ${JSON.stringify(metadatos.paginaDescripcion)},`);
  if (typeof personaje === 'string') {
    console.log(`    characters: [${JSON.stringify(personaje)}],`);
  }
  if (typeof zona === 'string') {
    console.log(`    location: ${JSON.stringify(zona)},`);
  }
  console.log("    tags: ['reparto', 'interprete', 'foto'],");
  console.log("    usageStatus: 'licensed',");
  console.log(`    license: ${JSON.stringify(licencia)},`);
  console.log(`    attribution: ${JSON.stringify(atribucion)},`);
  console.log(`    verifiedAt: '${hoy}',`);
  console.log('  },');
  console.log('');
}

main().catch((error) => {
  console.error('');
  console.error(`  Error: ${error instanceof Error ? error.message : error}`);
  console.error('');
  process.exitCode = 1;
});
