/**
 * POST /api/jobs — dispara un trabajo programado.
 *
 * Lo llama GitHub Actions con un `schedule` (ver .github/workflows/jobs.yml). Se protege con
 * `JOBS_SECRET`: sin ese secreto no se ejecuta nada, y si no está configurado la ruta queda
 * cerrada en lugar de abierta, que es como deben fallar estas cosas.
 *
 * En Vercel no se pueden usar cron functions con este despliegue (la cuenta no tiene
 * autorizados los builds en la nube), así que el reloj lo pone Actions y aquí solo se
 * ejecuta. También se puede lanzar a mano desde la pestaña de Actions.
 */

import { timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';

import { ejecutarJob, JOBS } from '@/server/jobs/service';

/**
 * Comparación en tiempo constante. Con `!==` el tiempo de respuesta delata cuántos bytes
 * coinciden, que es como se adivina un secreto byte a byte. Es el mismo criterio que se
 * aplica a los tokens de sesión y a los de sala: aquí no iba a ser distinto.
 */
function secretoCorrecto(recibido: string | undefined, esperado: string): boolean {
  if (!recibido) return false;
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  const secreto = process.env.JOBS_SECRET;
  if (!secreto) {
    // Sin secreto configurado NO se abre: se cierra. Fallar hacia el lado seguro.
    return NextResponse.json({ ok: false, error: 'jobs sin configurar' }, { status: 503 });
  }

  const enviado =
    request.headers.get('x-jobs-secret') ??
    request.headers.get('authorization')?.replace(/^Bearer /, '');

  if (!secretoCorrecto(enviado ?? undefined, secreto)) {
    return NextResponse.json({ ok: false, error: 'no autorizado' }, { status: 401 });
  }

  const url = new URL(request.url);
  const pedido = url.searchParams.get('job');

  const nombres = pedido ? [pedido] : [...JOBS];
  const resultados = [];
  for (const nombre of nombres) {
    resultados.push(await ejecutarJob(nombre));
  }

  const todosOk = resultados.every((resultado) => resultado.ok);
  return NextResponse.json({ ok: todosOk, resultados }, { status: todosOk ? 200 : 500 });
}
