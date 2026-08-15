/**
 * GET  /api/notificaciones — el buzón.
 * POST /api/notificaciones — marcar como leídas.
 *
 * El buzón es la red de seguridad del sistema: aunque alguien tenga el push apagado, todo lo
 * importante está aquí. Por eso esta ruta no filtra por preferencias.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { buzon, marcarLeida, marcarTodasLeidas, sinLeer } from '@/server/notificaciones/service';
import { usuarioActual } from '@/server/cuentas/sesion';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
  const sesion = await usuarioActual();
  if (!sesion) return NextResponse.json({ ok: false }, { status: 401 });

  const url = new URL(request.url);
  const soloNoLeidas = url.searchParams.get('sinLeer') === '1';

  const [lista, pendientes] = await Promise.all([
    buzon(sesion.userId, { soloNoLeidas }),
    sinLeer(sesion.userId),
  ]);

  return NextResponse.json({
    ok: true,
    sinLeer: pendientes,
    notificaciones: lista.map((entrada) => ({
      id: entrada.id,
      tipo: entrada.tipo,
      categoria: entrada.categoria,
      titulo: entrada.titulo,
      cuerpo: entrada.cuerpo,
      deepLink: entrada.deepLink,
      leida: entrada.readAt !== null,
      creada: entrada.createdAt.toISOString(),
    })),
  });
}

const cuerpoSchema = z.object({ id: z.string().max(64).optional(), todas: z.boolean().optional() });

export async function POST(request: Request): Promise<Response> {
  const sesion = await usuarioActual();
  if (!sesion) return NextResponse.json({ ok: false }, { status: 401 });

  const parseado = cuerpoSchema.safeParse(await request.json().catch(() => ({})));
  if (!parseado.success) return NextResponse.json({ ok: false }, { status: 400 });

  if (parseado.data.todas) {
    const cuantas = await marcarTodasLeidas(sesion.userId);
    return NextResponse.json({ ok: true, marcadas: cuantas });
  }

  if (parseado.data.id) {
    await marcarLeida(sesion.userId, parseado.data.id);
    return NextResponse.json({ ok: true, marcadas: 1 });
  }

  return NextResponse.json({ ok: false }, { status: 400 });
}
