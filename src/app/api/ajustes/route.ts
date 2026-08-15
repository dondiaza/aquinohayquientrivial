/**
 * GET / POST /api/ajustes — privacidad, notificaciones y horario silencioso.
 *
 * Todo lo que se guarda aquí se COMPRUEBA en el servidor cuando toca. Un ajuste de
 * privacidad que solo escondiera cosas en la interfaz no sería privacidad, sería decoración.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/server/db';
import { usuarioActual } from '@/server/cuentas/sesion';
import { CANALES, CATEGORIAS, CATEGORIAS_OBLIGATORIAS } from '@/domain/notificaciones/catalogo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const visibilidad = z.enum(['TODOS', 'AMIGOS', 'NADIE']);

const cuerpoSchema = z.object({
  privacidad: z
    .object({
      perfilVisible: visibilidad.optional(),
      estadisticasVisibles: visibilidad.optional(),
      presenciaVisible: visibilidad.optional(),
      actividadVisible: visibilidad.optional(),
      quienPuedeInvitar: visibilidad.optional(),
      quienPuedeRetar: visibilidad.optional(),
      quienPuedeSolicitar: visibilidad.optional(),
    })
    .optional(),
  silencio: z
    .object({
      activo: z.boolean().optional(),
      desde: z.number().int().min(0).max(1439).optional(),
      hasta: z.number().int().min(0).max(1439).optional(),
    })
    .optional(),
  notificaciones: z
    .array(
      z.object({
        categoria: z.string().max(30),
        canal: z.enum(CANALES),
        activa: z.boolean(),
      }),
    )
    .max(30)
    .optional(),
});

export async function GET(): Promise<Response> {
  const sesion = await usuarioActual();
  if (!sesion) return NextResponse.json({ ok: false }, { status: 401 });

  const ajustes = await prisma.userSettings.findUnique({
    where: { userId: sesion.userId },
    include: { preferencias: true },
  });

  return NextResponse.json({
    ok: true,
    privacidad: {
      perfilVisible: ajustes?.perfilVisible ?? 'TODOS',
      estadisticasVisibles: ajustes?.estadisticasVisibles ?? 'TODOS',
      presenciaVisible: ajustes?.presenciaVisible ?? 'AMIGOS',
      actividadVisible: ajustes?.actividadVisible ?? 'AMIGOS',
      quienPuedeInvitar: ajustes?.quienPuedeInvitar ?? 'AMIGOS',
      quienPuedeRetar: ajustes?.quienPuedeRetar ?? 'AMIGOS',
      quienPuedeSolicitar: ajustes?.quienPuedeSolicitar ?? 'TODOS',
    },
    silencio: {
      activo: ajustes?.silencioActivo ?? true,
      desde: ajustes?.silencioDesde ?? 1380,
      hasta: ajustes?.silencioHasta ?? 540,
    },
    categorias: CATEGORIAS.map((categoria) => ({
      ...categoria,
      obligatoria: CATEGORIAS_OBLIGATORIAS.includes(categoria.id),
    })),
    preferencias: (ajustes?.preferencias ?? []).map((preferencia) => ({
      categoria: preferencia.categoria,
      canal: preferencia.canal,
      activa: preferencia.activa,
    })),
  });
}

export async function POST(request: Request): Promise<Response> {
  const sesion = await usuarioActual();
  if (!sesion) return NextResponse.json({ ok: false }, { status: 401 });

  const parseado = cuerpoSchema.safeParse(await request.json().catch(() => null));
  if (!parseado.success) return NextResponse.json({ ok: false }, { status: 400 });

  const { privacidad, silencio, notificaciones } = parseado.data;

  await prisma.userSettings.upsert({
    where: { userId: sesion.userId },
    create: {
      userId: sesion.userId,
      ...(privacidad ?? {}),
      ...(silencio?.activo !== undefined ? { silencioActivo: silencio.activo } : {}),
      ...(silencio?.desde !== undefined ? { silencioDesde: silencio.desde } : {}),
      ...(silencio?.hasta !== undefined ? { silencioHasta: silencio.hasta } : {}),
    },
    update: {
      ...(privacidad ?? {}),
      ...(silencio?.activo !== undefined ? { silencioActivo: silencio.activo } : {}),
      ...(silencio?.desde !== undefined ? { silencioDesde: silencio.desde } : {}),
      ...(silencio?.hasta !== undefined ? { silencioHasta: silencio.hasta } : {}),
    },
  });

  for (const preferencia of notificaciones ?? []) {
    // La categoría de seguridad no se puede apagar: es la única.
    if (CATEGORIAS_OBLIGATORIAS.includes(preferencia.categoria as never)) continue;

    await prisma.notificationPreference.upsert({
      where: {
        userId_categoria_canal: {
          userId: sesion.userId,
          categoria: preferencia.categoria,
          canal: preferencia.canal,
        },
      },
      create: {
        userId: sesion.userId,
        categoria: preferencia.categoria,
        canal: preferencia.canal,
        activa: preferencia.activa,
      },
      update: { activa: preferencia.activa },
    });
  }

  return NextResponse.json({ ok: true });
}
