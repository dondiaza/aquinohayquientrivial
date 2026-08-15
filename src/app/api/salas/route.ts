/**
 * POST /api/salas — crear una sala.
 *
 * Devuelve el código humano y el token de host. El token va en la respuesta y el cliente lo
 * guarda en `localStorage`: NO se pone en la URL ni en una cookie compartida, porque la
 * pantalla del host puede acabar proyectada en una tele delante de veinte personas.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { gameSetupSchema } from '@/domain/engine/config';
import { MODOS_EQUIPO } from '@/domain/party/protocolo';
import { crearSala } from '@/server/party/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const cuerpoSchema = z.object({
  setup: gameSetupSchema,
  teamMode: z.enum(MODOS_EQUIPO).default('NINGUNO'),
  equipos: z.number().int().min(2).max(6).default(2),
  autoPilot: z.boolean().default(true),
  leaderboardEvery: z.number().int().min(0).max(20).default(3),
  maxPlayers: z.number().int().min(2).max(48).default(24),
});

export async function POST(request: Request): Promise<Response> {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ ok: false, mensaje: 'Petición inválida' }, { status: 400 });
  }

  const parseado = cuerpoSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return NextResponse.json({ ok: false, mensaje: 'Configuración inválida' }, { status: 400 });
  }

  const sala = await crearSala({
    setup: parseado.data.setup,
    teamMode: parseado.data.teamMode,
    equipos: parseado.data.equipos,
    autoPilot: parseado.data.autoPilot,
    leaderboardEvery: parseado.data.leaderboardEvery,
    maxPlayers: parseado.data.maxPlayers,
  });

  console.info('[sala] creada', { code: sala.code, roomId: sala.roomId });

  return NextResponse.json({
    ok: true,
    code: sala.code,
    hostToken: sala.hostToken,
  });
}
