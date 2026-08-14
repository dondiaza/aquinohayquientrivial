/**
 * EL TEST QUE IMPIDE FILTRAR LA RESPUESTA.
 *
 * Es el test más importante de la Fase 3. Recorre las once familias de pregunta con
 * contenido REAL del banco de ANHQV y comprueba que lo que se manda al móvil antes del
 * reveal no contiene la solución: ni un campo con la clave, ni el texto de la respuesta,
 * ni el orden correcto disfrazado de orden de presentación.
 *
 * Si mañana alguien añade una familia y se olvida de sanearla, esto se pone rojo.
 */

import { describe, expect, it } from 'vitest';

import { preguntasJugables } from '@/content/anhqv/banco';
import { QUESTION_TYPES, type Question, type QuestionType } from '@/domain/questions/types';
import { shuffle } from '@/domain/rng';
import { createRng } from '@/domain/rng';

import { marcasDeSolucion, textoCorrecto, vistaDePregunta } from './vista';

const BANCO = preguntasJugables();

/** Una pregunta de cada familia, del banco de verdad. */
function unaDeCada(): Map<QuestionType, Question> {
  const porTipo = new Map<QuestionType, Question>();
  for (const pregunta of BANCO) {
    if (!porTipo.has(pregunta.type)) porTipo.set(pregunta.type, pregunta);
  }
  return porTipo;
}

/** Ids que la sala usaría como orden de presentación, ya mezclados. */
function ordenDePresentacion(pregunta: Question): string[] {
  const rng = createRng(`orden:${pregunta.id}`);
  switch (pregunta.type) {
    case 'MULTIPLE_CHOICE':
    case 'WHO_IS_IT':
    case 'FINAL_BET':
    case 'MEMORY_GRID':
    case 'MISSING_ITEM':
    case 'DECISION':
      return shuffle(
        pregunta.options.map((opcion) => opcion.id),
        rng,
      );
    case 'IMPOSTOR':
      return shuffle(
        pregunta.items.map((item) => item.id),
        rng,
      );
    case 'ORDER_CHAOS':
      return shuffle(
        pregunta.steps.map((paso) => paso.id),
        rng,
      );
    case 'SEQUENCE':
      return pregunta.pads.map((pad) => pad.id);
    case 'TRUE_FALSE':
    case 'SHORT_ANSWER':
      return [];
  }
}

function vistaDe(pregunta: Question) {
  return vistaDePregunta({
    question: pregunta,
    ronda: { id: 'ronda-test', title: 'Ronda de prueba', icon: '🏢' },
    indexInGame: 3,
    totalPreguntas: 12,
    optionOrder: ordenDePresentacion(pregunta),
    pistasReveladas: 1,
    timeLimitSeconds: 20,
    empiezaEn: 1_700_000_000_000,
    terminaEn: 1_700_000_020_000,
    estudioHasta: 0,
    modificadores: [],
  });
}

/** Todas las claves de un objeto, recursivamente. */
function clavesProfundas(valor: unknown, acumulado: Set<string> = new Set()): Set<string> {
  if (Array.isArray(valor)) {
    for (const elemento of valor) clavesProfundas(elemento, acumulado);
    return acumulado;
  }
  if (valor && typeof valor === 'object') {
    for (const [clave, hijo] of Object.entries(valor)) {
      acumulado.add(clave);
      clavesProfundas(hijo, acumulado);
    }
  }
  return acumulado;
}

/** Campos que, si aparecen, son un filtrado por definición. */
const CLAVES_PROHIBIDAS = [
  'correctOptionId',
  'impostorItemId',
  'bestOptionId',
  'correctValue',
  'answer',
  'accepted',
  'weight',
  'outcome',
  'correctSummary',
];

describe('la vista pública de la pregunta no filtra la solución', () => {
  const muestras = unaDeCada();

  it('el banco tiene una pregunta de cada familia para probar', () => {
    for (const tipo of QUESTION_TYPES) {
      expect(muestras.get(tipo), `falta una pregunta de tipo ${tipo}`).toBeDefined();
    }
  });

  it.each(QUESTION_TYPES)('%s: ningún campo delator en la vista', (tipo) => {
    const pregunta = muestras.get(tipo);
    expect(pregunta).toBeDefined();
    if (!pregunta) return;

    const claves = clavesProfundas(vistaDe(pregunta));
    for (const prohibida of CLAVES_PROHIBIDAS) {
      expect(claves.has(prohibida), `${tipo} manda el campo «${prohibida}»`).toBe(false);
    }
  });

  it('la respuesta escrita no viaja en ninguna parte de la vista', () => {
    const escritas = BANCO.filter((pregunta) => pregunta.type === 'SHORT_ANSWER').slice(0, 40);
    expect(escritas.length).toBeGreaterThan(10);

    for (const pregunta of escritas) {
      if (pregunta.type !== 'SHORT_ANSWER') continue;
      const serializada = JSON.stringify(vistaDe(pregunta));
      expect(
        serializada.includes(pregunta.answer),
        `${pregunta.id} filtra la respuesta «${pregunta.answer}»`,
      ).toBe(false);
      for (const aceptada of pregunta.accepted) {
        expect(serializada.includes(aceptada), `${pregunta.id} filtra «${aceptada}»`).toBe(false);
      }
    }
  });

  it('LA JUNTA no manda las consecuencias ni los pesos de las decisiones', () => {
    const juntas = BANCO.filter((pregunta) => pregunta.type === 'DECISION');
    expect(juntas.length).toBeGreaterThan(0);

    for (const pregunta of juntas) {
      if (pregunta.type !== 'DECISION') continue;
      const serializada = JSON.stringify(vistaDe(pregunta));
      for (const opcion of pregunta.options) {
        expect(
          serializada.includes(opcion.outcome),
          `${pregunta.id} filtra la consecuencia de «${opcion.text}»`,
        ).toBe(false);
      }
    }
  });

  it('ORDENA EL DESASTRE manda los pasos mezclados, no en su orden correcto', () => {
    const cronologias = BANCO.filter((pregunta) => pregunta.type === 'ORDER_CHAOS');
    expect(cronologias.length).toBeGreaterThan(3);

    let algunaMezclada = false;
    for (const pregunta of cronologias) {
      if (pregunta.type !== 'ORDER_CHAOS') continue;
      const vista = vistaDe(pregunta);
      const enviados = (vista.pasos ?? []).map((paso) => paso.id);
      const correctos = pregunta.steps.map((paso) => paso.id);
      expect(enviados).toHaveLength(correctos.length);
      // Debe llevar los mismos pasos…
      expect([...enviados].sort()).toEqual([...correctos].sort());
      // …y en al menos algunas el orden tiene que salir distinto del correcto.
      if (enviados.join() !== correctos.join()) algunaMezclada = true;
    }
    expect(algunaMezclada, 'el orden de presentación no mezcla nada').toBe(true);
  });

  it('¿QUIÉN ES? solo manda las pistas ya reveladas', () => {
    const conPistas = BANCO.filter((pregunta) => pregunta.type === 'WHO_IS_IT');
    expect(conPistas.length).toBeGreaterThan(0);

    for (const pregunta of conPistas.slice(0, 20)) {
      if (pregunta.type !== 'WHO_IS_IT') continue;
      const vista = vistaDe(pregunta);
      expect(vista.pistas).toHaveLength(1);
      // Las siguientes pistas no pueden estar en el payload.
      const serializada = JSON.stringify(vista);
      for (const pista of pregunta.clues.slice(1)) {
        expect(serializada.includes(pista), `${pregunta.id} filtra una pista futura`).toBe(false);
      }
    }
  });

  it('marcasDeSolucion y textoCorrecto cubren las once familias', () => {
    for (const tipo of QUESTION_TYPES) {
      const pregunta = muestras.get(tipo);
      if (!pregunta) continue;
      const correcto = textoCorrecto(pregunta);
      expect(correcto.texto.length, `${tipo} sin texto de respuesta`).toBeGreaterThan(0);
      // No revienta y devuelve algo utilizable en el revelado.
      expect(Array.isArray(marcasDeSolucion(pregunta))).toBe(true);
    }
  });
});
