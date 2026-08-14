/**
 * DISTRACTORES — de dónde salen las tres respuestas falsas.
 *
 * Buena parte del pack (respuesta corta, emparejar, clasificar, ficha rápida…) trae la
 * respuesta correcta y `options: []`. Para poder jugarlas como opción múltiple hay que
 * fabricar distractores, y ahí está todo el riesgo de calidad del proyecto: un
 * distractor mal elegido convierte una pregunta buena en una pregunta con dos
 * respuestas válidas.
 *
 * Reglas, en orden de preferencia:
 *
 *   1. HERMANOS DEL PACK. El pack genera tríos sobre el mismo dato (corta + opción
 *      múltiple + verdadero/falso) y el del medio ya trae cuatro opciones revisadas.
 *      Si existe, se reutilizan esas: son las mejores porque son las suyas.
 *   2. DOMINIO CERRADO. Si la respuesta es un intérprete, un personaje, una zona del
 *      edificio, una temporada o un país, los distractores salen de la biblia editorial
 *      (`src/content/serie.ts`). Son plausibles por definición e inequívocamente falsos.
 *   3. MISMA FORMA Y MISMA CATEGORÍA. Respuestas de otras preguntas de la misma
 *      categoría con la misma «pinta» (número de palabras, si llevan cifras…).
 *   4. Si nada de lo anterior da tres distractores, la pregunta NO se publica: se marca
 *      `needsReview` y se queda en borrador. Antes eso que una pregunta tramposa.
 *
 * Todo es determinista: la semilla es el id de la pregunta, así que el banco sembrado
 * hoy y el de dentro de un mes son idénticos.
 */

import { createRng, shuffle } from '@/domain/rng';
import { normalizarTexto } from '@/domain/questions/texto';
import {
  ETIQUETAS_ZONA,
  NOMBRES_INTERPRETES,
  NOMBRES_PERSONAJES,
  TEMPORADAS,
} from '@/content/serie';

import type { PreguntaPack } from './tipos';

export type Dominio =
  | 'interprete'
  | 'personaje'
  | 'zona'
  | 'temporada'
  | 'pareja_personajes'
  | 'pareja_interpretes'
  | 'ficha'
  | 'libre';

const SET_INTERPRETES = new Set(NOMBRES_INTERPRETES.map(normalizarTexto));
const SET_PERSONAJES = new Set(NOMBRES_PERSONAJES.map(normalizarTexto));
const SET_ZONAS = new Set(ETIQUETAS_ZONA.map(normalizarTexto));
const TEMPORADAS_TEXTO = TEMPORADAS.map((temporada) => `Temporada ${temporada.numero}`);

/** ¿A qué conjunto cerrado pertenece esta respuesta? */
export function dominioDe(respuesta: string): Dominio {
  const limpia = normalizarTexto(respuesta);
  if (SET_INTERPRETES.has(limpia)) return 'interprete';
  if (SET_PERSONAJES.has(limpia)) return 'personaje';
  if (SET_ZONAS.has(limpia)) return 'zona';
  if (/^temporada [1-5]$/.test(limpia)) return 'temporada';
  if (respuesta.includes(' | ')) return 'ficha';
  if (respuesta.includes(' + ')) {
    const partes = respuesta.split('+').map((parte) => normalizarTexto(parte));
    if (partes.every((parte) => SET_INTERPRETES.has(parte))) return 'pareja_interpretes';
    if (partes.every((parte) => SET_PERSONAJES.has(parte))) return 'pareja_personajes';
  }
  return 'libre';
}

/** Huella del hecho: el trío corta + múltiple + V/F comparte explicación. */
export function huellaDelHecho(pregunta: PreguntaPack): string {
  const base = normalizarTexto(pregunta.explanation)
    .replace(/^es (falso|verdadero)\.?\s*/, '')
    .replace(/^(es )?(correcto|incorrecto)\.?\s*/, '');
  const recortada = base.slice(0, 70);
  return recortada.length >= 4 ? recortada : normalizarTexto(pregunta.answer).slice(0, 70);
}

/** «7 de septiembre de 2003» y «6 de julio de 2006» tienen la misma pinta. */
function formaDe(texto: string): string {
  const limpio = normalizarTexto(texto);
  const palabras = limpio.split(' ').length;
  const conCifras = /\d/.test(limpio) ? 'n' : 'a';
  const largo = limpio.length <= 12 ? 'c' : limpio.length <= 30 ? 'm' : 'l';
  return `${conCifras}${palabras <= 2 ? 1 : palabras <= 5 ? 2 : 3}${largo}`;
}

export type Pools = {
  /** Opciones ya revisadas de un hermano del pack, por huella del hecho. */
  hermanos: Map<string, string[]>;
  /** Respuestas vistas en el pack, agrupadas por categoría + forma. */
  porCategoriaYForma: Map<string, string[]>;
  /** Todas las respuestas del pack, por dominio cerrado. */
  porDominio: Map<Dominio, string[]>;
};

/** Recorre el pack una vez y deja construidos los tres índices de distractores. */
export function construirPools(preguntas: readonly PreguntaPack[]): Pools {
  const hermanos = new Map<string, string[]>();
  const porCategoriaYForma = new Map<string, string[]>();
  const porDominio = new Map<Dominio, string[]>();

  const anadir = (mapa: Map<string, string[]>, clave: string, valor: string): void => {
    const lista = mapa.get(clave);
    if (!lista) {
      mapa.set(clave, [valor]);
      return;
    }
    if (!lista.includes(valor)) lista.push(valor);
  };

  for (const pregunta of preguntas) {
    const huella = huellaDelHecho(pregunta);

    if (pregunta.options.length === 4 && pregunta.options.includes(pregunta.answer)) {
      if (!hermanos.has(huella)) hermanos.set(huella, [...pregunta.options]);
    }

    // Solo entran respuestas y opciones reales del pack: nada inventado aquí.
    const candidatos = [pregunta.answer, ...pregunta.options];
    for (const candidato of candidatos) {
      if (!candidato || candidato.length > 120) continue;
      anadir(porCategoriaYForma, `${pregunta.category}|${formaDe(candidato)}`, candidato);
      const dominio = dominioDe(candidato);
      if (dominio !== 'libre') {
        const lista = porDominio.get(dominio) ?? [];
        if (!lista.includes(candidato)) lista.push(candidato);
        porDominio.set(dominio, lista);
      }
    }
  }

  // Los dominios cerrados se completan con la biblia, no solo con lo que salga del pack.
  const sembrar = (dominio: Dominio, valores: readonly string[]): void => {
    const lista = porDominio.get(dominio) ?? [];
    for (const valor of valores) if (!lista.includes(valor)) lista.push(valor);
    porDominio.set(dominio, lista);
  };
  sembrar('interprete', NOMBRES_INTERPRETES);
  sembrar('personaje', NOMBRES_PERSONAJES);
  sembrar('zona', ETIQUETAS_ZONA);
  sembrar('temporada', TEMPORADAS_TEXTO);

  return { hermanos, porCategoriaYForma, porDominio };
}

/** ¿Son dos textos tan parecidos que podrían valer los dos? */
function chocan(a: string, b: string): boolean {
  const x = normalizarTexto(a);
  const y = normalizarTexto(b);
  if (x === y) return true;
  if (x.length > 6 && (x.includes(y) || y.includes(x))) return true;
  return false;
}

export type ResultadoDistractores = {
  opciones: string[];
  origen: 'pack' | 'hermano' | 'dominio' | 'forma' | 'insuficiente';
};

/**
 * Cuatro opciones con la respuesta dentro, o `insuficiente` si no hay material honesto.
 */
export function construirOpciones(
  pregunta: PreguntaPack,
  pools: Pools,
): ResultadoDistractores {
  if (pregunta.options.length === 4 && pregunta.options.includes(pregunta.answer)) {
    return { opciones: [...pregunta.options], origen: 'pack' };
  }

  const rng = createRng(`opciones:${pregunta.id}`);
  const respuesta = pregunta.answer;

  const hermano = pools.hermanos.get(huellaDelHecho(pregunta));
  if (hermano && hermano.includes(respuesta) && hermano.length === 4) {
    return { opciones: shuffle(hermano, rng), origen: 'hermano' };
  }

  const elegir = (candidatos: readonly string[]): string[] => {
    const validos = shuffle(
      candidatos.filter((candidato) => !chocan(candidato, respuesta)),
      rng,
    );
    const elegidos: string[] = [];
    for (const candidato of validos) {
      if (elegidos.some((previo) => chocan(previo, candidato))) continue;
      elegidos.push(candidato);
      if (elegidos.length === 3) break;
    }
    return elegidos;
  };

  const dominio = dominioDe(respuesta);
  if (dominio !== 'libre') {
    const distractores = elegir(pools.porDominio.get(dominio) ?? []);
    if (distractores.length === 3) {
      return { opciones: shuffle([respuesta, ...distractores], rng), origen: 'dominio' };
    }
  }

  const clave = `${pregunta.category}|${formaDe(respuesta)}`;
  const distractores = elegir(pools.porCategoriaYForma.get(clave) ?? []);
  if (distractores.length === 3) {
    return { opciones: shuffle([respuesta, ...distractores], rng), origen: 'forma' };
  }

  return { opciones: [], origen: 'insuficiente' };
}
