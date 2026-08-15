/**
 * POST   /api/notificaciones/suscripcion — registra un dispositivo para Web Push.
 * DELETE /api/notificaciones/suscripcion — lo da de baja.
 *
 * El permiso del navegador NO se pide aquí ni al entrar en la portada: se pide después de
 * una acción que le dé sentido (añadir el primer amigo, empezar una racha). Esta ruta solo
 * guarda lo que el navegador ya ha concedido.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/server/db';
import { usuarioActual } from '@/server/cuentas/sesion';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const suscripcionSchema = z.object({
  endpoint: z.string().url().max(600),
  keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(200) }),
  dispositivo: z.string().max(80).optional(),
});

export async function POST(request: Request): Promise<Response> {
  const sesion = await usuarioActual();
  if (!sesion) return NextResponse.json({ ok: false }, { status: 401 });

  const parseado = suscripcionSchema.safeParse(await request.json().catch(() => null));
  if (!parseado.success) return NextResponse.json({ ok: false }, { status: 400 });

  const { endpoint, keys, dispositivo } = parseado.data;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: sesion.userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      ...(dispositivo ? { dispositivo } : {}),
      userAgent: request.headers.get('user-agent')?.slice(0, 200) ?? null,
    },
    update: { userId: sesion.userId, p256dh: keys.p256dh, auth: keys.auth, fallos: 0 },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request): Promise<Response> {
  const sesion = await usuarioActual();
  if (!sesion) return NextResponse.json({ ok: false }, { status: 401 });

  const parseado = z
    .object({ endpoint: z.string().max(600) })
    .safeParse(await request.json().catch(() => null));
  if (!parseado.success) return NextResponse.json({ ok: false }, { status: 400 });

  await prisma.pushSubscription.deleteMany({
    where: { endpoint: parseado.data.endpoint, userId: sesion.userId },
  });

  return NextResponse.json({ ok: true });
}
