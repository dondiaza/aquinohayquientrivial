/**
 * GET /api/salas/[code]/snapshot — la foto completa, ya filtrada para quien pregunta.
 *
 * Se pide al conectar y al volver de segundo plano (§30: el móvil se bloquea, cambias de
 * app, vuelves). Con el snapshot más el cursor de eventos, un cliente nunca se queda a
 * medias: o tiene la foto entera, o tiene la foto entera más lo que ha pasado desde ella.
 *
 * Lleva `privada`, que es lo único que depende de la identidad: tus opciones descartadas,
 * tu tiempo extra, si ya has respondido. Un host o un espectador reciben `privada: null`.
 */

import { NextResponse } from 'next/server';

import { esCodigoValido, normalizarCodigo } from '@/domain/party/codigo';
import { MENSAJE_ERROR } from '@/domain/party/protocolo';
import { tokenDePeticion } from '@/server/party/autorizacion';
import { cargarSala, identificar, snapshot, tictac } from '@/server/party/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<Response> {
  const { code: bruto } = await params;
  const code = normalizarCodigo(bruto);

  if (!esCodigoValido(code)) {
    return NextResponse.json(
      { ok: false, error: 'SALA_NO_EXISTE', mensaje: MENSAJE_ERROR.SALA_NO_EXISTE },
      { status: 404 },
    );
  }

  const sala = await cargarSala(code);
  if (!sala) {
    return NextResponse.json(
      { ok: false, error: 'SALA_NO_EXISTE', mensaje: MENSAJE_ERROR.SALA_NO_EXISTE },
      { status: 404 },
    );
  }

  // Se aprovecha para empujar las fases vencidas: quien pide la foto la quiere al día.
  await tictac(code);

  const identidad = identificar(sala, tokenDePeticion(request));
  const vista = await snapshot(code, identidad);
  if (!vista) {
    return NextResponse.json(
      { ok: false, error: 'SALA_NO_EXISTE', mensaje: MENSAJE_ERROR.SALA_NO_EXISTE },
      { status: 404 },
    );
  }

  return NextResponse.json(
    { ok: true, sala: vista, rol: identidad.rol, playerId: identidad.playerId, seq: sala.room.seq },
    { headers: { 'cache-control': 'no-store' } },
  );
}
