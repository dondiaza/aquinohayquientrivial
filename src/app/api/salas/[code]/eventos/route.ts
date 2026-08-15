/**
 * GET /api/salas/[code]/eventos — el stream de la sala.
 *
 * Dos modos, misma respuesta lógica:
 *
 *   · `?modo=sse` (por defecto) — se deja la conexión abierta y se van mandando los eventos
 *     nuevos. Si el entorno corta la función, el navegador reconecta solo y manda su cursor
 *     en `Last-Event-ID`: no se pierde nada.
 *   · `?modo=sondeo` — una respuesta JSON con lo que haya después del cursor. Es la red de
 *     seguridad para proxies que rompen SSE y para los tests.
 *
 * El cursor es `?desde=<seq>`. Reconectar y arrancar de cero son la MISMA consulta, que es
 * justo lo que hace que la reconexión no tenga bugs propios (ver docs/FASE3-REALTIME.md).
 *
 * Cada lectura del host además hace avanzar la máquina de estados si la fase ya venció: es
 * lo que sustituye a los temporizadores de servidor, que en serverless no existen.
 */

import { NextResponse } from 'next/server';

import { esCodigoValido, normalizarCodigo } from '@/domain/party/codigo';
import { MENSAJE_ERROR } from '@/domain/party/protocolo';
import { tokenDePeticion } from '@/server/party/autorizacion';
import { cargarSala, identificar, latido, leerEventos, tictac } from '@/server/party/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
/** Vercel corta las funciones; con el cursor eso es solo una reconexión invisible. */
export const maxDuration = 60;

/** Cada cuánto se mira si hay novedades dentro de una conexión SSE abierta. */
const INTERVALO_SSE_MS = 700;
/** Latido de comentario para que ningún proxy considere la conexión muerta. */
const KEEPALIVE_MS = 15_000;

function sinSala(): Response {
  return NextResponse.json(
    { ok: false, error: 'SALA_NO_EXISTE', mensaje: MENSAJE_ERROR.SALA_NO_EXISTE },
    { status: 404 },
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<Response> {
  const { code: bruto } = await params;
  const code = normalizarCodigo(bruto);
  if (!esCodigoValido(code)) return sinSala();

  const url = new URL(request.url);
  const modo = url.searchParams.get('modo') ?? 'sse';

  // `Last-Event-ID` gana al parámetro: es lo que manda el navegador al reconectar solo.
  const ultimoEvento = request.headers.get('last-event-id');
  const desdeParam = Number.parseInt(url.searchParams.get('desde') ?? '0', 10);
  const desdeInicial = Number.isFinite(Number.parseInt(ultimoEvento ?? '', 10))
    ? Number.parseInt(ultimoEvento ?? '0', 10)
    : Number.isFinite(desdeParam)
      ? desdeParam
      : 0;

  const sala = await cargarSala(code);
  if (!sala) return sinSala();

  const identidad = identificar(sala, tokenDePeticion(request));

  // ── Modo sondeo ──
  if (modo === 'sondeo') {
    await tictac(code);
    if (identidad.playerId) await latido(code, identidad);
    const lote = await leerEventos(code, desdeInicial, identidad);
    if (!lote) return sinSala();
    return NextResponse.json(
      { ok: true, eventos: lote.eventos, seq: lote.seq, servidorAhora: Date.now() },
      { headers: { 'cache-control': 'no-store' } },
    );
  }

  // ── Modo SSE ──
  const encoder = new TextEncoder();
  let cursor = desdeInicial;
  let cerrado = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enviar = (texto: string): void => {
        if (cerrado) return;
        try {
          controller.enqueue(encoder.encode(texto));
        } catch {
          cerrado = true;
        }
      };

      // Primer mensaje: el reloj del servidor, para que el cliente calcule su desfase.
      enviar(`retry: 1500\n`);
      enviar(`event: reloj\ndata: ${JSON.stringify({ servidorAhora: Date.now() })}\n\n`);

      let ultimoKeepalive = Date.now();

      while (!cerrado) {
        if (request.signal.aborted) break;

        try {
          // El avance de fases va aquí: cada lectura empuja la máquina si toca.
          await tictac(code);
          if (identidad.playerId) await latido(code, identidad);

          const lote = await leerEventos(code, cursor, identidad);
          if (!lote) break;

          for (const evento of lote.eventos) {
            cursor = evento.seq;
            enviar(
              `id: ${evento.seq}\nevent: ${evento.type}\ndata: ${JSON.stringify(evento)}\n\n`,
            );
          }

          if (Date.now() - ultimoKeepalive > KEEPALIVE_MS) {
            enviar(`: latido ${Date.now()}\n\n`);
            ultimoKeepalive = Date.now();
          }
        } catch (error) {
          console.error('[sala] error en el stream', { code, error });
          break;
        }

        await new Promise((resolver) => setTimeout(resolver, INTERVALO_SSE_MS));
      }

      cerrado = true;
      try {
        controller.close();
      } catch {
        // Ya estaba cerrado por el cliente: no hay nada que hacer.
      }
    },
    cancel() {
      cerrado = true;
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      // Necesario detrás de nginx: sin esto el proxy acumula y el stream llega a trompicones.
      'x-accel-buffering': 'no',
    },
  });
}
