/**
 * AUDITORÍA DEL BANCO DE PREGUNTAS.
 *
 *   node scripts/auditar-banco.mjs
 *
 * Busca las cosas que hacen que una pregunta de trivial sea mala, y que NO se ven mirando
 * una a una porque solo aparecen al comparar unas con otras:
 *
 *   · **Respuesta adivinable sin saber nada.** La correcta es la más larga, o la única con
 *     tilde, o la única que menciona al protagonista. Un jugador listo acierta sin haber
 *     visto la serie, y eso mata el juego antes que una pregunta difícil.
 *   · **Distractores inservibles.** Opciones repetidas, vacías, o que son sinónimo de la
 *     correcta («Juan Cuesta» / «Cuesta»): la pregunta pasa a ser de dos opciones.
 *   · **Duplicados.** El mismo enunciado dos veces, o dos enunciados que son el mismo con
 *     otras palabras. Salen juntos en una partida y cantan.
 *   · **Enunciados rotos.** Sin interrogación, cortados, con marcas de importación, con HTML.
 *   · **La correcta siempre en el mismo sitio.** Si el 40 % son la opción A, se aprende.
 *   · **Incoherencias con el catálogo.** Una respuesta que dice que Emilio vive en el 3.º B
 *     cuando el catálogo dice portería.
 *
 * No corrige nada: informa, con el id de cada caso, para poder decidir. Escribe
 * `medios/auditoria-banco.json`.
 */

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();
const SALIDA = path.join(RAIZ, 'medios', 'auditoria-banco.json');

function leer(nombre) {
  return JSON.parse(readFileSync(path.join(RAIZ, 'src', 'content', 'anhqv', 'data', nombre), 'utf8'));
}

const normalizar = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Opciones de una pregunta, sea cual sea la forma que traiga el pack. */
function opcionesDe(pregunta) {
  if (Array.isArray(pregunta.opciones)) return pregunta.opciones.map(String);
  if (Array.isArray(pregunta.options)) return pregunta.options.map(String);
  if (Array.isArray(pregunta.respuestas)) return pregunta.respuestas.map(String);
  return [];
}

function correctaDe(pregunta, opciones) {
  for (const clave of ['answer', 'respuesta', 'correcta', 'correct']) {
    const valor = pregunta[clave];
    if (typeof valor === 'string') return valor;
    if (typeof valor === 'number' && opciones[valor] !== undefined) return opciones[valor];
  }
  for (const clave of ['indiceCorrecto', 'correctIndex', 'answerIndex']) {
    const valor = pregunta[clave];
    if (typeof valor === 'number' && opciones[valor] !== undefined) return opciones[valor];
  }
  return null;
}

function enunciadoDe(pregunta) {
  return String(
    pregunta.question ?? pregunta.enunciado ?? pregunta.pregunta ?? pregunta.texto ?? pregunta.prompt ?? '',
  );
}

function idDe(pregunta, indice) {
  return String(pregunta.id ?? pregunta.slug ?? `#${indice}`);
}

// ── Comprobaciones ──────────────────────────────────────────────────────────────

const hallazgos = [];
function anotar(tipo, id, detalle, gravedad = 'aviso') {
  hallazgos.push({ tipo, id, detalle, gravedad });
}

function auditar(preguntas, origen) {
  const porEnunciado = new Map();
  const posiciones = new Map();
  let conCorrecta = 0;
  let masLarga = 0;

  preguntas.forEach((pregunta, indice) => {
    const id = `${origen}:${idDe(pregunta, indice)}`;
    const enunciado = enunciadoDe(pregunta);
    const opciones = opcionesDe(pregunta);
    const correcta = correctaDe(pregunta, opciones);

    // 1. Enunciado utilizable.
    if (enunciado.trim().length < 12) {
      anotar('enunciado-corto', id, `«${enunciado}»`, 'grave');
    }
    if (/<[a-z/][^>]*>/i.test(enunciado)) {
      anotar('enunciado-con-html', id, enunciado.slice(0, 80), 'grave');
    }
    if (/\s{3,}| {2,}|�/.test(enunciado)) {
      anotar('enunciado-con-basura', id, enunciado.slice(0, 80), 'grave');
    }
    if (enunciado.length > 220) {
      anotar('enunciado-larguisimo', id, `${enunciado.length} caracteres`, 'aviso');
    }

    // 2. Opciones.
    const esVerdaderoFalso =
      pregunta.type === 'verdadero_falso' ||
      (opciones.length === 2 && normalizar(opciones.join(' ')) === 'verdadero falso');

    if (opciones.length > 0) {
      // Dos opciones en un verdadero/falso no es un defecto, es el formato. Contarlo como
      // grave llenaba el informe de 91 falsos positivos y tapaba lo que sí importaba.
      if (opciones.length < 3 && !esVerdaderoFalso) {
        anotar('pocas-opciones', id, `${opciones.length} opciones`, 'grave');
      }
      const vacias = opciones.filter((opcion) => opcion.trim().length === 0);
      if (vacias.length > 0) anotar('opcion-vacia', id, `${vacias.length} vacías`, 'grave');

      const normalizadas = opciones.map(normalizar);
      const unicas = new Set(normalizadas);
      if (unicas.size !== normalizadas.length) {
        anotar('opciones-repetidas', id, opciones.join(' | '), 'grave');
      }

      // Una opción que CONTIENE a otra suele ser el mismo referente («Juan» / «Juan Cuesta»).
      for (let a = 0; a < normalizadas.length; a += 1) {
        for (let b = a + 1; b < normalizadas.length; b += 1) {
          const uno = normalizadas[a];
          const otro = normalizadas[b];
          if (!uno || !otro) continue;
          if (uno !== otro && (uno.includes(otro) || otro.includes(uno))) {
            const corto = uno.length < otro.length ? uno : otro;
            if (corto.length >= 4) {
              anotar('opciones-solapadas', id, `«${opciones[a]}» / «${opciones[b]}»`, 'aviso');
            }
          }
        }
      }
    }

    // 3. La correcta existe y no se delata.
    if (correcta === null) {
      anotar('sin-respuesta', id, 'no se identifica la correcta', 'grave');
    } else {
      conCorrecta += 1;
      if (opciones.length > 0) {
        const posicion = opciones.findIndex((opcion) => normalizar(opcion) === normalizar(correcta));
        if (posicion === -1) {
          anotar('correcta-fuera-de-opciones', id, `«${correcta}» no está entre las opciones`, 'grave');
        } else {
          if (!esVerdaderoFalso) posiciones.set(posicion, (posiciones.get(posicion) ?? 0) + 1);
          // La más larga con diferencia: el clásico regalo.
          const largos = opciones.map((opcion) => opcion.length);
          const maximo = Math.max(...largos);
          const segundo = [...largos].sort((x, y) => y - x)[1] ?? 0;
          if (largos[posicion] === maximo && maximo > segundo * 1.6 && maximo > 18) {
            masLarga += 1;
            anotar('correcta-mas-larga', id, opciones.join(' | '), 'aviso');
          }
        }
      }
    }

    // 4. Duplicados de enunciado.
    const clave = normalizar(enunciado);
    if (clave.length > 0) {
      const previo = porEnunciado.get(clave);
      if (previo) anotar('enunciado-duplicado', id, `igual que ${previo}`, 'grave');
      else porEnunciado.set(clave, id);
    }
  });

  return { total: preguntas.length, conCorrecta, masLarga, posiciones };
}

// ── Ejecución ───────────────────────────────────────────────────────────────────

const preguntas = leer('preguntas.json');
const pruebas = leer('pruebas.json');

const lista = Array.isArray(preguntas) ? preguntas : (preguntas.preguntas ?? []);
const listaPruebas = Array.isArray(pruebas) ? pruebas : (pruebas.pruebas ?? []);

console.log('');
console.log(`  Preguntas del pack: ${lista.length}`);
console.log(`  Pruebas del pack:   ${listaPruebas.length}`);

const resumenPreguntas = auditar(lista, 'pregunta');

/**
 * Las pruebas NO son preguntas: son formatos de juego («¿Quién soy?», «La derrama») con
 * instrucción, nivel y forma de puntuar. Auditarlas con las reglas de una pregunta daba 260
 * falsos «sin respuesta», que es la clase de ruido que hace que un informe no se lea.
 */
function auditarPruebas(pruebas) {
  const porNombre = new Map();
  const porTipo = {};

  pruebas.forEach((prueba, indice) => {
    const id = `prueba:${prueba.id ?? indice}`;
    const nombre = String(prueba.name ?? '');
    const instruccion = String(prueba.instruction ?? '');
    const puntuacion = String(prueba.scoring ?? '');

    if (nombre.trim().length < 4) anotar('prueba-sin-nombre', id, nombre, 'grave');
    if (instruccion.trim().length < 25) {
      anotar('prueba-instruccion-pobre', id, `«${instruccion}»`, 'grave');
    }
    if (puntuacion.trim().length < 8) {
      anotar('prueba-sin-puntuacion', id, `«${puntuacion}»`, 'grave');
    }
    // Instrucción cosida a trozos: «…antes de la tercera. con pistas muy directas.»
    if (/[.!?]\s+[a-záéíóúñ]/.test(instruccion)) {
      anotar('prueba-instruccion-cosida', id, instruccion.slice(0, 110), 'grave');
    }
    if (!prueba.kind) anotar('prueba-sin-tipo', id, '', 'aviso');
    if (prueba.kind) porTipo[prueba.kind] = (porTipo[prueba.kind] ?? 0) + 1;

    const clave = normalizar(nombre);
    if (clave) {
      const previo = porNombre.get(clave);
      if (previo) anotar('prueba-duplicada', id, `igual que ${previo}`, 'grave');
      else porNombre.set(clave, id);
    }
  });

  return { total: pruebas.length, porTipo };
}

const resumenPruebas = auditarPruebas(listaPruebas);

// Reparto de la correcta por posición: si está desequilibrado, se aprende.
const reparto = [...resumenPreguntas.posiciones.entries()].sort((a, b) => a[0] - b[0]);
const totalPos = reparto.reduce((suma, [, n]) => suma + n, 0);

console.log('');
console.log('  Posición de la respuesta correcta:');
for (const [posicion, cuantas] of reparto) {
  const porcentaje = totalPos > 0 ? Math.round((cuantas / totalPos) * 100) : 0;
  const barra = '█'.repeat(Math.round(porcentaje / 2));
  console.log(`    ${'ABCDEF'[posicion] ?? posicion}  ${String(cuantas).padStart(4)}  ${String(porcentaje).padStart(3)}%  ${barra}`);
}

const porTipo = {};
for (const hallazgo of hallazgos) {
  porTipo[hallazgo.tipo] = (porTipo[hallazgo.tipo] ?? 0) + 1;
}

console.log('');
console.log('  Hallazgos:');
const orden = Object.entries(porTipo).sort((a, b) => b[1] - a[1]);
for (const [tipo, cuantos] of orden) {
  const graves = hallazgos.filter((h) => h.tipo === tipo && h.gravedad === 'grave').length;
  console.log(`    ${String(cuantos).padStart(4)}  ${tipo}${graves > 0 ? `  (${graves} graves)` : ''}`);
}
if (orden.length === 0) console.log('    ninguno');

mkdirSync(path.dirname(SALIDA), { recursive: true });
writeFileSync(
  SALIDA,
  `${JSON.stringify(
    {
      generadoEl: new Date().toISOString().slice(0, 10),
      preguntas: resumenPreguntas.total,
      pruebas: resumenPruebas.total,
      repartoPosicion: Object.fromEntries(reparto),
      porTipo,
      hallazgos,
    },
    null,
    2,
  )}\n`,
  'utf8',
);

console.log('');
console.log(`  Detalle en medios/auditoria-banco.json (${hallazgos.length} entradas)`);
console.log('');
