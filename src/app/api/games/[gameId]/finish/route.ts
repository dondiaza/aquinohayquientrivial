import { NextResponse } from 'next/server';

import { finishGameRequestSchema } from '@/domain/engine/wire';
import { finishGame } from '@/server/games/service';
import { readGuestId } from '@/server/guest';

/**
 * Cierra la partida. El resumen NO lo envía el cliente: se recalcula en el servidor a
 * partir de las respuestas persistidas, con la misma función pura del motor.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ gameId: string }> },
): Promise<NextResponse> {
  const { gameId } = await context.params;
  const guestPublicId = await readGuestId();
  if (!guestPublicId) {
    return NextResponse.json({ error: 'SIN_SESION' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON_INVALIDO' }, { status: 400 });
  }

  const parsed = finishGameRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'DATOS_INVALIDOS', detalle: parsed.error.issues.slice(0, 5) },
      { status: 422 },
    );
  }

  const result = await finishGame(gameId, guestPublicId, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 404 });
  }

  return NextResponse.json({ ok: true, summary: result.summary });
}
