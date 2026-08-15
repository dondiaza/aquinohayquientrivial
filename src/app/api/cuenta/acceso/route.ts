/**
 * POST /api/cuenta/acceso — pide un código de acceso por correo.
 *
 * Responde SIEMPRE lo mismo, exista la cuenta o no. Si el mensaje cambiara, cualquiera
 * podría averiguar quién está registrado escribiendo direcciones (§4: account enumeration).
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { pedirCodigo } from '@/server/cuentas/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const cuerpoSchema = z.object({ email: z.string().min(3).max(254) });

export async function POST(request: Request): Promise<Response> {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const parseado = cuerpoSchema.safeParse(cuerpo);
  // Incluso con un cuerpo inválido se responde ok: no se confirma ni se niega nada.
  if (!parseado.success) return NextResponse.json({ ok: true });

  const resultado = await pedirCodigo(parseado.data.email);

  return NextResponse.json({
    ok: true,
    mensaje: 'Si esa dirección tiene cuenta o puede tenerla, le hemos mandado un código.',
    ...(resultado.codigoDesarrollo ? { codigoDesarrollo: resultado.codigoDesarrollo } : {}),
  });
}
