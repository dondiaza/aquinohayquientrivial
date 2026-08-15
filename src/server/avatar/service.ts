/**
 * Guardar y leer el vecino dibujado.
 *
 * Un solo sitio decide de dónde sale el avatar de alguien, con este orden:
 *
 *   1. la configuración que ha guardado esa persona (cuenta);
 *   2. la que guardó como invitado, si todavía no tiene cuenta;
 *   3. ninguna → se pinta el avatar de arquetipo de siempre.
 *
 * El paso 2 importa más de lo que parece: alguien entra por un enlace de WhatsApp, se hace
 * un personaje en veinte segundos, juega, y solo DESPUÉS se registra. Si al registrarse
 * perdiera el personaje, no se registraría una segunda vez.
 */

import type { Prisma } from '@prisma/client';

import { prisma } from '../db';
import { sanearAvatar, type AvatarConfig } from '@/domain/avatar/config';

/** Convierte lo que hay en base (Json, quizá basura, quizá null) en algo pintable. */
function desdeJson(valor: Prisma.JsonValue | null | undefined): AvatarConfig | null {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return null;
  return sanearAvatar(valor);
}

export async function avatarDeUsuario(userId: string): Promise<AvatarConfig | null> {
  const perfil = await prisma.userProfile.findUnique({
    where: { userId },
    select: { avatarConfig: true },
  });
  return desdeJson(perfil?.avatarConfig);
}

export async function avatarDeInvitado(guestId: string): Promise<AvatarConfig | null> {
  const perfil = await prisma.playerProfile.findUnique({
    where: { guestId },
    select: { avatarConfig: true },
  });
  return desdeJson(perfil?.avatarConfig);
}

/** Varios de golpe, para la clasificación y el marcador de la sala: una consulta, no N. */
export async function avataresDeUsuarios(
  ids: readonly string[],
): Promise<Map<string, AvatarConfig>> {
  if (ids.length === 0) return new Map();
  const perfiles = await prisma.userProfile.findMany({
    where: { userId: { in: [...ids] } },
    select: { userId: true, avatarConfig: true },
  });
  const mapa = new Map<string, AvatarConfig>();
  for (const perfil of perfiles) {
    const config = desdeJson(perfil.avatarConfig);
    if (config) mapa.set(perfil.userId, config);
  }
  return mapa;
}

export async function guardarAvatarDeUsuario(
  userId: string,
  bruto: unknown,
): Promise<AvatarConfig> {
  const config = sanearAvatar(bruto);
  await prisma.userProfile.upsert({
    where: { userId },
    create: { userId, avatarConfig: config },
    update: { avatarConfig: config },
  });
  return config;
}

export async function guardarAvatarDeInvitado(
  guestId: string,
  bruto: unknown,
): Promise<AvatarConfig> {
  const config = sanearAvatar(bruto);
  await prisma.playerProfile.upsert({
    where: { guestId },
    create: { guestId, avatarConfig: config },
    update: { avatarConfig: config },
  });
  return config;
}

/**
 * Al registrarse: si el invitado tenía vecino y la cuenta no, se lo lleva.
 *
 * No pisa lo que ya haya en la cuenta. Alguien que entra desde un móvil prestado no debe
 * cargarse el personaje que hizo en el suyo.
 */
export async function heredarAvatarDeInvitado(
  userId: string,
  guestId: string,
): Promise<AvatarConfig | null> {
  const [delInvitado, deLaCuenta] = await Promise.all([
    avatarDeInvitado(guestId),
    avatarDeUsuario(userId),
  ]);
  if (!delInvitado || deLaCuenta) return deLaCuenta;
  return guardarAvatarDeUsuario(userId, delInvitado);
}
