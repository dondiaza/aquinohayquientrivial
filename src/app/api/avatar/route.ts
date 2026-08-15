/**
 * Guardar el vecino dibujado.
 *
 * Sirve a los dos casos sin ramificar la interfaz: con cuenta se guarda en la cuenta, sin
 * cuenta se guarda en el invitado de este navegador. El creador no necesita saber en cuál
 * de los dos está: manda la configuración y ya.
 *
 * Toda la validación vive en `sanearAvatar`, que es total: no rechaza, corrige. Un id de
 * pieza inventado no debe devolver un 400 al jugador, debe caer al valor por defecto.
 */

import { NextResponse } from 'next/server';

import { guardarAvatarDeInvitado, guardarAvatarDeUsuario } from '@/server/avatar/service';
import { idUsuarioActual } from '@/server/cuentas/sesion';
import { ensureGuestId, ensureGuestPlayer } from '@/server/guest';

export const dynamic = 'force-dynamic';

export async function POST(peticion: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await peticion.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo ilegible.' }, { status: 400 });
  }

  const userId = await idUsuarioActual();
  if (userId) {
    const config = await guardarAvatarDeUsuario(userId, cuerpo);
    return NextResponse.json({ ok: true, destino: 'cuenta', config });
  }

  const publicId = await ensureGuestId();
  const guestId = await ensureGuestPlayer(publicId);
  const config = await guardarAvatarDeInvitado(guestId, cuerpo);
  return NextResponse.json({ ok: true, destino: 'dispositivo', config });
}
