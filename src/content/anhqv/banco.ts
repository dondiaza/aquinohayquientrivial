/**
 * BANCO DE PREGUNTAS ANHQV — punto de entrada único.
 *
 * SOLO PARA NODE (seed, tests y scripts). El fichero de preguntas del pack pesa 470 KB y
 * la app no lo necesita en ningún momento: en producción las preguntas se leen de
 * Postgres. Cargarlo con `fs` en lugar de importarlo evita meterlo en el bundle de Next
 * y evita que TypeScript infiera un tipo literal de 958 objetos en cada `tsc`.
 *
 * Lo que sale de aquí ya está validado con Zod: si el pack trae algo mal formado, el seed
 * falla en vez de sembrar basura.
 */

import { readFileSync } from 'node:fs';

import { assembleQuestion, questionRecordSchema, type QuestionRecord } from '@/domain/questions/schemas';
import type { Question } from '@/domain/questions/types';

import { preguntasDerivadas } from './derivadas';
import { preguntasVisuales } from './visuales';
import { importarPack, type Diagnostico } from './importar';
import type { PreguntaPack } from './tipos';

/** Lee el JSON del pack tal y como lo entregó el equipo editorial. */
export function preguntasDelPack(): PreguntaPack[] {
  const ruta = new URL('./data/preguntas.json', import.meta.url);
  return JSON.parse(readFileSync(ruta, 'utf8')) as PreguntaPack[];
}

export type BancoANHQV = {
  registros: QuestionRecord[];
  diagnostico: Diagnostico & { derivadas: number };
};

/**
 * Banco completo: el pack traducido + el contenido derivado de la biblia editorial.
 * Valida todo y revienta con el id concreto si algo no cuadra.
 */
export function bancoANHQV(): BancoANHQV {
  const { registros: delPack, diagnostico } = importarPack(preguntasDelPack());
  const derivadas = preguntasDerivadas();
  // Las visuales solo existen si hay caras en disco: si no hay material, no se generan y el
  // banco sigue funcionando igual. Ver src/content/anhqv/visuales.ts.
  const visuales = preguntasVisuales();

  const vistos = new Set<string>();
  const validados: QuestionRecord[] = [];

  for (const registro of [...delPack, ...derivadas, ...visuales]) {
    let validado: QuestionRecord;
    try {
      validado = questionRecordSchema.parse(registro);
    } catch (error) {
      const detalle = error instanceof Error ? error.message : String(error);
      throw new Error(`Pregunta inválida ${registro.id} (${registro.type}): ${detalle}`);
    }
    if (vistos.has(validado.id)) {
      throw new Error(`Id de pregunta repetido: ${validado.id}`);
    }
    vistos.add(validado.id);
    validados.push(validado);
  }

  for (const registro of derivadas) {
    diagnostico.porTipo[registro.type] = (diagnostico.porTipo[registro.type] ?? 0) + 1;
    const familia = registro.variant ?? 'derivada';
    diagnostico.porFamilia[familia] = (diagnostico.porFamilia[familia] ?? 0) + 1;
  }

  return {
    registros: validados,
    diagnostico: { ...diagnostico, derivadas: derivadas.length + visuales.length },
  };
}

/** El banco como preguntas listas para el motor. Lo usan los tests. */
export function preguntasANHQV(): Question[] {
  return bancoANHQV().registros.map(assembleQuestion);
}

/** Solo lo jugable: ACTIVE y sin marcar para revisión. */
export function preguntasJugables(): Question[] {
  return preguntasANHQV().filter(
    (pregunta) => pregunta.status === 'ACTIVE' && !pregunta.needsReview,
  );
}
