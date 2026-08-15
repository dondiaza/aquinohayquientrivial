/**
 * POST /api/cuenta/salir — cierra la sesión de ESTE dispositivo.
 *
 * Cerrar aquí no toca las demás sesiones a propósito (§72): salir del móvil prestado no
 * debe echarte del portátil de casa. Para lo otro está «cerrar las demás sesiones».
 */

import { NextResponse } from 'next/server';

import { cerrarSesion } from '@/server/cuentas/auth';
import { quitarCookieSesion, usuarioActual } from '@/server/cuentas/sesion';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(): Promise<Response> {
  const sesion = await usuarioActual();
  if (sesion) await cerrarSesion(sesion.sessionId);
  await quitarCookieSesion();
  return NextResponse.json({ ok: true });
}
