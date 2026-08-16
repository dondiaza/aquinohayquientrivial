/**
 * LO COSMÉTICO DEL INVITADO, AL PASAR A CUENTA — en un solo sitio.
 *
 * ## El problema, y por qué no se ha resuelto en el esquema
 *
 * `PlayerProfile` (invitado) y `UserProfile` (cuenta) repiten los mismos campos de apariencia:
 * arquetipo, color, marco y el vecino dibujado. Lo limpio sería extraerlos a una tabla
 * aparte, pero eso es una migración con reescritura de datos en producción para arreglar algo
 * que hoy no está roto — y el riesgo es mayor que la deuda.
 *
 * Lo que sí estaba roto era otra cosa: **la copia se hacía a mano y campo a campo**, repartida
 * entre `migrarInvitado` y el servicio de avatar. Ya se me olvidó el avatar una vez, y solo se
 * detectó porque alguien miró.
 *
 * Así que la duplicación se acepta y se centraliza el traspaso aquí. La lista `COSMETICOS` es
 * la fuente: añadir un campo de apariencia obliga a tocarla, y hay una prueba que compara esa
 * lista con las columnas reales del modelo y falla si aparece una columna nueva sin traspasar.
 * La deuda sigue, pero deja de poder morder en silencio.
 */

import { prisma } from '../db';
import { sanearAvatar } from '@/domain/avatar/config';

/**
 * Campos de apariencia que viajan del invitado a la cuenta.
 *
 * `de` es la columna en `PlayerProfile`, `a` la de `UserProfile`. Están separadas porque no
 * siempre se llaman igual y confiar en que coincidan es exactamente el descuido que esto
 * viene a evitar.
 */
export const COSMETICOS = [
  { de: 'arquetipo', a: 'arquetipo' },
  { de: 'colorAvatar', a: 'colorAvatar' },
  { de: 'marco', a: 'marco' },
  { de: 'avatarConfig', a: 'avatarConfig' },
] as const;

export type ResultadoFusion = {
  copiados: string[];
  respetados: string[];
};

/**
 * Traspasa la apariencia del invitado a la cuenta.
 *
 * **No pisa lo que la cuenta ya tenga.** Alguien que entra desde un móvil prestado no debe
 * cargarse el vecino que se hizo en el suyo; el invitado del navegador ajeno es el que cede,
 * no al revés.
 */
export async function fusionarApariencia(
  userId: string,
  guestId: string,
): Promise<ResultadoFusion> {
  const [invitado, cuenta] = await Promise.all([
    prisma.playerProfile.findUnique({ where: { guestId } }),
    prisma.userProfile.findUnique({ where: { userId } }),
  ]);

  const copiados: string[] = [];
  const respetados: string[] = [];
  if (!invitado) return { copiados, respetados };

  const datos: Record<string, unknown> = {};

  for (const campo of COSMETICOS) {
    const valorInvitado = (invitado as unknown as Record<string, unknown>)[campo.de];
    const valorCuenta = cuenta
      ? (cuenta as unknown as Record<string, unknown>)[campo.a]
      : undefined;

    // Nada que copiar.
    if (valorInvitado === null || valorInvitado === undefined) continue;

    // La cuenta ya tiene algo puesto a mano: se respeta.
    const cuentaTieneAlgo =
      valorCuenta !== null && valorCuenta !== undefined && valorCuenta !== '';
    if (cuentaTieneAlgo && esPersonalizado(campo.a, valorCuenta)) {
      respetados.push(campo.a);
      continue;
    }

    datos[campo.a] =
      campo.a === 'avatarConfig' ? sanearAvatar(valorInvitado) : valorInvitado;
    copiados.push(campo.a);
  }

  if (Object.keys(datos).length > 0) {
    await prisma.userProfile.upsert({
      where: { userId },
      create: { userId, ...datos },
      update: datos,
    });
  }

  return { copiados, respetados };
}

/**
 * ¿El valor de la cuenta es algo que eligió una persona, o el valor por defecto del esquema?
 *
 * Sin esta distinción no se copiaría nunca nada: `UserProfile` nace con `arquetipo:
 * 'presidente'` y `colorAvatar: 'verde'`, así que «la cuenta ya tiene algo» sería siempre
 * cierto y el invitado no traspasaría jamás su apariencia.
 */
const POR_DEFECTO: Record<string, unknown> = {
  arquetipo: 'presidente',
  colorAvatar: 'verde',
  marco: 'ninguno',
};

function esPersonalizado(campo: string, valor: unknown): boolean {
  if (!(campo in POR_DEFECTO)) return true; // avatarConfig: si hay algo, lo eligió alguien
  return valor !== POR_DEFECTO[campo];
}
