/**
 * POST /api/salas/[code]/intencion — la ÚNICA puerta por la que un cliente cambia algo.
 *
 * El móvil manda intenciones («he pulsado la B», «uso Radio Patio»), nunca resultados. Aquí
 * se comprueba, en este orden:
 *
 *   1. que el cuerpo es una intención válida (Zod);
 *   2. que quien la manda es quien dice ser (token → identidad);
 *   3. que su intención le corresponde (los controles de host solo para el host);
 *   4. y todo lo demás —fase, ventana de tiempo, duplicados— lo decide el reducer, que es
 *      el único que sabe de reglas.
 *
 * La puntuación se calcula aquí dentro, en el servidor, con el reloj del servidor. Nada de
 * lo que llegue del cliente puede sumar un punto por sí mismo.
 */

import { NextResponse } from 'next/server';

import {
  esIntencionDeHost,
  intencionClienteSchema,
  MENSAJE_ERROR,
} from '@/domain/party/protocolo';
import { tokenDePeticion } from '@/server/party/autorizacion';
import { aplicar, cargarSala, controlDeHost, identificar } from '@/server/party/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<Response> {
  const { code } = await params;

  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'ENTRADA_INVALIDA', mensaje: MENSAJE_ERROR.ENTRADA_INVALIDA },
      { status: 400 },
    );
  }

  const parseada = intencionClienteSchema.safeParse(cuerpo.intencion ?? cuerpo);
  if (!parseada.success) {
    return NextResponse.json(
      { ok: false, error: 'ENTRADA_INVALIDA', mensaje: MENSAJE_ERROR.ENTRADA_INVALIDA },
      { status: 400 },
    );
  }
  const intencion = parseada.data;

  const sala = await cargarSala(code);
  if (!sala) {
    return NextResponse.json(
      { ok: false, error: 'SALA_NO_EXISTE', mensaje: MENSAJE_ERROR.SALA_NO_EXISTE },
      { status: 404 },
    );
  }

  const identidad = identificar(sala, tokenDePeticion(request, cuerpo));

  // Comprobación de rol ANTES de tocar nada: un jugador no puede ni intentar expulsar.
  if (esIntencionDeHost(intencion.type) && identidad.rol !== 'HOST') {
    return NextResponse.json(
      { ok: false, error: 'NO_AUTORIZADO', mensaje: MENSAJE_ERROR.NO_AUTORIZADO },
      { status: 403 },
    );
  }
  if (!esIntencionDeHost(intencion.type) && identidad.playerId === null) {
    return NextResponse.json(
      { ok: false, error: 'NO_AUTORIZADO', mensaje: MENSAJE_ERROR.NO_AUTORIZADO },
      { status: 403 },
    );
  }

  // Los controles que solo tocan columnas (cerrar sala, expulsar, equipos…) se resuelven
  // fuera del reducer; si devuelve null, es que le toca al reducer.
  if (esIntencionDeHost(intencion.type)) {
    const directo = await controlDeHost(code, identidad, intencion);
    if (directo !== null) {
      if (!directo.ok) {
        return NextResponse.json(
          { ok: false, error: directo.error, mensaje: directo.mensaje },
          { status: 409 },
        );
      }
      return NextResponse.json(directo);
    }
  }

  const resultado = await aplicar(code, identidad, intencion);

  if (!resultado.ok) {
    // 409 y no 400: la petición era correcta, lo que no encaja es el momento.
    return NextResponse.json(
      { ok: false, error: resultado.error, mensaje: resultado.mensaje },
      { status: 409 },
    );
  }

  return NextResponse.json(resultado);
}
