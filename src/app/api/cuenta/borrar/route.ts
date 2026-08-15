/**
 * POST /api/cuenta/borrar — pide el borrado, o lo cancela.
 *
 * Hay periodo de gracia (§74): se puede volver atrás. Y no se borra en cascada, se
 * anonimiza: las clasificaciones de salas y los desafíos de otras personas hacen referencia
 * a esta cuenta, y borrarlas dejaría agujeros en el historial de terceros.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { DIAS_GRACIA_BORRADO, cancelarBorrado, pedirBorrado } from '@/server/cuentas/service';
import { quitarCookieSesion, usuarioActual } from '@/server/cuentas/sesion';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  const sesion = await usuarioActual();
  if (!sesion) return NextResponse.json({ ok: false }, { status: 401 });

  const parseado = z
    .object({ cancelar: z.boolean().optional(), confirmacion: z.string().max(40).optional() })
    .safeParse(await request.json().catch(() => ({})));
  if (!parseado.success) return NextResponse.json({ ok: false }, { status: 400 });

  if (parseado.data.cancelar) {
    await cancelarBorrado(sesion.userId);
    return NextResponse.json({ ok: true, cancelado: true });
  }

  // Se escribe el nombre de usuario para confirmar: un botón suelto se pulsa sin querer.
  if (parseado.data.confirmacion !== sesion.cuenta.username) {
    return NextResponse.json(
      { ok: false, mensaje: 'Escribe tu nombre de usuario para confirmar.' },
      { status: 400 },
    );
  }

  const cuando = await pedirBorrado(sesion.userId);
  await quitarCookieSesion();

  return NextResponse.json({
    ok: true,
    borraEl: cuando.toISOString(),
    diasDeGracia: DIAS_GRACIA_BORRADO,
    mensaje: `Tu cuenta se borrará en ${DIAS_GRACIA_BORRADO} días. Si vuelves a entrar antes, se cancela.`,
  });
}
