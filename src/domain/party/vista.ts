/**
 * LA PREGUNTA SIN LA SOLUCIÓN.
 *
 * Este fichero existe por el requisito §44: «el payload enviado al jugador antes del
 * reveal NO debe contener accidentalmente la respuesta correcta». En un juego con once
 * familias de pregunta eso no se consigue recordándolo, se consigue con un único sitio
 * que construya la vista y un test que recorra las once y falle si algo se cuela.
 *
 * Cómo se quita la solución, familia por familia:
 *
 *   MULTIPLE_CHOICE, WHO_IS_IT, FINAL_BET · se manda `options`, se cae `correctOptionId`.
 *   MEMORY_GRID, MISSING_ITEM ············ igual; `items`/`present` sí van (hay que verlos).
 *   TRUE_FALSE ··························· no hay nada que mandar: se cae `correctValue`.
 *   IMPOSTOR ····························· van los `items`, se cae `impostorItemId`.
 *   ORDER_CHAOS ·························· los `steps` VIENEN EN ORDEN CORRECTO en el
 *                                          payload, así que se mandan MEZCLADOS con el
 *                                          orden de presentación de la sala.
 *   DECISION ····························· van las decisiones, se caen `weight`, `outcome`
 *                                          y `bestOptionId` (el peso delataría la mejor).
 *   SHORT_ANSWER ························· se cae `answer` y `accepted`. Solo va la pista.
 *   SEQUENCE ····························· la secuencia SÍ va: verla ES la mecánica. Queda
 *                                          documentado como excepción consciente.
 *
 * La regla que hace esto seguro: se construye un objeto NUEVO campo a campo. Nunca un
 * `...question`, que es exactamente cómo se filtran estas cosas.
 */

import { questionTypeMeta } from '../questions/registry';
import { variantMeta } from '../questions/variants';
import type { Question, QuestionOption } from '../questions/types';
import type { RoundDefinition } from '../rounds/formats';
import type { ScoreModifier } from '../scoring/scoring';

import type { VistaOpcion, VistaPregunta } from './protocolo';

function aVistaOpciones(opciones: readonly QuestionOption[]): VistaOpcion[] {
  return opciones.map((opcion) => ({
    id: opcion.id,
    text: opcion.text,
    ...(opcion.icon ? { icon: opcion.icon } : {}),
  }));
}

/** Reordena según el orden de presentación de la sala (mezclado y estable). */
function enOrden(opciones: readonly QuestionOption[], orden: readonly string[]): VistaOpcion[] {
  if (orden.length === 0) return aVistaOpciones(opciones);
  const porId = new Map(opciones.map((opcion) => [opcion.id, opcion]));
  const ordenadas: QuestionOption[] = [];
  for (const id of orden) {
    const opcion = porId.get(id);
    if (opcion) ordenadas.push(opcion);
  }
  for (const opcion of opciones) if (!orden.includes(opcion.id)) ordenadas.push(opcion);
  return aVistaOpciones(ordenadas);
}

export type ContextoVista = {
  question: Question;
  ronda: Pick<RoundDefinition, 'id' | 'title' | 'icon'>;
  indexInGame: number;
  totalPreguntas: number;
  /** Orden de presentación acordado por la sala. */
  optionOrder: readonly string[];
  /** Pistas ya reveladas en ¿QUIÉN ES? */
  pistasReveladas: number;
  timeLimitSeconds: number;
  empiezaEn: number;
  terminaEn: number;
  estudioHasta: number;
  modificadores: readonly ScoreModifier[];
};

/**
 * Construye la vista pública de la pregunta. Campo a campo, a propósito: si mañana se
 * añade una familia, TypeScript obliga a decidir qué se manda y qué no.
 */
export function vistaDePregunta(contexto: ContextoVista): VistaPregunta {
  const { question } = contexto;
  const meta = questionTypeMeta(question.type);
  const familia = variantMeta(question.variant);

  const base: VistaPregunta = {
    questionId: question.id,
    indexInGame: contexto.indexInGame,
    totalPreguntas: contexto.totalPreguntas,
    roundId: contexto.ronda.id,
    rondaTitulo: contexto.ronda.title,
    rondaIcono: contexto.ronda.icon ?? '🏢',
    tipo: question.type,
    ...(question.variant ? { variant: question.variant } : {}),
    familia: familia?.label ?? meta.label,
    instruccion: familia?.instruction ?? meta.instruction,
    prompt: question.prompt,
    dificultad: question.difficulty,
    opciones: null,
    pistas: [],
    empiezaEn: contexto.empiezaEn,
    terminaEn: contexto.terminaEn,
    estudioHasta: contexto.estudioHasta,
    modificadores: contexto.modificadores.map((modificador) => ({
      id: modificador.id,
      label: modificador.label,
      multiplier: modificador.multiplier,
    })),
  };

  switch (question.type) {
    case 'MULTIPLE_CHOICE':
    case 'FINAL_BET':
      return { ...base, opciones: enOrden(question.options, contexto.optionOrder) };

    case 'WHO_IS_IT':
      return {
        ...base,
        opciones: enOrden(question.options, contexto.optionOrder),
        // Solo las pistas ya reveladas: las siguientes no viajan hasta que toca.
        pistas: question.clues.slice(0, Math.max(1, contexto.pistasReveladas)),
      };

    case 'TRUE_FALSE':
      // No hay payload que enseñar: el móvil pinta dos botones y ya.
      return base;

    case 'IMPOSTOR':
      return {
        ...base,
        setLabel: question.setLabel,
        items: enOrden(question.items, contexto.optionOrder),
      };

    case 'ORDER_CHAOS':
      return {
        ...base,
        // `steps` viene en el orden correcto: se manda mezclado con el orden de la sala.
        pasos: enOrden(question.steps, contexto.optionOrder),
        primeraEtiqueta: question.firstLabel,
        ultimaEtiqueta: question.lastLabel,
      };

    case 'MEMORY_GRID':
      return {
        ...base,
        aMemorizar: aVistaOpciones(question.items),
        preguntaDeMemoria: question.question,
        opciones: enOrden(question.options, contexto.optionOrder),
      };

    case 'MISSING_ITEM':
      return {
        ...base,
        escena: question.sceneLabel,
        aMemorizar: aVistaOpciones(question.present),
        opciones: enOrden(question.options, contexto.optionOrder),
      };

    case 'DECISION':
      return {
        ...base,
        situacion: question.situation,
        // Solo id y texto: `weight` y `outcome` delatarían cuál es la mejor decisión.
        opciones: enOrden(
          question.options.map((opcion) => ({ id: opcion.id, text: opcion.text })),
          contexto.optionOrder,
        ),
      };

    case 'SEQUENCE':
      return {
        ...base,
        pads: aVistaOpciones(question.pads),
        // Excepción consciente: la secuencia hay que verla para poder repetirla.
        secuencia: [...question.sequence],
        stepMs: question.stepMs,
      };

    case 'SHORT_ANSWER':
      return {
        ...base,
        // `answer` y `accepted` NO viajan. Solo la pista, que es pública a propósito.
        ...(question.hint ? { pista: question.hint } : {}),
      };
  }
}

/**
 * Texto de la respuesta correcta, para el revelado. Se llama SOLO al revelar; está aparte
 * de `vistaDePregunta` justamente para que no se pueda invocar sin querer al construirla.
 */
export function textoCorrecto(question: Question): { id: string | null; texto: string } {
  switch (question.type) {
    case 'MULTIPLE_CHOICE':
    case 'WHO_IS_IT':
    case 'FINAL_BET':
    case 'MEMORY_GRID':
    case 'MISSING_ITEM': {
      const opcion = question.options.find((candidata) => candidata.id === question.correctOptionId);
      return { id: question.correctOptionId, texto: opcion?.text ?? '—' };
    }
    case 'TRUE_FALSE':
      return {
        id: question.correctValue ? 'true' : 'false',
        texto: question.correctValue ? 'Verdadero' : 'Falso',
      };
    case 'IMPOSTOR': {
      const item = question.items.find((candidato) => candidato.id === question.impostorItemId);
      return { id: question.impostorItemId, texto: item?.text ?? '—' };
    }
    case 'ORDER_CHAOS':
      return {
        id: null,
        texto: question.steps.map((paso, indice) => `${indice + 1}. ${paso.text}`).join(' · '),
      };
    case 'DECISION': {
      const mejor = question.options.find((opcion) => opcion.id === question.bestOptionId);
      return {
        id: question.bestOptionId,
        texto: mejor ? `${mejor.text} — ${mejor.outcome}` : '—',
      };
    }
    case 'SEQUENCE': {
      const nombre = (id: string): string =>
        question.pads.find((pad) => pad.id === id)?.text ?? id;
      return { id: null, texto: question.sequence.map(nombre).join(' → ') };
    }
    case 'SHORT_ANSWER':
      return { id: null, texto: question.answer };
  }
}

/**
 * Todos los textos/ids que constituyen «la solución» de una pregunta. Lo usa el test que
 * comprueba que la vista pública no filtra nada.
 */
export function marcasDeSolucion(question: Question): string[] {
  const marcas: string[] = [];
  switch (question.type) {
    case 'MULTIPLE_CHOICE':
    case 'WHO_IS_IT':
    case 'FINAL_BET':
    case 'MEMORY_GRID':
    case 'MISSING_ITEM':
      marcas.push(question.correctOptionId);
      break;
    case 'IMPOSTOR':
      marcas.push(question.impostorItemId);
      break;
    case 'DECISION':
      marcas.push(question.bestOptionId);
      for (const opcion of question.options) marcas.push(opcion.outcome, String(opcion.weight));
      break;
    case 'SHORT_ANSWER':
      marcas.push(question.answer, ...question.accepted);
      break;
    case 'TRUE_FALSE':
      marcas.push(String(question.correctValue));
      break;
    case 'ORDER_CHAOS':
    case 'SEQUENCE':
      // Su «solución» es un ORDEN, no un texto: se comprueba aparte en el test.
      break;
  }
  return marcas.filter((marca) => marca.length > 0);
}
