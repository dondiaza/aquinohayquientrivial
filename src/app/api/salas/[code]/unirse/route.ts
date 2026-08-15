/**
 * POST /api/salas/[code]/unirse — entrar en una sala o recuperar la identidad.
 *
 * Es la misma llamada para las dos cosas a propósito: si el navegador manda un token que
 * la sala reconoce, se RECUPERA su jugador (nada de duplicados al recargar); si no, se da de
 * alta uno nuevo. Ese detalle es lo que hace que «recargar el móvil» no rompa una partida.
 *
 * Errores en castellano y sin códigos técnicos: lo que llega a pantalla es «Esa comunidad no
 * existe. Revisa el código.» y no un 404 pelado.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { MENSAJE_ERROR } from '@/domain/party/protocolo';
import { NICK_MAX } from '@/domain/party/saneado';
import { unirse } from '@/server/party/service';
import { readGuestId } from '@/server/guest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const cuerpoSchema = z.object({
  nickname: z.string().min(1).max(NICK_MAX + 10),
  arquetipo: z.string().max(40).optional(),
  colorAvatar: z.string().max(40).optional(),
  teamId: z.string().max(64).nullable().optional(),
  token: z.string().max(200).nullable().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<Response> {
  const { code } = await params;

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'ENTRADA_INVALIDA', mensaje: MENSAJE_ERROR.ENTRADA_INVALIDA },
      { status: 400 },
    );
  }

  const parseado = cuerpoSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return NextResponse.json(
      { ok: false, error: 'NOMBRE_INVALIDO', mensaje: MENSAJE_ERROR.NOMBRE_INVALIDO },
      { status: 400 },
    );
  }

  // Si ya tenía cookie de invitado, se enlaza: así el progreso de Fase 2 sigue siendo suyo.
  const guestId = await readGuestId();

  const resultado = await unirse({
    code,
    nickname: parseado.data.nickname,
    ...(parseado.data.arquetipo ? { arquetipo: parseado.data.arquetipo } : {}),
    ...(parseado.data.colorAvatar ? { colorAvatar: parseado.data.colorAvatar } : {}),
    ...(parseado.data.teamId !== undefined ? { teamId: parseado.data.teamId } : {}),
    ...(parseado.data.token ? { token: parseado.data.token } : {}),
    ...(guestId ? { guestId } : {}),
  });

  if (!resultado.ok) {
    const error = resultado.error;
    const estado =
      error.ok === false && (error.error === 'SALA_NO_EXISTE' || error.error === 'SALA_CERRADA')
        ? 404
        : 409;
    console.info('[sala] union rechazada', {
      code,
      error: error.ok === false ? error.error : 'desconocido',
    });
    return NextResponse.json(
      { ok: false, ...(error.ok === false ? { error: error.error, mensaje: error.mensaje } : {}) },
      { status: estado },
    );
  }

  console.info('[sala] union', {
    code: resultado.code,
    playerId: resultado.playerId,
    reconectado: resultado.reconectado,
  });

  return NextResponse.json({
    ok: true,
    token: resultado.token,
    playerId: resultado.playerId,
    code: resultado.code,
    nickname: resultado.nickname,
    rol: resultado.rol,
    reconectado: resultado.reconectado,
  });
}
