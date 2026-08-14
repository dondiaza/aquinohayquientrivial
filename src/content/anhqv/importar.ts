/**
 * IMPORTADOR DEL PACK ANHQV — de las 14 familias del pack a las 11 del motor.
 *
 * El pack editorial no está escrito para este motor: trae familias que aquí no existen
 * (`emparejar`, `doble_pista`, `ficha_rapida`…) y muchas entradas sin opciones. Este
 * módulo hace la traducción, y lo hace con tres reglas fijas:
 *
 *   1. LOS IDS NO SE TOCAN. Q0001 sigue siendo Q0001 en la base de datos. Así el pack se
 *      puede volver a importar, corregir y comparar contra su origen.
 *   2. NO SE INVENTAN HECHOS. La respuesta y la explicación son las del pack. Lo único
 *      que se fabrica son los distractores, y solo desde conjuntos cerrados de la biblia
 *      editorial o desde respuestas que ya están en el propio pack (ver pools.ts).
 *   3. LO QUE NO SE PUEDE JUGAR LIMPIO, NO SE PUBLICA. Si una entrada se autorresponde,
 *      se contradice o no da para cuatro opciones honestas, se importa igual pero como
 *      borrador con `needsReview: true`. Queda en el panel, fuera de las partidas.
 *
 * Correspondencia de familias:
 *
 *   opcion_multiple      → MULTIPLE_CHOICE (los más difíciles, a FINAL_BET)
 *   verdadero_falso      → TRUE_FALSE
 *   respuesta_corta      → SHORT_ANSWER si es tecleable; si no, MULTIPLE_CHOICE
 *   ficha_rapida         → SHORT_ANSWER
 *   cadena_relacional    → SHORT_ANSWER
 *   pistas_progresivas   → WHO_IS_IT (las pistas salen del propio enunciado)
 *   intruso (4 opciones) → IMPOSTOR
 *   intruso (2-3)        → TRUE_FALSE («entre las relaciones de X figura Y»)
 *   intruso (0, «ancla») → MULTIPLE_CHOICE reconstruida con la biblia
 *   ordenar              → ORDER_CHAOS (2 hitos del pack + los que falten de la biblia)
 *   emparejar, clasificacion, inferencia, doble_pista, comparacion,
 *   seleccion_multiple   → MULTIPLE_CHOICE con su propia presentación (`variant`)
 */

import type { CategoryId } from '@/domain/questions/categories';
import type { QuestionRecord } from '@/domain/questions/schemas';
import { questionTypeMeta } from '@/domain/questions/registry';
import { normalizarTexto, pistaDeIniciales } from '@/domain/questions/texto';
import { extraerPistas } from '@/domain/questions/variants';
import type {
  ConfidenceLevel,
  QuestionOption,
  QuestionType,
  SpoilerLevel,
} from '@/domain/questions/types';
import { createRng, shuffle } from '@/domain/rng';
import {
  PERSONAJES,
  TEMPORADAS,
  ZONAS,
  buscarPersonaje,
  personajesDeZona,
  relacionesDe,
} from '@/content/serie';

import { construirOpciones, construirPools, huellaDelHecho, type Pools } from './pools';
import { etiquetas, type PreguntaPack } from './tipos';

/** Fecha fija: el banco sembrado no debe cambiar entre ejecuciones. */
export const FECHA_PACK = '2026-01-01T00:00:00.000Z';

export const NOTA_PACK = 'Pack editorial ANHQV v2 (docs/pack)';

/** Respuesta recortada para los borradores: solo tiene que caber, no jugarse. */
function respuestaRecortada(valor: string): string {
  const palabras = valor.trim().split(/\s+/).slice(0, 12).join(' ');
  return palabras.slice(0, 120);
}

/** Categorías del pack → catálogo del juego. */
const CATEGORIAS: Record<string, CategoryId> = {
  Serie: 'general',
  Producción: 'produccion',
  Audiencias: 'audiencias',
  Reparto: 'reparto',
  Personajes: 'personajes',
  Tramas: 'tramas',
  Frases: 'frases',
  Curiosidades: 'curiosidades',
  Lugares: 'lugares',
  Relaciones: 'relaciones',
  Cronología: 'temporadas',
  Ecosistema: 'ecosistema',
  Adaptaciones: 'adaptaciones',
};

const LETRAS = ['a', 'b', 'c', 'd', 'e', 'f'] as const;

function idOpcion(indice: number): string {
  return LETRAS[indice] ?? `o${indice}`;
}

function aOpciones(textos: readonly string[]): QuestionOption[] {
  return textos.map((text, indice) => ({ id: idOpcion(indice), text: text.trim() }));
}

/** El pack usa 1..5; el motor 1..10. */
function dificultad(valor: number): number {
  return Math.min(10, Math.max(1, Math.round(valor * 2)));
}

function nivelSpoiler(valor: string | undefined): SpoilerLevel {
  return valor === 'light' || valor === 'major' ? valor : 'none';
}

function confianza(valor: string | undefined): ConfidenceLevel {
  return valor === 'medium' ? 'medium' : 'high';
}

/** Personajes citados: primero las etiquetas del pack, luego el texto. */
function personajesCitados(pregunta: PreguntaPack, tags: readonly string[]): string[] {
  const encontrados = new Set<string>();

  for (const etiqueta of tags) {
    if (!etiqueta.startsWith('personaje:')) continue;
    const personaje = buscarPersonaje(etiqueta.slice('personaje:'.length));
    if (personaje) encontrados.add(personaje.nombre);
  }

  const texto = ` ${normalizarTexto(`${pregunta.question} ${pregunta.answer}`)} `;
  for (const personaje of PERSONAJES) {
    if (texto.includes(` ${normalizarTexto(personaje.nombre)} `)) encontrados.add(personaje.nombre);
  }

  return [...encontrados].slice(0, 12);
}

function temporadaDe(tags: readonly string[], respuesta: string): number | undefined {
  for (const etiqueta of tags) {
    const encaje = /^temporada:([1-5])$/.exec(etiqueta);
    if (encaje?.[1]) return Number(encaje[1]);
  }
  const enRespuesta = /^temporada ([1-5])$/.exec(normalizarTexto(respuesta));
  return enRespuesta?.[1] ? Number(enRespuesta[1]) : undefined;
}

/** Segundos: el defecto del tipo, estirado o encogido según la dificultad del pack. */
function tiempo(tipo: QuestionType, dificultadPack: number): number {
  const base = questionTypeMeta(tipo).defaultTimeLimitSeconds;
  const ajuste = Math.round((dificultadPack - 3) * 1.5);
  return Math.min(120, Math.max(5, base + ajuste));
}

/** Puntos: el defecto del tipo, con prima por dificultad. */
function puntos(tipo: QuestionType, dificultadPack: number): number {
  const base = questionTypeMeta(tipo).defaultBasePoints;
  return Math.min(5000, Math.max(100, Math.round(base * (0.85 + dificultadPack * 0.08))));
}

// ── Erratas verificadas del pack ────────────────────────────────────────────────
//
// Seis entradas del corpus no se sostienen. Se corrigen aquí, con el motivo escrito al
// lado, y NO en el JSON: así el fichero del pack sigue siendo el original que entregó el
// equipo editorial y la diferencia queda a la vista de quien revise.
//
// El corpus se revisó además con tres comprobaciones automáticas: enunciados que
// contienen su propia respuesta (7), verdadero/falso que se contradicen con su propia
// explicación (1) y verdadero/falso cuyo valor sustituido viene de otra categoría (3).
// Todo lo que salió está o corregido aquí o marcado para revisión.

type Errata = {
  question?: string;
  answer?: string;
  options?: string[];
  explanation?: string;
  motivo: string;
};

const ERRATAS: Record<string, Errata> = {
  // «La serie original se estrenó en Antena 3» venía marcada como Falso, y es verdad. El
  // enunciado que se quería poner en duda era la FECHA, no la cadena.
  Q0003: {
    question: 'La serie original se estrenó en Antena 3 en el año 2006.',
    motivo: 'El enunciado original era verdadero y venía marcado como Falso.',
  },

  // «Un poquito de por favor» es de Juan Cuesta, no de Emilio. El pack lo repite en tres
  // entradas y en la tarjeta C0102; es probablemente el dato más conocido de la serie, así
  // que dejarlo mal sería el error más visible del banco.
  Q0304: {
    answer: 'Juan Cuesta',
    explanation:
      'Es la muletilla de Juan Cuesta, el presidente de la comunidad, interpretado por José Luis Gil.',
    motivo: 'El pack la atribuía a Emilio.',
  },
  Q0305: {
    answer: 'Juan Cuesta',
    options: ['Juan Cuesta', 'Emilio Delgado', 'Mariano Delgado', 'Marisa Benito'],
    explanation:
      'Es la muletilla de Juan Cuesta, el presidente de la comunidad, interpretado por José Luis Gil.',
    motivo: 'El pack la atribuía a Emilio y sus distractores mezclaban actores y lugares.',
  },
  Q0306: {
    question: 'La expresión «Un poquito de por favor» se asocia principalmente a Emilio.',
    explanation: 'Es falso: es la muletilla de Juan Cuesta.',
    motivo: 'El enunciado original comparaba la frase con una productora.',
  },

  // El valor sustituido venía de otra categoría y el enunciado quedaba sin sentido.
  Q0045: {
    question: 'El episodio citado como el más visto es el último capítulo de la serie.',
    motivo: 'El enunciado original decía «el episodio más visto es arquitecto».',
  },
  Q0309: {
    question: 'La expresión «Qué mona va esta chica siempre» se asocia a Vicenta.',
    motivo: 'El enunciado original comparaba la frase con una actriz, no con un personaje.',
  },
};

/** Aplica la errata (si la hay) antes de traducir la entrada. */
function conErrata(pregunta: PreguntaPack): PreguntaPack {
  const errata = ERRATAS[pregunta.id];
  if (!errata) return pregunta;
  return {
    ...pregunta,
    ...(errata.question ? { question: errata.question } : {}),
    ...(errata.answer ? { answer: errata.answer } : {}),
    ...(errata.options ? { options: errata.options } : {}),
    ...(errata.explanation ? { explanation: errata.explanation } : {}),
  };
}

/** Ids corregidos, para que el seed pueda contarlos y el panel filtrarlos. */
export const IDS_CON_ERRATA: readonly string[] = Object.keys(ERRATAS);

// ── Piezas comunes del registro ─────────────────────────────────────────────────

type Comun = Omit<QuestionRecord, 'type' | 'payload'>;

function comun(
  pregunta: PreguntaPack,
  tipo: QuestionType,
  opciones: { variant?: string; prompt?: string; needsReview?: boolean; borrador?: boolean },
): Comun {
  const tags = etiquetas(pregunta.tags);
  const temporada = temporadaDe(tags, pregunta.answer);

  const marcas = [...tags];
  if (opciones.variant && marcas.length < 16) marcas.push(`familia:${opciones.variant}`);
  if (ERRATAS[pregunta.id] && marcas.length < 16) marcas.push('errata:corregida');

  return {
    id: pregunta.id,
    status: opciones.borrador ? 'DRAFT' : 'ACTIVE',
    prompt: opciones.prompt ?? pregunta.question,
    explanation: pregunta.explanation,
    difficulty: dificultad(pregunta.difficulty),
    category: CATEGORIAS[pregunta.category] ?? 'general',
    ...(temporada ? { season: temporada } : {}),
    characters: personajesCitados(pregunta, tags),
    tags: marcas.slice(0, 16),
    basePoints: puntos(tipo, pregunta.difficulty),
    timeLimitSeconds: tiempo(tipo, pregunta.difficulty),
    sourceNote: pregunta.source_hint ? `${pregunta.source_hint} · ${NOTA_PACK}` : NOTA_PACK,
    verified: confianza(pregunta.confidence) === 'high',
    featured: false,
    spoiler: nivelSpoiler(pregunta.spoiler),
    confidence: confianza(pregunta.confidence),
    ...(opciones.variant ? { variant: opciones.variant } : {}),
    factKey: huellaDelHecho(pregunta),
    needsReview: opciones.needsReview ?? false,
    createdAt: FECHA_PACK,
    updatedAt: FECHA_PACK,
  };
}

// ── Traducciones por familia ────────────────────────────────────────────────────

/** ¿Se puede escribir esta respuesta sin morir en el intento? */
function esTecleable(respuesta: string): boolean {
  const palabras = respuesta.trim().split(/\s+/);
  if (respuesta.includes('|') || respuesta.includes('+') || respuesta.includes('→')) return false;
  if (palabras.length > 3) return false;
  if (respuesta.length > 28) return false;
  // Fechas y cifras con formato («20,9%», «2.507.000 espectadores») se juegan con opciones.
  if (/\d/.test(respuesta) && palabras.length > 1) return false;
  return true;
}

/** Formas alternativas que también se aceptan al escribir. */
function formasAceptadas(respuesta: string): string[] {
  const aceptadas = new Set<string>();

  const personaje = buscarPersonaje(respuesta);
  if (personaje) {
    aceptadas.add(personaje.corto);
    aceptadas.add(personaje.nombre);
  }

  const interprete = PERSONAJES.find((candidato) => candidato.interprete === respuesta);
  if (interprete) {
    const apellidos = interprete.interprete.split(' ').slice(1).join(' ');
    if (apellidos.length >= 5) aceptadas.add(apellidos);
  }

  const zona = ZONAS.find((candidata) => candidata.etiqueta === respuesta);
  if (zona) {
    aceptadas.add(zona.etiqueta.replace(/\.º/g, ''));
    aceptadas.add(zona.etiqueta.replace(/\.º\s*/g, ''));
  }

  aceptadas.delete(respuesta);
  return [...aceptadas].slice(0, 12);
}

function opcionMultiple(
  pregunta: PreguntaPack,
  pools: Pools,
  variante: string,
  tipo: 'MULTIPLE_CHOICE' | 'FINAL_BET' = 'MULTIPLE_CHOICE',
  anotarOrigen?: (origen: string) => void,
): QuestionRecord {
  const resultado = construirOpciones(pregunta, pools);
  anotarOrigen?.(resultado.origen);

  if (resultado.origen === 'insuficiente') {
    // Sin cuatro opciones honestas no se juega: se guarda como borrador con la respuesta
    // repetida en la explicación para que quien revise vea de qué iba.
    return {
      ...comun(pregunta, 'SHORT_ANSWER', { variant: variante, needsReview: true, borrador: true }),
      type: 'SHORT_ANSWER',
      payload: { answer: respuestaRecortada(pregunta.answer), accepted: [] },
    };
  }

  const opciones = aOpciones(resultado.opciones);
  const correcta = opciones.find((opcion) => opcion.text === pregunta.answer.trim());

  return {
    ...comun(pregunta, tipo, { variant: variante }),
    type: tipo,
    payload:
      tipo === 'FINAL_BET'
        ? { options: opciones, correctOptionId: correcta?.id ?? 'a', maxWagerRatio: 0.5 }
        : { options: opciones, correctOptionId: correcta?.id ?? 'a' },
  } as QuestionRecord;
}

function verdaderoFalso(pregunta: PreguntaPack): QuestionRecord {
  return {
    ...comun(pregunta, 'TRUE_FALSE', { variant: 'verdadero_falso' }),
    type: 'TRUE_FALSE',
    payload: { correctValue: /^verdadero$/i.test(pregunta.answer.trim()) },
  };
}

function respuestaEscrita(pregunta: PreguntaPack, variante: string): QuestionRecord {
  const respuesta = pregunta.answer.trim();
  const dificil = pregunta.difficulty >= 4;
  return {
    ...comun(pregunta, 'SHORT_ANSWER', { variant: variante }),
    type: 'SHORT_ANSWER',
    payload: {
      answer: respuesta,
      accepted: formasAceptadas(respuesta),
      ...(dificil ? { hint: pistaDeIniciales(respuesta) } : {}),
    },
  };
}

function quienEs(pregunta: PreguntaPack, pools: Pools): QuestionRecord | null {
  const pistas = extraerPistas(pregunta.question);
  if (pistas.length < 2) return null;

  const resultado = construirOpciones(pregunta, pools);
  if (resultado.origen === 'insuficiente') return null;

  const opciones = aOpciones(resultado.opciones);
  const correcta = opciones.find((opcion) => opcion.text === pregunta.answer.trim());
  if (!correcta) return null;

  const encabezado = pregunta.question.slice(0, pregunta.question.indexOf(':')).trim();

  // Todas las entradas de pistas del pack vienen con la misma dificultad, y no lo son:
  // con dos pistas cuesta bastante más que con cuatro. La dificultad se recalcula con lo
  // único que de verdad la mueve aquí, que es cuántas pistas hay.
  const conDificultad: PreguntaPack = {
    ...pregunta,
    difficulty: Math.min(5, Math.max(1, pregunta.difficulty + (3 - pistas.length))),
  };

  return {
    ...comun(conDificultad, 'WHO_IS_IT', {
      variant: 'pistas_progresivas',
      prompt: `${encabezado || 'Identifica al personaje con estas pistas'}.`,
    }),
    type: 'WHO_IS_IT',
    payload: {
      clues: pistas.slice(0, 6),
      options: opciones,
      correctOptionId: correcta.id,
      clueIntervalSeconds: 5,
    },
  };
}

function infiltrado(pregunta: PreguntaPack): QuestionRecord | null {
  if (pregunta.options.length !== 4 || !pregunta.options.includes(pregunta.answer)) return null;

  const rng = createRng(`infiltrado:${pregunta.id}`);
  const items = aOpciones(shuffle(pregunta.options, rng));
  const impostor = items.find((item) => item.text === pregunta.answer.trim());
  if (!impostor) return null;

  const sujeto = pregunta.question.replace(/^Entre las relaciones clave de\s*/i, '').replace(/,.*$/, '');

  return {
    ...comun(pregunta, 'IMPOSTOR', {
      variant: 'intruso',
      prompt: `Tres de estos nombres son vínculos de ${sujeto}. ¿Cuál es el intruso?`,
    }),
    type: 'IMPOSTOR',
    payload: {
      setLabel: `Relaciones clave de ${sujeto}`,
      items,
      impostorItemId: impostor.id,
    },
  };
}

/**
 * Intruso con dos o tres opciones: no llega para EL INFILTRADO, pero el dato sigue
 * siendo bueno. Se replantea como afirmación falsa, que es exactamente lo que dice.
 */
function intrusoComoAfirmacion(pregunta: PreguntaPack): QuestionRecord {
  const sujeto = pregunta.question.replace(/^Entre las relaciones clave de\s*/i, '').replace(/,.*$/, '');
  return {
    ...comun(pregunta, 'TRUE_FALSE', {
      variant: 'intruso',
      prompt: `Entre los vínculos clave de ${sujeto} figura ${pregunta.answer}.`,
    }),
    type: 'TRUE_FALSE',
    payload: { correctValue: false },
  };
}

/**
 * Los nueve «¿qué elemento encaja como ancla de 1.º A?» se autorresponden: la respuesta
 * está literalmente en el enunciado. Se reconstruyen desde la biblia preguntando lo que
 * la entrada quería preguntar: quién vive ahí.
 */
function anclaDeZona(pregunta: PreguntaPack): QuestionRecord | null {
  const encaje = /ancla de (.+?)\?/.exec(pregunta.question);
  const etiqueta = encaje?.[1]?.trim();
  if (!etiqueta) return null;

  const zona = ZONAS.find((candidata) => candidata.etiqueta === etiqueta);
  if (!zona) return null;

  const vecinos = personajesDeZona(zona.etiqueta);
  const correcta = vecinos.length
    ? vecinos.slice(0, 3).map((vecino) => vecino.corto).join(', ')
    : zona.habitantes;

  const otras = ZONAS.filter((candidata) => candidata.id !== zona.id).map((candidata) => {
    const suyos = personajesDeZona(candidata.etiqueta);
    return suyos.length ? suyos.slice(0, 3).map((vecino) => vecino.corto).join(', ') : candidata.habitantes;
  });

  const rng = createRng(`ancla:${pregunta.id}`);
  const distractores = shuffle([...new Set(otras)].filter((texto) => texto !== correcta), rng).slice(0, 3);
  if (distractores.length < 3) return null;

  const opciones = aOpciones(shuffle([correcta, ...distractores], rng));
  const marcada = opciones.find((opcion) => opcion.text === correcta);
  if (!marcada) return null;

  return {
    ...comun(pregunta, 'MULTIPLE_CHOICE', {
      variant: 'ficha_rapida',
      prompt: `En el mapa de Desengaño 21, ¿quién se asocia con ${zona.etiqueta}?`,
    }),
    type: 'MULTIPLE_CHOICE',
    payload: { options: opciones, correctOptionId: marcada.id },
  };
}

/**
 * `ordenar` viene con dos hitos, y ORDENA EL DESASTRE pide tres como mínimo. Se completa
 * con hitos de la biblia de temporadas distintas a las que ya aparecen, así que el orden
 * sigue siendo verificable.
 */
function ordenarHitos(pregunta: PreguntaPack): QuestionRecord | null {
  const citados = [...pregunta.question.matchAll(/[“"]([^”"]+)[”"]/g)]
    .map((encaje) => encaje[1]?.trim() ?? '')
    .filter((hito) => hito.length > 3);
  if (citados.length < 2) return null;

  const catalogo = TEMPORADAS.flatMap((temporada) =>
    temporada.hitos.map((hito) => ({ hito, temporada: temporada.numero })),
  );

  const localizar = (texto: string): { hito: string; temporada: number } | undefined =>
    catalogo.find((entrada) => normalizarTexto(entrada.hito) === normalizarTexto(texto)) ??
    catalogo.find(
      (entrada) =>
        normalizarTexto(entrada.hito).includes(normalizarTexto(texto)) ||
        normalizarTexto(texto).includes(normalizarTexto(entrada.hito)),
    );

  const base = citados.map((texto) => localizar(texto) ?? { hito: texto, temporada: 0 });
  if (base.some((entrada) => entrada.temporada === 0)) return null;

  const usadas = new Set(base.map((entrada) => entrada.temporada));
  const extra = catalogo.filter((entrada) => !usadas.has(entrada.temporada));
  const rng = createRng(`ordenar:${pregunta.id}`);
  const anadidos = shuffle(extra, rng).slice(0, 2);

  const todos = [...base, ...anadidos]
    .filter((entrada, indice, lista) => lista.findIndex((otra) => otra.hito === entrada.hito) === indice)
    .sort((a, b) => a.temporada - b.temporada);
  if (todos.length < 3) return null;

  return {
    ...comun(pregunta, 'ORDER_CHAOS', {
      variant: 'ordenar',
      prompt: 'Coloca estos hitos de Desengaño 21 del primero al último.',
    }),
    type: 'ORDER_CHAOS',
    payload: {
      steps: todos.slice(0, 5).map((entrada, indice) => ({
        id: `s${indice + 1}`,
        text: `${entrada.hito.charAt(0).toUpperCase()}${entrada.hito.slice(1)}`,
      })),
      firstLabel: 'Antes',
      lastLabel: 'Después',
    },
  };
}

// ── Punto de entrada ────────────────────────────────────────────────────────────

export type Diagnostico = {
  total: number;
  publicadas: number;
  enRevision: number;
  porTipo: Record<string, number>;
  porFamilia: Record<string, number>;
  porOrigenOpciones: Record<string, number>;
  /** Ids que se quedan en borrador, con el motivo. */
  revisar: { id: string; motivo: string }[];
  /** Entradas del pack corregidas por errata verificada. */
  erratas: number;
};

/**
 * Convierte el pack entero. Determinista: mismo JSON de entrada, mismo banco de salida.
 * Las preguntas que salen marcadas como `needsReview` van en DRAFT y no se juegan.
 */
export function importarPack(entradas: readonly PreguntaPack[]): {
  registros: QuestionRecord[];
  diagnostico: Diagnostico;
} {
  const preguntas = entradas.map(conErrata);
  const pools = construirPools(preguntas);
  const registros: QuestionRecord[] = [];
  const diagnostico: Diagnostico = {
    total: preguntas.length,
    publicadas: 0,
    enRevision: 0,
    porTipo: {},
    porFamilia: {},
    porOrigenOpciones: {},
    revisar: [],
    erratas: IDS_CON_ERRATA.length,
  };

  // Las más difíciles de opción múltiple se reservan para las rondas de apuesta: si no
  // hubiera ninguna, LA DERRAMA y PRESIDENTE POR UN DÍA se quedarían sin material. Se
  // cogen de los dos niveles altos (4 y 5) para que la ronda final no sea siempre igual
  // de dura, y una de cada cuatro para no vaciar de preguntas duras el resto del juego.
  const idsApuesta = new Set(
    preguntas
      .filter(
        (pregunta) =>
          pregunta.type === 'opcion_multiple' &&
          pregunta.difficulty >= 4 &&
          pregunta.options.length === 4,
      )
      .filter((_, indice) => indice % 4 === 0)
      .map((pregunta) => pregunta.id),
  );

  const anotarOrigen = (origen: string): void => {
    diagnostico.porOrigenOpciones[origen] = (diagnostico.porOrigenOpciones[origen] ?? 0) + 1;
  };

  for (const pregunta of preguntas) {
    let registro: QuestionRecord | null = null;

    switch (pregunta.type) {
      case 'verdadero_falso':
        registro = verdaderoFalso(pregunta);
        break;

      case 'respuesta_corta':
        registro = esTecleable(pregunta.answer)
          ? respuestaEscrita(pregunta, 'respuesta_corta')
          : opcionMultiple(pregunta, pools, 'respuesta_corta', 'MULTIPLE_CHOICE', anotarOrigen);
        break;

      case 'ficha_rapida':
        registro = esTecleable(pregunta.answer)
          ? respuestaEscrita(pregunta, 'ficha_rapida')
          : opcionMultiple(pregunta, pools, 'ficha_rapida', 'MULTIPLE_CHOICE', anotarOrigen);
        break;

      case 'cadena_relacional':
        registro = esTecleable(pregunta.answer)
          ? respuestaEscrita(pregunta, 'cadena_relacional')
          : opcionMultiple(pregunta, pools, 'cadena_relacional', 'MULTIPLE_CHOICE', anotarOrigen);
        break;

      case 'pistas_progresivas':
        registro =
          quienEs(pregunta, pools) ??
          opcionMultiple(pregunta, pools, 'pistas_progresivas', 'MULTIPLE_CHOICE', anotarOrigen);
        break;

      case 'intruso':
        if (pregunta.options.length === 4) {
          registro = infiltrado(pregunta);
        } else if (pregunta.options.length >= 2) {
          registro = intrusoComoAfirmacion(pregunta);
        } else {
          registro = anclaDeZona(pregunta);
        }
        break;

      case 'ordenar':
        registro = ordenarHitos(pregunta);
        break;

      case 'opcion_multiple':
        registro = opcionMultiple(
          pregunta,
          pools,
          'opcion_multiple',
          idsApuesta.has(pregunta.id) ? 'FINAL_BET' : 'MULTIPLE_CHOICE',
          anotarOrigen,
        );
        break;

      default:
        registro = opcionMultiple(pregunta, pools, pregunta.type, 'MULTIPLE_CHOICE', anotarOrigen);
        break;
    }

    if (!registro) {
      // No hay forma honesta de jugarla: entra al panel como borrador.
      registro = {
        ...comun(pregunta, 'SHORT_ANSWER', {
          variant: pregunta.type,
          needsReview: true,
          borrador: true,
        }),
        type: 'SHORT_ANSWER',
        payload: { answer: respuestaRecortada(pregunta.answer), accepted: [] },
      };
    }

    if (registro.needsReview) {
      diagnostico.enRevision += 1;
      diagnostico.revisar.push({
        id: registro.id,
        motivo: `familia ${pregunta.type}: no da para cuatro opciones honestas`,
      });
    } else {
      diagnostico.publicadas += 1;
    }

    diagnostico.porTipo[registro.type] = (diagnostico.porTipo[registro.type] ?? 0) + 1;
    const familia = registro.variant ?? pregunta.type;
    diagnostico.porFamilia[familia] = (diagnostico.porFamilia[familia] ?? 0) + 1;

    registros.push(registro);
  }

  return { registros, diagnostico };
}

/** Vínculos de un personaje, en nombre largo. Lo usa el generador de contenido derivado. */
export { relacionesDe };
