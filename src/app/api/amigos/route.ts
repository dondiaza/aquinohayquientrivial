/**
 * API de amigos: listar, buscar por código, solicitar, aceptar, rechazar, eliminar y
 * bloquear.
 *
 * Todo pasa por el servicio, que es quien conoce las reglas (bloqueo gana siempre, límite de
 * amigos, privacidad de quién puede solicitar). Aquí solo se comprueba la sesión y se valida
 * la entrada.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { cuentaPorFriendCode, cuentaPorUsername } from '@/server/cuentas/service';
import { usuarioActual } from '@/server/cuentas/sesion';
import {
  aceptarSolicitud,
  amigosDe,
  bloquear,
  desbloquear,
  eliminarAmigo,
  enviarSolicitud,
  rechazarSolicitud,
  solicitudesPendientes,
} from '@/server/social/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  const sesion = await usuarioActual();
  if (!sesion) return NextResponse.json({ ok: false }, { status: 401 });

  const [amigos, solicitudes] = await Promise.all([
    amigosDe(sesion.userId),
    solicitudesPendientes(sesion.userId),
  ]);

  return NextResponse.json({
    ok: true,
    amigos,
    solicitudes: solicitudes.map((solicitud) => ({
      id: solicitud.id,
      username: solicitud.solicitante.username,
      arquetipo: solicitud.solicitante.profile?.arquetipo ?? 'presidente',
      colorAvatar: solicitud.solicitante.profile?.colorAvatar ?? 'verde',
      nivel: solicitud.solicitante.profile?.nivel ?? 1,
    })),
  });
}

const accionSchema = z.discriminatedUnion('accion', [
  z.object({ accion: z.literal('solicitar'), codigo: z.string().max(40).optional(), username: z.string().max(20).optional() }),
  z.object({ accion: z.literal('aceptar'), requestId: z.string().max(64) }),
  z.object({ accion: z.literal('rechazar'), requestId: z.string().max(64) }),
  z.object({ accion: z.literal('eliminar'), userId: z.string().max(64) }),
  z.object({ accion: z.literal('bloquear'), userId: z.string().max(64) }),
  z.object({ accion: z.literal('desbloquear'), userId: z.string().max(64) }),
]);

export async function POST(request: Request): Promise<Response> {
  const sesion = await usuarioActual();
  if (!sesion) return NextResponse.json({ ok: false }, { status: 401 });

  const parseado = accionSchema.safeParse(await request.json().catch(() => null));
  if (!parseado.success) {
    return NextResponse.json({ ok: false, mensaje: 'Petición inválida.' }, { status: 400 });
  }

  const datos = parseado.data;

  if (datos.accion === 'solicitar') {
    const objetivo = datos.codigo
      ? await cuentaPorFriendCode(datos.codigo)
      : datos.username
        ? await cuentaPorUsername(datos.username)
        : null;

    // Mismo mensaje exista o no: no se confirma quién está registrado.
    if (!objetivo) {
      return NextResponse.json(
        { ok: false, mensaje: 'No hemos encontrado a ese vecino.' },
        { status: 404 },
      );
    }

    const resultado = await enviarSolicitud(sesion.userId, objetivo.id);
    return NextResponse.json(resultado, { status: resultado.ok ? 200 : 409 });
  }

  const resultado =
    datos.accion === 'aceptar'
      ? await aceptarSolicitud(sesion.userId, datos.requestId)
      : datos.accion === 'rechazar'
        ? await rechazarSolicitud(sesion.userId, datos.requestId)
        : datos.accion === 'eliminar'
          ? await eliminarAmigo(sesion.userId, datos.userId)
          : datos.accion === 'bloquear'
            ? await bloquear(sesion.userId, datos.userId)
            : await desbloquear(sesion.userId, datos.userId);

  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 409 });
}
