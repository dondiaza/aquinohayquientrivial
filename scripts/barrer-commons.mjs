/**
 * BARRIDO EXHAUSTIVO DE WIKIMEDIA COMMONS PARA TODO EL REPARTO.
 *
 *   node scripts/barrer-commons.mjs            (solo mira y escribe el informe)
 *   node scripts/barrer-commons.mjs --bajar    (baja lo admisible)
 *
 * ## Qué hace y qué no
 *
 * Recorre el reparto y, por cada intérprete, lee SU CATEGORÍA de Commons. Solo eso: la
 * búsqueda por texto se probó y hubo que quitarla, porque bajaba lápidas y partidos de fútbol
 * para nombres comunes. Ver el comentario de `candidatosDe`.
 *
 * De cada candidato pide la licencia REAL a la API y la compara con la lista blanca. Nada se
 * baja «porque salió en la búsqueda». Además aplica dos filtros que no son de licencia:
 *
 *   · el filtro de marca (logotipos, carteles, carátulas): dominio público en copyright no
 *     es lo mismo que libre en marcas;
 *   · el filtro de retrato útil: descarta escudos, mapas, gráficos, firmas y cualquier cosa
 *     demasiado pequeña para pintar una cara.
 *
 * Lo que sale es `medios/informe-commons.json`: para cada intérprete, qué se ha encontrado,
 * qué se ha admitido y **por qué se ha rechazado cada descarte**. Ese informe es la prueba
 * de que lo que se publica se comprobó, y es lo que se convierte en entradas del manifiesto.
 *
 * Fotogramas, promocionales y carteles NO se buscan aquí: no están en Commons con licencia
 * libre y no lo van a estar. Esos van a la lista de deseos.
 */

import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';

const API = 'https://commons.wikimedia.org/w/api.php';
/**
 * Wikimedia EXIGE un User-Agent que identifique la herramienta y dé una vía de contacto.
 * Sin contacto responde 429 aunque vayas despacio —lo comprobamos: la misma URL da 429 con
 * un agente anónimo y 200 con este—. No es una cuestión de ritmo, es su política de uso.
 */
const AGENTE =
  'DesenganyoVeintiuno/1.0 (https://github.com/dondiaza/aquinohayquientrivial; carlos.diaz@pampling.com) node-fetch';
const DESTINO = path.join(process.cwd(), 'public', 'media', 'licensed');
const INFORME = path.join(process.cwd(), 'medios', 'informe-commons.json');

const BAJAR = process.argv.includes('--bajar');

/**
 * Cuántas fotos se bajan por intérprete.
 *
 * El primer barrido admitía 185 ficheros y los bajaba todos, lo que era maltratar un servicio
 * gratuito para conseguir treinta versiones de la misma alfombra roja. Para lo que hace falta
 * —una cara reconocible en la ficha y otra de repuesto— sobra con dos, y se eligen las de
 * mayor resolución. El resto queda registrado en el informe con su licencia, listo para
 * bajarlo si algún día se necesita.
 */
const POR_INTERPRETE = 2;

/** Los 27 intérpretes, con el personaje al que dan cara. */
const REPARTO = [
  ['José Luis Gil', 'Juan Cuesta'],
  ['Loles León', 'Paloma Hurtado'],
  ['Sofía Nieto', 'Natalia Cuesta'],
  ['Eduardo García', 'José Miguel Cuesta'],
  ['Fernando Tejero', 'Emilio Delgado'],
  ['Eduardo Gómez', 'Mariano Delgado'],
  ['Malena Alterio', 'Belén López Vázquez'],
  ['Laura Pamplona', 'Alicia Sanz'],
  ['María Adánez', 'Lucía Álvarez'],
  ['Daniel Guzmán', 'Roberto Alonso'],
  ['Luis Merlo', 'Mauri Hidalgo'],
  ['Adrià Collado', 'Fernando Navarro'],
  ['Mariví Bilbao', 'Marisa Benito'],
  ['Gemma Cuervo', 'Vicenta Benito'],
  ['Emma Penella', 'Concha'],
  ['Isabel Ordaz', 'Isabel Ruiz'],
  ['Santiago Ramos', 'Andrés Guerra'],
  ['Elio González', 'Pablo Guerra'],
  ['Guillermo Ortega', 'Álex Guerra'],
  ['Mariano Alameda', 'Armando Ruiz'],
  ['Nathalie Seseña', 'Marisa Benito (joven)'],
  ['Eva Isanta', 'Bea Villarejo'],
  ['Guillermo Ortega', 'Paco'],
  ['Roberto San Martín', 'Yago'],
  ['Beatriz Carvajal', 'María Jesús Vázquez'],
  ['Nicolás Dueñas', 'Rafael Álvarez'],
  ['Vanesa Romero', 'Ana'],
  ['Carmen Balagué', 'Nieves Cuesta'],
  ['Ana Rayo', 'Alicia'],
  ['Cristina Castaño', 'Bea'],
  ['Fernando Boza', 'Vicente'],
  ['Emilio Gutiérrez Caba', 'Padre de Juan'],
  ['Antonio Molero', 'Ramón'],
];

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

/** Un logotipo con licencia libre sigue siendo una marca. */
const PALABRAS_DE_MARCA = [
  'logo',
  'logotipo',
  'isotipo',
  'wordmark',
  'brand',
  'cartel',
  'poster',
  'caratula',
  'carátula',
  'portada',
  'dvd',
];

/** Cosas que no son un retrato aunque salgan al buscar a una persona. */
const NO_ES_RETRATO = [
  'coat of arms',
  'escudo',
  'map',
  'mapa',
  'signature',
  'firma',
  'diagram',
  'chart',
  'graph',
  'flag',
  'bandera',
  'plaque',
  'placa conmemorativa',
  'building',
  'edificio',
  'street',
  'calle',
];

const EXTENSIONES = ['.jpg', '.jpeg', '.png', '.webp'];

function slug(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Freno. Commons limita las peticiones anónimas y lo hace en silencio: la primera tanda pasa
 * y a partir de ahí devuelve error. Un barrido de 27 intérpretes son cientos de peticiones,
 * así que se va despacio a propósito —y con reintentos— en vez de castigar un servicio
 * gratuito y llevarse un informe lleno de ceros que parecen «no hay fotos».
 */
const ESPERA_MS = 300;
let ultima = 0;

function dormir(ms) {
  return new Promise((listo) => setTimeout(listo, ms));
}

async function pedir(parametros, intentos = 6) {
  const desde = Date.now() - ultima;
  if (desde < ESPERA_MS) await dormir(ESPERA_MS - desde);
  ultima = Date.now();

  const url = new URL(API);
  for (const [clave, valor] of Object.entries({ format: 'json', ...parametros })) {
    url.searchParams.set(clave, String(valor));
  }

  for (let intento = 1; intento <= intentos; intento += 1) {
    let respuesta;
    try {
      respuesta = await fetch(url, { headers: { 'user-agent': AGENTE } });
    } catch (error) {
      if (intento === intentos) throw error;
      await dormir(600 * intento);
      continue;
    }
    if (respuesta.ok) return respuesta.json();
    // 429 y 5xx son «vuelve luego»; el resto es un error de verdad.
    if (respuesta.status !== 429 && respuesta.status < 500) {
      throw new Error(`Commons ha respondido ${respuesta.status}`);
    }
    if (intento === intentos) throw new Error(`Commons ha respondido ${respuesta.status}`);
    await dormir(2500 * intento);
  }
  throw new Error('agotados los intentos');
}

/**
 * SOLO la categoría personal de Commons. Ni búsqueda por texto ni inventos.
 *
 * La primera versión buscaba también por texto (`list=search`) «para no perder fotos». El
 * resultado, comprobado mirando las imágenes una a una: para «Eduardo García» bajó una
 * lápida, para «Santiago Ramos» un partido de fútbol y para «Elio González» un grabado
 * militar del siglo XIX. Ningún filtro de texto puede arreglar eso, porque el problema no es
 * el filtro: es que **el texto no dice quién sale en la foto**.
 *
 * `Category:Fernando Tejero` sí lo dice. Las categorías de persona en Commons las mantiene
 * gente que mira las fotos, y una foto metida ahí es de esa persona. Es menos material y es
 * material bueno, que es el único que sirve.
 *
 * Si un intérprete no tiene categoría, se queda sin foto y consta en el informe. Preferible
 * a poner la cara de otro.
 */
async function candidatosDe(interprete, avisos) {
  const encontrados = new Set();

  try {
    const datos = await pedir({
      action: 'query',
      list: 'categorymembers',
      cmtitle: `Category:${interprete}`,
      cmtype: 'file',
      cmlimit: '100',
    });
    const miembros = datos?.query?.categorymembers ?? [];
    for (const miembro of miembros) {
      encontrados.add(String(miembro.title).replace(/^File:/, ''));
    }
    if (miembros.length === 0) {
      avisos.push(`sin categoría propia en Commons: se queda sin foto`);
    }
  } catch (error) {
    avisos.push(`categoría «${interprete}»: ${error.message}`);
  }

  return [...encontrados].filter((fichero) =>
    EXTENSIONES.some((extension) => fichero.toLowerCase().endsWith(extension)),
  );
}

/**
 * Metadatos de HASTA 50 ficheros en una sola consulta.
 *
 * Pedirlos de uno en uno eran cientos de peticiones y quince minutos de barrido; la API
 * acepta títulos separados por `|`, así que el barrido entero cabe en unas pocas docenas de
 * consultas. Devuelve un mapa por nombre de fichero porque la respuesta viene indexada por
 * pageid y en otro orden.
 */
async function metadatosDeLote(ficheros) {
  const limpiar = (valor) =>
    typeof valor?.value === 'string' ? valor.value.replace(/<[^>]*>/g, '').trim() : null;

  const mapa = new Map();
  for (let desde = 0; desde < ficheros.length; desde += 50) {
    const tanda = ficheros.slice(desde, desde + 50);
    const datos = await pedir({
      action: 'query',
      titles: tanda.map((fichero) => `File:${fichero}`).join('|'),
      prop: 'imageinfo',
      iiprop: 'url|extmetadata|mime|size',
    });

    for (const pagina of Object.values(datos?.query?.pages ?? {})) {
      const info = pagina?.imageinfo?.[0];
      const nombre = String(pagina?.title ?? '').replace(/^File:/, '');
      if (!info || !nombre) continue;
      const extra = info.extmetadata ?? {};
      mapa.set(nombre, {
        url: info.url,
        mime: info.mime,
        ancho: info.width,
        alto: info.height,
        licenciaCorta: limpiar(extra.LicenseShortName),
        licencia: limpiar(extra.License),
        autor: limpiar(extra.Artist),
        credito: limpiar(extra.Credit),
        descripcion: limpiar(extra.ImageDescription),
        fecha: limpiar(extra.DateTimeOriginal),
        paginaDescripcion: info.descriptionurl,
      });
    }
  }
  return mapa;
}

/**
 * Decide. Devuelve `{ admitido: true }` o `{ admitido: false, motivo }`.
 * El motivo se guarda en el informe: un rechazo sin motivo no sirve para auditar nada.
 */
function juzgar(fichero, metadatos, interprete) {
  const texto = [metadatos.descripcion, metadatos.credito, fichero]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const licencias = [metadatos.licenciaCorta, metadatos.licencia]
    .filter(Boolean)
    .map((valor) => valor.toLowerCase());

  if (licencias.length === 0) {
    return { admitido: false, motivo: 'sin licencia declarada' };
  }
  if (!licencias.some((valor) => ADMITIDAS.some((admitida) => valor.includes(admitida)))) {
    return { admitido: false, motivo: `licencia no admitida: ${metadatos.licenciaCorta}` };
  }
  if (PALABRAS_DE_MARCA.some((palabra) => texto.includes(palabra))) {
    return { admitido: false, motivo: 'parece logotipo, cartel o carátula (problema de marcas)' };
  }
  if (NO_ES_RETRATO.some((palabra) => texto.includes(palabra))) {
    return { admitido: false, motivo: 'no es un retrato (escudo, mapa, firma, edificio…)' };
  }
  if (!String(metadatos.mime ?? '').startsWith('image/')) {
    return { admitido: false, motivo: `no es una imagen (${metadatos.mime})` };
  }
  if ((metadatos.ancho ?? 0) < 260 || (metadatos.alto ?? 0) < 260) {
    return { admitido: false, motivo: `demasiado pequeña (${metadatos.ancho}×${metadatos.alto})` };
  }
  /**
   * ¿Es esta persona?
   *
   * La primera versión aceptaba si CUALQUIER parte del nombre de más de tres letras aparecía
   * en el texto. Con «Eduardo García» eso significa que basta un «garcia» en el pie de foto,
   * y por ahí entraron caras de otras personas: el usuario lo detectó mirando la web, que es
   * el peor sitio donde detectarlo.
   *
   * Ahora hacen falta TODAS las partes significativas del nombre, y se puntúa mejor si el
   * nombre completo está en el propio fichero —que es el indicio fuerte en Commons, donde el
   * nombre del fichero lo pone quien sube la foto—.
   */
  const sinTildes = (valor) => valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const partes = sinTildes(interprete)
    .split(/\s+/)
    .filter((parte) => parte.length >= 3);
  const textoPlano = sinTildes(texto);
  const ficheroPlano = sinTildes(fichero);

  // Que la persona esté ya garantizada por la categoría no quita que dentro de su categoría
  // haya fotos de grupo, carteles de sus obras o su casa. El nombre en el fichero se usa para
  // ORDENAR —primero los retratos que se llaman como ella—, no para admitir o rechazar.
  void textoPlano;
  const enFichero = partes.every((parte) => ficheroPlano.includes(parte));

  return { admitido: true, enFichero };
}

/**
 * La descarga necesita el MISMO freno que la consulta, y en su día no lo tenía.
 *
 * Se veía clarísimo en el primer informe: 185 ficheros pasaban la comprobación de licencia y
 * 179 se descartaban con «no se pudo bajar». No es que el material no sirviera: es que
 * bajábamos a toda velocidad de upload.wikimedia.org y nos cerraban la puerta. Un descarte
 * por estrangulamiento se lee igual que un descarte por licencia en el informe, y eso es
 * justo lo que no puede pasar en el fichero que sirve de prueba de que se comprobó.
 */
async function descargar(url, destino, intentos = 5) {
  for (let intento = 1; intento <= intentos; intento += 1) {
    const desde = Date.now() - ultima;
    if (desde < ESPERA_MS) await dormir(ESPERA_MS - desde);
    ultima = Date.now();

    let respuesta;
    try {
      respuesta = await fetch(url, { headers: { 'user-agent': AGENTE } });
    } catch (error) {
      if (intento === intentos) throw error;
      await dormir(1500 * intento);
      continue;
    }

    if (respuesta.ok && respuesta.body) {
      mkdirSync(path.dirname(destino), { recursive: true });
      await pipeline(respuesta.body, createWriteStream(destino));
      return;
    }
    if (respuesta.status !== 429 && respuesta.status < 500) {
      throw new Error(`descarga ${respuesta.status}`);
    }
    if (intento === intentos) throw new Error(`descarga ${respuesta.status} tras ${intentos} intentos`);
    await dormir(3000 * intento);
  }
}

async function main() {
  const informe = { generadoEl: new Date().toISOString().slice(0, 10), interpretes: [] };
  let admitidosTotales = 0;

  for (const [interprete, personaje] of REPARTO) {
    const avisos = [];
    const candidatos = await candidatosDe(interprete, avisos);
    const entrada = {
      interprete,
      personaje,
      candidatos: candidatos.length,
      admitidos: [],
      descartes: [],
      avisos,
    };

    let porFichero = new Map();
    if (candidatos.length > 0) {
      try {
        porFichero = await metadatosDeLote(candidatos);
      } catch (error) {
        avisos.push(`metadatos: ${error.message}`);
      }
    }

    // Primero se juzga TODO —el informe tiene que dar cuenta de cada candidato—…
    const aptos = [];
    for (const fichero of candidatos) {
      const metadatos = porFichero.get(fichero);
      if (!metadatos) {
        entrada.descartes.push({ fichero, motivo: 'sin metadatos' });
        continue;
      }

      const veredicto = juzgar(fichero, metadatos, interprete);
      if (!veredicto.admitido) {
        entrada.descartes.push({ fichero, motivo: veredicto.motivo });
        continue;
      }
      aptos.push({ fichero, metadatos, enFichero: veredicto.enFichero === true });
    }

    // …y solo después se eligen las mejores y se bajan. A mayor resolución, mejor recorte de
    // cara; a igualdad, el orden es estable por nombre para que dos barridos den lo mismo.
    aptos.sort((a, b) => {
      // El nombre completo en el fichero manda sobre la resolución: más vale una foto de
      // 400 px que SÍ es quien dice ser que una de 4000 px que quizá no.
      if (a.enFichero !== b.enFichero) return a.enFichero ? -1 : 1;
      const areaA = (a.metadatos.ancho ?? 0) * (a.metadatos.alto ?? 0);
      const areaB = (b.metadatos.ancho ?? 0) * (b.metadatos.alto ?? 0);
      return areaB - areaA || a.fichero.localeCompare(b.fichero);
    });

    const elegidos = aptos.slice(0, POR_INTERPRETE);
    for (const sobrante of aptos.slice(POR_INTERPRETE)) {
      entrada.descartes.push({
        fichero: sobrante.fichero,
        motivo: `apto pero no hace falta (ya hay ${POR_INTERPRETE} mejores)`,
        licencia: sobrante.metadatos.licenciaCorta ?? sobrante.metadatos.licencia,
      });
    }

    for (const [indice, { fichero, metadatos }] of elegidos.entries()) {
      const extension = path.extname(fichero).toLowerCase() || '.jpg';
      const local = `${slug(interprete)}${indice > 0 ? `-${indice + 1}` : ''}${extension}`;

      const admitido = {
        fichero,
        localPath: `/media/licensed/${local}`,
        licencia: metadatos.licenciaCorta ?? metadatos.licencia,
        autor: metadatos.autor,
        credito: metadatos.credito,
        descripcion: metadatos.descripcion,
        fecha: metadatos.fecha,
        pagina: metadatos.paginaDescripcion,
        tamano: `${metadatos.ancho}×${metadatos.alto}`,
        url: metadatos.url,
      };

      if (BAJAR) {
        try {
          await descargar(metadatos.url, path.join(DESTINO, local));
          admitido.bajado = true;
        } catch (error) {
          entrada.descartes.push({ fichero, motivo: `no se pudo bajar: ${error.message}` });
          continue;
        }
      }

      entrada.admitidos.push(admitido);
      admitidosTotales += 1;
    }

    informe.interpretes.push(entrada);
    const marca = avisos.length > 0 ? '!' : entrada.admitidos.length > 0 ? '✓' : '·';
    console.log(
      `  ${marca} ${interprete.padEnd(24)} ${String(entrada.admitidos.length).padStart(2)} de ${String(candidatos.length).padStart(3)} candidatos${avisos.length > 0 ? `  (${avisos.length} avisos)` : ''}`,
    );
  }

  mkdirSync(path.dirname(INFORME), { recursive: true });
  writeFileSync(INFORME, `${JSON.stringify(informe, null, 2)}\n`, 'utf8');

  console.log('');
  console.log(`  Admitidos: ${admitidosTotales}`);
  console.log(`  Informe:   medios/informe-commons.json`);
  if (!BAJAR) console.log('  (nada bajado; añade --bajar)');
  console.log('');
}

await main();
