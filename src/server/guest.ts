/**
 * Jugador invitado: nada de registro, solo un identificador anónimo en una cookie.
 *
 * `readGuestId` se puede usar desde cualquier sitio (incluidos Server Components).
 * `ensureGuestId` ESCRIBE la cookie, así que solo vale en Route Handlers y Server
 * Actions (Next no permite escribir cookies durante el render de un RSC).
 */

import { cookies } from 'next/headers';

import { prisma } from './db';

export const GUEST_COOKIE = 'ahqv_guest';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function readGuestId(): Promise<string | null> {
  const store = await cookies();
  return store.get(GUEST_COOKIE)?.value ?? null;
}

export async function ensureGuestId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(GUEST_COOKIE)?.value;
  if (existing) return existing;

  const publicId = crypto.randomUUID();
  store.set(GUEST_COOKIE, publicId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
    secure: process.env.NODE_ENV === 'production',
  });
  return publicId;
}

/** Crea (o refresca) la fila del invitado y devuelve su id interno. */
export async function ensureGuestPlayer(publicId: string, displayName?: string): Promise<string> {
  const guest = await prisma.guestPlayer.upsert({
    where: { publicId },
    create: { publicId, displayName: displayName ?? null },
    update: displayName ? { displayName } : {},
    select: { id: true },
  });
  return guest.id;
}

/** Id interno del invitado actual, si existe cookie y fila. */
export async function currentGuestPlayerId(): Promise<string | null> {
  const publicId = await readGuestId();
  if (!publicId) return null;
  const guest = await prisma.guestPlayer.findUnique({ where: { publicId }, select: { id: true } });
  return guest?.id ?? null;
}
