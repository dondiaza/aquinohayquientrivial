import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { COSMETICOS } from './fusion';

/**
 * LA PRUEBA QUE HACE QUE LA DUPLICACIÓN NO MUERDA.
 *
 * `PlayerProfile` y `UserProfile` repiten los campos de apariencia. Esa deuda se acepta a
 * conciencia —extraerlos a otra tabla es una migración con reescritura en producción para
 * arreglar algo que hoy no falla—, pero tenía una consecuencia mala: al migrar de invitado a
 * cuenta había que copiar campo a campo a mano, y **el avatar se quedó sin copiar durante
 * varias fases** sin que nada lo dijera.
 *
 * Esto lee el esquema de Prisma y compara las columnas de apariencia que existen de verdad con
 * la lista que se traspasa. Añadir «sombrero» al avatar y olvidarse de la fusión deja de ser
 * posible en silencio: el test se pone rojo con el nombre del campo que falta.
 */

const ESQUEMA = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');

/** Columnas de un modelo, leídas del esquema. */
function columnasDe(modelo: string): string[] {
  const bloque = ESQUEMA.match(new RegExp(`model ${modelo} \\{([\\s\\S]*?)\\n\\}`));
  if (!bloque?.[1]) throw new Error(`No encuentro el modelo ${modelo} en schema.prisma`);

  return bloque[1]
    .split('\n')
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0 && !linea.startsWith('//') && !linea.startsWith('///'))
    .filter((linea) => !linea.startsWith('@@'))
    .map((linea) => linea.split(/\s+/)[0] ?? '')
    .filter(Boolean);
}

/**
 * Lo que NO es apariencia y por tanto no debe traspasarse.
 *
 * Cada exclusión lleva su motivo: una lista de nombres sueltos se convierte en un cajón donde
 * acaba todo lo que dé pereza pensar.
 */
const NO_ES_APARIENCIA = new Set([
  'id', // técnico
  'guestId', // técnico
  'guest', // relación
  'displayName', // el nombre lo elige la cuenta, no se hereda del invitado
  'xp', // progreso, se recalcula sumando invitados
  'gamesFinished',
  'bestScore',
  'bestStreak',
  'totalCorrect',
  'totalAnswers',
  'createdAt',
  'updatedAt',
  'achievements', // relación
]);

describe('la fusión de apariencia', () => {
  it('traspasa TODOS los campos de apariencia que existen en el invitado', () => {
    const delInvitado = columnasDe('PlayerProfile').filter(
      (columna) => !NO_ES_APARIENCIA.has(columna),
    );
    const traspasados = new Set(COSMETICOS.map((campo) => campo.de));

    const olvidados = delInvitado.filter((columna) => !traspasados.has(columna as never));

    expect(
      olvidados,
      `Hay columnas de apariencia en PlayerProfile que no se traspasan a la cuenta: ` +
        `${olvidados.join(', ')}. Añádelas a COSMETICOS en fusion.ts, o a NO_ES_APARIENCIA ` +
        `con su motivo si de verdad no deben heredarse.`,
    ).toEqual([]);
  });

  it('todos los destinos existen en UserProfile', () => {
    const deLaCuenta = new Set(columnasDe('UserProfile'));
    const inexistentes = COSMETICOS.filter((campo) => !deLaCuenta.has(campo.a)).map(
      (campo) => campo.a,
    );
    expect(inexistentes, `destinos que no existen: ${inexistentes.join(', ')}`).toEqual([]);
  });

  it('no traspasa nada dos veces', () => {
    const destinos = COSMETICOS.map((campo) => campo.a);
    expect(new Set(destinos).size).toBe(destinos.length);
  });
});
