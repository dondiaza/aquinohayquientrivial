/**
 * POST /api/cuenta/canjear — canjea el código, crea la cuenta si hace falta y ata el
 * progreso del invitado.
 *
 * Es el único sitio donde se crea una sesión. Devuelve qué se ha heredado del invitado para
 * poder celebrarlo en pantalla: ver «has conservado 42 partidas» es lo que hace que
 * registrarse no dé miedo.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { canjearCodigo, crearSesion } from '@/server/cuentas/auth';
import { entrarConCorreo } from '@/server/cuentas/service';
import { ponerCookieSesion } from '@/server/cuentas/sesion';
import { readGuestId } from '@/server/guest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const cuerpoSchema = z.object({
  email: z.string().min(3).max(254),
  codigo: z.string().min(4).max(20),
  timezone: z.string().max(64).optional(),
});

const MENSAJES: Record<string, string> = {
  INVALIDO: 'Ese código no vale. Comprueba que lo has copiado entero.',
  CADUCADO: 'Ese código ha caducado. Pide otro, tarda un segundo.',
  USADO: 'Ese código ya se ha usado.',
  DEMASIADOS_INTENTOS: 'Demasiados intentos. Pide un código nuevo.',
};

export async function POST(request: Request): Promise<Response> {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ ok: false, mensaje: MENSAJES.INVALIDO }, { status: 400 });
  }

  const parseado = cuerpoSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return NextResponse.json({ ok: false, mensaje: MENSAJES.INVALIDO }, { status: 400 });
  }

  const canje = await canjearCodigo(parseado.data.email, parseado.data.codigo);
  if (!canje.ok) {
    return NextResponse.json(
      { ok: false, mensaje: MENSAJES[canje.motivo] ?? MENSAJES.INVALIDO },
      { status: 401 },
    );
  }

  const guestPublicId = await readGuestId();
  const cuenta = await entrarConCorreo(
    canje.email,
    guestPublicId,
    parseado.data.timezone ?? 'Europe/Madrid',
  );

  const sesion = await crearSesion(cuenta.userId, {
    userAgent: request.headers.get('user-agent') ?? undefined,
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
  });
  await ponerCookieSesion(sesion.token, sesion.expiresAt);

  console.info('[cuenta] acceso', { userId: cuenta.userId, nueva: cuenta.nueva });

  return NextResponse.json({
    ok: true,
    username: cuenta.username,
    friendCode: cuenta.friendCode,
    nueva: cuenta.nueva,
    migrado: cuenta.migrado,
  });
}
