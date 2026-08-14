import { NextResponse } from 'next/server';

import { reportAnswerRequestSchema } from '@/domain/engine/wire';
import { recordAnswer } from '@/server/games/service';
import { readGuestId } from '@/server/guest';

/**
 * Registra una respuesta de la partida en curso.
 *
 * Validación Zod en el boundary y comprobación de propiedad: solo el invitado dueño de
 * la partida puede escribir en ella.
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

  const parsed = reportAnswerRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'DATOS_INVALIDOS', detalle: parsed.error.issues.slice(0, 5) },
      { status: 422 },
    );
  }

  const result = await recordAnswer(gameId, guestPublicId, parsed.data);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason },
      { status: result.reason === 'NOT_FOUND' ? 404 : 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
