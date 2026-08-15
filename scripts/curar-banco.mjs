/**
 * CURACIÓN DEL BANCO — arregla lo que encontró la auditoría.
 *
 *   node scripts/auditar-banco.mjs     (ver qué hay)
 *   node scripts/curar-banco.mjs       (arreglarlo)
 *   node scripts/auditar-banco.mjs     (comprobar que ya no está)
 *
 * Reescribe `preguntas.json` y `pruebas.json`. Es determinista: pasarlo dos veces da lo mismo,
 * así que se puede volver a ejecutar cuando llegue contenido nuevo.
 *
 * ## Qué arregla y por qué era un problema
 *
 * **1. Las 28 preguntas de «relación clave» eran todas «Verdadero».**
 * Un jugador aprende eso en dos preguntas y a partir de ahí responde sin leer. Veintiocho
 * preguntas convertidas en un botón. Ahora la mitad afirma un vínculo que NO existe en el
 * catálogo, así que hay que saberse quién va con quién.
 *
 * **2. Ochenta instrucciones de prueba estaban cosidas a lo bruto.**
 * «Recibe 3 pistas progresivas y adivínalo antes de la tercera. con pistas muy directas.» —
 * una coletilla de dificultad pegada detrás de un punto final, en minúscula. Se lee en la
 * pantalla de la prueba, o sea que lo veía todo el mundo. Ahora la dificultad se integra en
 * la frase o se convierte en una segunda frase de verdad.
 *
 * **3. Doce pruebas estaban duplicadas.** Mismo nombre y mismo nivel que otra anterior.
 *
 * **4. La respuesta correcta caía en la opción A un 33 % de las veces.**
 * Con cuatro opciones debería rondar el 25 %. Ocho puntos de sesgo son suficientes para que
 * «ante la duda, la primera» sea estrategia. Se barajan las opciones con un orden
 * determinista derivado del id, que reparte sin volverse aleatorio entre despliegues.
 *
 * **5. Distractores que se solapan con la correcta o entre sí.**
 * «pareja» / «pareja principal inicial» / «matrimonio» en la misma pregunta dejan una de
 * cuatro convertida en una de dos. Se sustituyen por opciones del mismo tipo bien separadas.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const DATA = path.join(process.cwd(), 'src', 'content', 'anhqv', 'data');

const leer = (nombre) => JSON.parse(readFileSync(path.join(DATA, nombre), 'utf8'));
const escribir = (nombre, valor) =>
  writeFileSync(path.join(DATA, nombre), `${JSON.stringify(valor, null, 2)}\n`, 'utf8');

/** Orden determinista a partir de una cadena: mismo id, misma baraja, siempre. */
function semilla(texto) {
  let valor = 0x811c9dc5;
  for (let i = 0; i < texto.length; i += 1) {
    valor ^= texto.charCodeAt(i);
    valor = Math.imul(valor, 0x01000193);
  }
  return valor >>> 0;
}

function barajarCon(lista, clave) {
  const copia = [...lista];
  let estado = semilla(clave) || 1;
  for (let i = copia.length - 1; i > 0; i -= 1) {
    estado = (estado * 1103515245 + 12345) & 0x7fffffff;
    const j = estado % (i + 1);
    const a = copia[i];
    const b = copia[j];
    if (a !== undefined && b !== undefined) {
      copia[i] = b;
      copia[j] = a;
    }
  }
  return copia;
}

const cambios = {
  relaciones: 0,
  instrucciones: 0,
  duplicadas: 0,
  barajadas: 0,
  distractores: 0,
  intrusos: 0,
  vinculos: 0,
  invertidas: 0,
  retiradas: 0,
  retematizadas: 0,
};

/** Ids que se retiran del banco por ser redundantes sin arreglo posible. */
const aRetirar = new Set();

function normaliza(valor) {
  return String(valor)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// ── 1. Las relaciones que siempre eran verdad ───────────────────────────────────

const preguntas = leer('preguntas.json');

/** Pares que SÍ están vinculados, leídos de las propias preguntas verdaderas. */
const vinculados = new Set();
const nombres = new Set();

for (const pregunta of preguntas) {
  const m = String(pregunta.question).match(/^(.+?) y (.+?) aparecen vinculados como relación clave\.$/);
  if (!m) continue;
  const [, uno, otro] = m;
  vinculados.add(`${uno}||${otro}`);
  vinculados.add(`${otro}||${uno}`);
  nombres.add(uno);
  nombres.add(otro);
}

const listaNombres = [...nombres].sort();

/**
 * Pares falsos ya usados. Sin esto, dos preguntas distintas acababan afirmando exactamente lo
 * mismo y la auditoría las cazaba como enunciado duplicado —que es lo que pasó al primer
 * intento—.
 */
const falsosUsados = new Set();

/** Un par que NO está vinculado, elegido de forma determinista a partir del id. */
function parNoVinculado(id, evitarUno) {
  let estado = semilla(id) || 1;
  for (let intento = 0; intento < 200; intento += 1) {
    estado = (estado * 1103515245 + 12345) & 0x7fffffff;
    const a = listaNombres[estado % listaNombres.length];
    estado = (estado * 1103515245 + 12345) & 0x7fffffff;
    const b = listaNombres[estado % listaNombres.length];
    if (!a || !b || a === b) continue;
    if (vinculados.has(`${a}||${b}`)) continue;
    if (a === evitarUno && b === evitarUno) continue;
    if (falsosUsados.has(`${a}||${b}`) || falsosUsados.has(`${b}||${a}`)) continue;
    falsosUsados.add(`${a}||${b}`);
    return [a, b];
  }
  return null;
}

// Se cambia UNA DE CADA DOS, por orden de id: así queda mitad y mitad y sigue siendo
// reproducible. Cambiarlas al azar dejaría el reparto a merced de la suerte.
let indiceRelacion = 0;
for (const pregunta of preguntas) {
  const m = String(pregunta.question).match(/^(.+?) y (.+?) aparecen vinculados como relación clave\.$/);
  if (!m) continue;
  const debeSerFalsa = indiceRelacion % 2 === 1;
  indiceRelacion += 1;
  if (!debeSerFalsa) continue;

  const par = parNoVinculado(pregunta.id, m[1]);
  if (!par) continue;

  pregunta.question = `${par[0]} y ${par[1]} aparecen vinculados como relación clave.`;
  pregunta.answer = 'Falso';
  pregunta.explanation = `El catálogo no recoge ningún vínculo directo entre ${par[0]} y ${par[1]}.`;
  cambios.relaciones += 1;
}

// ── 2 y 5. Distractores solapados ───────────────────────────────────────────────

/**
 * Sustituciones a mano. Son pocas y cada una necesita saber de qué habla la pregunta, así que
 * generarlas sería peor: un distractor tiene que ser plausible Y estar bien separado de la
 * correcta, y eso no lo decide un algoritmo de parecido de cadenas.
 */
const DISTRACTORES = {
  Q0547: {
    // «pareja principal inicial» / «pareja» / «matrimonio» eran la misma idea tres veces.
    options: ['hermanos', 'matrimonio', 'vecinos de rellano', 'suegra y yerno'],
  },
  Q0555: {
    options: ['coparentalidad de Ezequiel', 'matrimonio', 'hermanos', 'jefe y empleado'],
  },
  Q0467: {
    options: [
      'ecologista cubano',
      'portero del edificio',
      'vecina veterana de Radio Patio',
      'dueño del videoclub',
    ],
  },
};

for (const pregunta of preguntas) {
  const arreglo = DISTRACTORES[pregunta.id];
  if (!arreglo) continue;
  if (!arreglo.options.includes(pregunta.answer)) continue;
  pregunta.options = arreglo.options;
  cambios.distractores += 1;
}

// ── 6. La familia «intruso», que era una moneda al aire ─────────────────────────

/**
 * «Entre las relaciones clave de X, ¿qué nombre sería el intruso?» venía con DOS opciones, y
 * en siete de ocho la respuesta era «Juan Cuesta». O sea: una de dos, y encima con truco
 * aprendible a la primera. No es una pregunta, es un botón.
 *
 * Se reconstruye con las relaciones REALES del personaje sacadas del catálogo más un intruso
 * que cambia en cada pregunta. Cuando el personaje tiene menos de tres relaciones no hay
 * material para cuatro opciones honestas —meter dos ajenos daría dos respuestas válidas—, así
 * que esa se convierte en verdadero/falso, que sí se puede responder con lo que hay.
 */
const ZONAS = JSON.parse(
  readFileSync(path.join(process.cwd(), 'medios', 'zonas.json'), 'utf8'),
);
const RELACIONES = JSON.parse(
  readFileSync(path.join(process.cwd(), 'medios', 'relaciones.json'), 'utf8'),
);
const TODOS = Object.keys(RELACIONES);

function intrusoPara(sujeto, id) {
  const suyas = new Set([sujeto, ...(RELACIONES[sujeto] ?? [])]);
  const ajenos = TODOS.filter((nombre) => !suyas.has(nombre));
  if (ajenos.length === 0) return null;
  return ajenos[semilla(id) % ajenos.length] ?? null;
}

for (const pregunta of preguntas) {
  const m = String(pregunta.question).match(
    /^Entre las relaciones clave de (.+?), ¿qué nombre sería el intruso\?$/,
  );
  if (!m) continue;
  const sujeto = m[1];
  const reales = RELACIONES[sujeto] ?? [];
  const intruso = intrusoPara(sujeto, pregunta.id);
  if (!intruso) continue;

  if (reales.length < 3) {
    pregunta.type = 'verdadero_falso';
    pregunta.question = `${intruso} es una de las relaciones clave de ${sujeto}.`;
    pregunta.answer = 'Falso';
    pregunta.options = ['Verdadero', 'Falso'];
    pregunta.explanation = `El catálogo recoge para ${sujeto}: ${reales.join(', ') || 'ninguna relación directa'}.`;
    cambios.intrusos += 1;
    continue;
  }

  pregunta.options = [...reales.slice(0, 3), intruso];
  pregunta.answer = intruso;
  pregunta.explanation = `${intruso} no figura entre las relaciones clave de ${sujeto} (${reales.join(', ')}).`;
  cambios.intrusos += 1;
}

// ── 7. Los «vínculos» con distractores que eran sinónimos ───────────────────────

/**
 * «¿Qué vínculo define mejor a X e Y?» ofrecía «pareja», «pareja principal inicial» y
 * «relación sentimental central e intermitente» en la misma pregunta. Son la misma cosa dicha
 * de tres maneras: quien sepa la respuesta no sabe cuál marcar, y quien no la sepa acierta por
 * eliminación de las que no son de pareja.
 *
 * Los distractores pasan a ser tipos de vínculo bien separados, descartando los que caigan en
 * la misma familia semántica que la correcta.
 */
const VINCULOS = [
  'matrimonio',
  'hermanos',
  'padre e hija',
  'madre e hijo',
  'vecinos de rellano',
  'jefe y empleado',
  'amistad de toda la vida',
  'suegra y yerno',
  'compañeros de trabajo',
  'cuñados',
];

function seParecen(uno, otro) {
  const a = normaliza(uno);
  const b = normaliza(otro);
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const familia = (texto) => /pareja|sentimental|matrimonio|novi|romant/.test(texto);
  return familia(a) && familia(b);
}

for (const pregunta of preguntas) {
  if (!/^¿Qué vínculo define mejor a /.test(String(pregunta.question))) continue;
  const correcta = pregunta.answer;
  if (typeof correcta !== 'string') continue;

  const candidatos = VINCULOS.filter((vinculo) => !seParecen(vinculo, correcta));
  const elegidos = barajarCon(candidatos, pregunta.id).slice(0, 3);
  if (elegidos.length < 3) continue;

  pregunta.options = [correcta, ...elegidos];
  cambios.vinculos += 1;
}

// ── 8. Preguntas repetidas con distinto formato ─────────────────────────────────

/**
 * Q0343 y Q0470 preguntaban literalmente lo mismo («¿Qué personaje interpreta Beatriz
 * Carvajal?»), una como respuesta corta y otra como opción múltiple. En una partida larga
 * salen las dos y canta.
 *
 * En vez de borrar una, se le da la vuelta a la de respuesta corta: preguntar por el
 * intérprete a partir del personaje es otra pregunta, y además más difícil.
 */
const vistosEnunciados = new Map();
for (const pregunta of preguntas) {
  const clave = normaliza(pregunta.question);
  const previo = vistosEnunciados.get(clave);
  if (!previo) {
    vistosEnunciados.set(clave, pregunta);
    continue;
  }

  const corta = Array.isArray(previo.options) && previo.options.length > 0 ? pregunta : previo;
  const m = String(corta.question).match(/^¿Qué personaje interpreta (.+?)\?$/);
  if (!m || typeof corta.answer !== 'string') continue;

  const interprete = m[1];
  const personaje = corta.answer;
  const invertida = `¿Qué intérprete da vida a ${personaje}?`;

  // Darle la vuelta puede chocar con una pregunta que YA existía en esa forma —pasó con
  // Q0469—, y entonces el arreglo crea el mismo problema que venía a resolver.
  //
  // El primer intento fue retirarla, y el test del banco lo cazó al instante: las rondas
  // preconstruidas R102 y R111 apuntaban a Q0344 por id. Retirar una pregunta del banco
  // rompe todo lo que la referencia, así que no se retira: se le cambia el TEMA. Preguntar
  // dónde vive el personaje es otra pregunta de verdad, y el id sigue existiendo.
  if (vistosEnunciados.has(normaliza(invertida))) {
    const vivienda = ZONAS[personaje];
    if (!vivienda) continue;
    const nueva = `¿En qué parte del portal vive ${personaje}?`;
    if (vistosEnunciados.has(normaliza(nueva))) continue;
    corta.question = nueva;
    corta.answer = vivienda;
    corta.category = 'Lugares';
    corta.explanation = `${personaje} vive en ${vivienda} de Desengaño 21.`;
    corta.options = [];
    vistosEnunciados.set(normaliza(nueva), corta);
    cambios.retematizadas += 1;
    continue;
  }

  corta.question = invertida;
  corta.answer = interprete;
  corta.explanation = `${interprete} interpreta a ${personaje}.`;
  vistosEnunciados.set(normaliza(invertida), corta);
  cambios.invertidas += 1;
}

// Nada se retira: retirar una pregunta rompe las rondas que la referencian por id.
const preguntasCuradas = preguntas.filter((pregunta) => !aRetirar.has(pregunta.id));

// ── 4. Sesgo de posición ────────────────────────────────────────────────────────

/**
 * Se COLOCA la correcta, no se baraja.
 *
 * El primer intento barajaba con una semilla del id. Barajar reparte al azar, y al azar sobre
 * 407 preguntas el sesgo no desaparece: se mueve. Pasó del 33 % en A al 33 % en B, que es
 * exactamente el mismo problema con otra letra.
 *
 * Lo que hace falta no es azar sino reparto: a cada pregunta le toca una posición por turno
 * rotatorio, así que con cuatro opciones sale 25 % clavado. Los distractores sí se barajan
 * entre sí —para que no queden siempre en el mismo orden relativo—, pero la correcta va donde
 * le toca.
 */
const turno = new Map();

for (const pregunta of preguntas) {
  const opciones = pregunta.options;
  if (!Array.isArray(opciones) || opciones.length < 3) continue; // V/F se deja en paz
  if (!opciones.includes(pregunta.answer)) continue;

  const cuantas = opciones.length;
  const usado = turno.get(cuantas) ?? 0;
  turno.set(cuantas, usado + 1);
  const destino = usado % cuantas;

  const distractores = barajarCon(
    opciones.filter((opcion) => opcion !== pregunta.answer),
    pregunta.id,
  );

  const colocadas = [];
  for (let i = 0; i < cuantas; i += 1) {
    colocadas.push(i === destino ? pregunta.answer : distractores.shift());
  }

  if (colocadas.join('|') === opciones.join('|')) continue;
  pregunta.options = colocadas.filter((opcion) => opcion !== undefined);
  cambios.barajadas += 1;
}


escribir('preguntas.json', preguntasCuradas);

// ── 3. Pruebas: coletillas cosidas y duplicados ─────────────────────────────────

const pruebas = leer('pruebas.json');

/** La coletilla de dificultad, convertida en frase de verdad. */
const COLETILLAS = {
  'con pistas muy directas.': 'Las pistas van muy claras.',
  'con pistas menos obvias.': 'Las pistas van menos claras.',
  'con detalles de temporadas concretas.': 'Entra el detalle de temporadas concretas.',
  'con secundarios, producción y cronología fina.':
    'Entran secundarios, producción y cronología fina.',
};

for (const prueba of pruebas) {
  let instruccion = String(prueba.instruction ?? '');
  for (const [coletilla, frase] of Object.entries(COLETILLAS)) {
    const cosida = `. ${coletilla}`;
    if (instruccion.endsWith(cosida)) {
      instruccion = `${instruccion.slice(0, -cosida.length)}. ${frase}`;
      cambios.instrucciones += 1;
      break;
    }
  }
  prueba.instruction = instruccion;
}

// Duplicados: mismo nombre exacto. Se les da un nombre propio en vez de borrarlos, porque el
// formato existe y quitarlo dejaría huecos en las rondas que lo referencian por id.
const vistos = new Map();
for (const prueba of pruebas) {
  const clave = String(prueba.name ?? '').toLowerCase().trim();
  const previo = vistos.get(clave);
  if (!previo) {
    vistos.set(clave, prueba);
    continue;
  }
  // Se distingue por el tipo, que es lo que de verdad las diferencia.
  const sufijo = prueba.kind && prueba.kind !== previo.kind ? prueba.kind : 'bis';
  prueba.name = `${prueba.name} (${sufijo})`;
  cambios.duplicadas += 1;
}

escribir('pruebas.json', pruebas);

// ── Resumen ─────────────────────────────────────────────────────────────────────

console.log('');
console.log('  Curación aplicada:');
console.log(`    ${String(cambios.relaciones).padStart(4)}  relaciones convertidas en falsas (eran todas verdad)`);
console.log(`    ${String(cambios.distractores).padStart(4)}  juegos de distractores separados`);
console.log(`    ${String(cambios.barajadas).padStart(4)}  preguntas con opciones barajadas`);
console.log(`    ${String(cambios.intrusos).padStart(4)}  «intrusos» reconstruidos (eran una de dos)`);
console.log(`    ${String(cambios.vinculos).padStart(4)}  «vínculos» con distractores separados`);
console.log(`    ${String(cambios.invertidas).padStart(4)}  preguntas repetidas invertidas`);
console.log(`    ${String(cambios.retematizadas).padStart(4)}  preguntas redundantes cambiadas de tema`);
console.log(`    ${String(cambios.instrucciones).padStart(4)}  instrucciones de prueba descosidas`);
console.log(`    ${String(cambios.duplicadas).padStart(4)}  pruebas duplicadas renombradas`);
console.log('');
