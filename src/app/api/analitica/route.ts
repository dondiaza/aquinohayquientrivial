/**
 * RECOGIDA DE EVENTOS.
 *
 * Guarda lo justo para responder la única pregunta que importa en un juego que se propaga por
 * WhatsApp: **de cada cien enlaces que se mandan, cuántos acaban en alguien jugando.**
 *
 * ## Qué NO se guarda, y es deliberado
 *
 * Ni identificadores de usuario, ni de invitado, ni IP, ni agente, ni la ruta completa. Solo
 * el nombre del evento, unos pocos datos numéricos y el día. Con eso sale el embudo, y sin
 * eso no hay nada que filtrar el día que alguien pida sus datos: no los tenemos.
 *
 * El nombre del evento se valida contra una lista blanca. Un endpoint público que escribe
 * cadenas libres en la base de datos es una invitación a llenarla de basura.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/server/db';

export const dynamic = 'force-dynamic';

/** Eventos que se admiten. Cualquier otro se descarta en silencio. */
const EVENTOS = [
  'SHARE_CLICKED',
  'SHARE_COMPLETED',
  'AVATAR_SAVED',
  'GAME_STARTED',
  'GAME_FINISHED',
  'ROOM_CREATED',
  'ROOM_JOINED',
  'ACCOUNT_CREATED',
  'INVITE_OPENED',
] as const;

const esquema = z.object({
  eventos: z
    .array(
      z.object({
        evento: z.string().max(40),
        datos: z.record(z.string().max(24), z.union([z.string().max(60), z.number(), z.boolean()])).optional(),
        en: z.number().optional(),
      }),
    )
    .max(50),
});

/**
 * Freno por origen.
 *
 * El endpoint es público y sin sesión —tiene que serlo, mide a gente que aún no tiene
 * cuenta—, así que cualquiera puede llamarlo en bucle e inflar un contador. No es una fuga
 * ni una vía para llenar la base (se agrega por día y evento: nueve filas diarias como
 * mucho), pero sí ensucia el único dato con el que se van a tomar decisiones.
 *
 * En memoria y por instancia: en serverless cada instancia lleva su cuenta, así que el tope
 * real es más alto que el nominal. Da igual — esto no protege un recurso caro, corta el
 * abuso trivial. Si algún día hiciera falta de verdad, el sitio es un contador en Postgres.
 */
const VENTANA_MS = 60_000;
const TOPE_POR_VENTANA = 30;
const visitas = new Map<string, { hasta: number; veces: number }>();

function admitido(clave: string): boolean {
  const ahora = Date.now();
  const previo = visitas.get(clave);

  if (!previo || previo.hasta < ahora) {
    visitas.set(clave, { hasta: ahora + VENTANA_MS, veces: 1 });
    // Limpieza barata: sin esto el mapa crece con cada IP que pasa por aquí.
    if (visitas.size > 5_000) {
      for (const [otra, dato] of visitas) if (dato.hasta < ahora) visitas.delete(otra);
    }
    return true;
  }

  previo.veces += 1;
  return previo.veces <= TOPE_POR_VENTANA;
}

export async function POST(peticion: Request) {
  const origen =
    peticion.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    peticion.headers.get('x-real-ip') ??
    'desconocido';

  // Se responde `ok` igual: quien llame de más no tiene por qué saber que se le está
  // ignorando, y a un cliente legítimo con la pestaña abierta no le sirve de nada un error.
  if (!admitido(origen)) return NextResponse.json({ ok: true });

  let cuerpo: unknown;
  try {
    cuerpo = await peticion.json();
  } catch {
    // Un cuerpo ilegible en analítica no merece un error: se tira y ya.
    return NextResponse.json({ ok: true });
  }

  const parseado = esquema.safeParse(cuerpo);
  if (!parseado.success) return NextResponse.json({ ok: true });

  const hoy = new Date();
  const dia = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  const admitidos = parseado.data.eventos.filter((entrada) =>
    (EVENTOS as readonly string[]).includes(entrada.evento),
  );
  if (admitidos.length === 0) return NextResponse.json({ ok: true });

  // Se agrega por (día, evento) en vez de guardar una fila por suceso: para un embudo hace
  // falta el recuento, no el detalle, y así la tabla no crece sin control.
  await Promise.all(
    admitidos.map((entrada) =>
      prisma.analyticsCount.upsert({
        where: { dia_evento: { dia, evento: entrada.evento } },
        create: { dia, evento: entrada.evento, veces: 1 },
        update: { veces: { increment: 1 } },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
