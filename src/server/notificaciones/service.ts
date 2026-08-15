/**
 * SERVICIO DE NOTIFICACIONES — el único sitio desde el que se avisa a alguien.
 *
 * Ningún componente, ninguna ruta y ningún servicio manda una notificación por su cuenta.
 * Todo pasa por `notificar()`, que aplica las reglas puras de `domain/notificaciones` y deja
 * constancia de lo que se ha hecho y de lo que NO, con el motivo.
 *
 * Eso último es lo que permite responder a «¿por qué no me llegó?» sin adivinar: cada
 * decisión queda en `NotificationDelivery` con su `motivoDescarte`.
 *
 * El buzón dentro de la app se escribe SIEMPRE. Lo que se filtra es el push y el correo.
 */

import type { Prisma } from '@prisma/client';

import { prisma } from '../db';
import {
  CATEGORIA_DE_TIPO,
  REGLAS,
  redactar,
  type CanalNotificacion,
  type TipoNotificacion,
} from '@/domain/notificaciones/catalogo';
import {
  decidirCanales,
  type HistorialEnvios,
  type PreferenciasUsuario,
} from '@/domain/notificaciones/motor';

/** Cuánto vive una notificación en el buzón antes de que la limpie el job. */
const VIDA_NOTIFICACION_MS = 30 * 24 * 60 * 60 * 1000;

/** Una invitación a sala caduca enseguida: nada de «te invitan» cuatro horas después. */
const VIDA_INVITACION_MS = 30 * 60 * 1000;

export type PeticionNotificacion = {
  userId: string;
  tipo: TipoNotificacion;
  datos: Record<string, string | number>;
  /** Sobrescribe la caducidad por defecto. */
  expiraEn?: number;
};

export type ResultadoNotificacion = {
  notificationId: string | null;
  canales: { inApp: boolean; push: boolean; email: boolean };
  motivos: Partial<Record<CanalNotificacion, string>>;
};

async function preferenciasDe(userId: string): Promise<PreferenciasUsuario> {
  const ajustes = await prisma.userSettings.findUnique({
    where: { userId },
    include: { preferencias: true },
  });
  const cuenta = await prisma.userAccount.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });

  const mapa = new Map<string, boolean>();
  for (const preferencia of ajustes?.preferencias ?? []) {
    mapa.set(`${preferencia.categoria}:${preferencia.canal}`, preferencia.activa);
  }

  return {
    activa: (categoria, canal) => mapa.get(`${categoria}:${canal}`),
    silencioActivo: ajustes?.silencioActivo ?? true,
    silencioDesde: ajustes?.silencioDesde ?? 23 * 60,
    silencioHasta: ajustes?.silencioHasta ?? 9 * 60,
    timezone: cuenta?.timezone ?? 'Europe/Madrid',
  };
}

async function historialDe(userId: string, tipo: TipoNotificacion): Promise<HistorialEnvios> {
  const ahora = Date.now();
  const haceUnDia = new Date(ahora - 24 * 3_600_000);
  const haceUnaSemana = new Date(ahora - 7 * 24 * 3_600_000);

  const enganche = Object.entries(REGLAS)
    .filter(([, regla]) => regla.esEnganche)
    .map(([nombre]) => nombre);

  const [pushHoy, pushSemana, ultimo, actividad] = await Promise.all([
    prisma.notificationDelivery.count({
      where: { userId, canal: 'PUSH', estado: 'ENVIADA', tipo: { in: enganche }, createdAt: { gte: haceUnDia } },
    }),
    prisma.notificationDelivery.count({
      where: {
        userId,
        canal: 'PUSH',
        estado: 'ENVIADA',
        tipo: { in: enganche },
        createdAt: { gte: haceUnaSemana },
      },
    }),
    prisma.notificationDelivery.findFirst({
      where: { userId, tipo, canal: 'PUSH', estado: 'ENVIADA' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
    prisma.userAccount.findUnique({ where: { id: userId }, select: { lastSeenAt: true } }),
  ]);

  const diasInactivo = actividad
    ? Math.floor((ahora - actividad.lastSeenAt.getTime()) / 86_400_000)
    : 0;

  return {
    pushEngancheHoy: pushHoy,
    pushEngancheSemana: pushSemana,
    ultimoDeEsteTipo: ultimo?.createdAt.getTime() ?? null,
    diasInactivo,
  };
}

/**
 * Avisa a alguien. Devuelve qué se ha hecho y por qué canales, para poder enseñarlo en el
 * panel y para las métricas de salud del canal (§95).
 */
export async function notificar(peticion: PeticionNotificacion): Promise<ResultadoNotificacion> {
  const { userId, tipo } = peticion;
  const categoria = CATEGORIA_DE_TIPO[tipo];

  const [preferencias, historial] = await Promise.all([
    preferenciasDe(userId),
    historialDe(userId, tipo),
  ]);

  const decision = decidirCanales(tipo, preferencias, historial, new Date());
  const texto = redactar(tipo, peticion.datos);

  const caducidad =
    peticion.expiraEn ??
    (tipo === 'ROOM_INVITE_CREATED'
      ? Date.now() + VIDA_INVITACION_MS
      : Date.now() + VIDA_NOTIFICACION_MS);

  let notificationId: string | null = null;

  if (decision.inApp) {
    const creada = await prisma.notification.create({
      data: {
        userId,
        tipo,
        categoria,
        titulo: texto.titulo,
        cuerpo: texto.cuerpo,
        deepLink: texto.deepLink,
        prioridad: REGLAS[tipo].prioridad,
        payload: peticion.datos as unknown as Prisma.InputJsonValue,
        expiresAt: new Date(caducidad),
      },
    });
    notificationId = creada.id;

    await prisma.notificationDelivery.create({
      data: { notificationId, userId, canal: 'IN_APP', tipo, categoria, estado: 'ENTREGADA' },
    });
  }

  // Push. Se registra también cuando se descarta: es lo que hace auditable el canal.
  if (decision.push) {
    const enviado = await enviarPush(userId, texto, tipo);
    await prisma.notificationDelivery.create({
      data: {
        notificationId,
        userId,
        canal: 'PUSH',
        tipo,
        categoria,
        estado: enviado.enviados > 0 ? 'ENVIADA' : 'FALLIDA',
        ...(enviado.enviados === 0 ? { motivoDescarte: 'SIN_DISPOSITIVO' } : {}),
        sentAt: new Date(),
      },
    });
  } else {
    await prisma.notificationDelivery.create({
      data: {
        notificationId,
        userId,
        canal: 'PUSH',
        tipo,
        categoria,
        estado: 'DESCARTADA',
        motivoDescarte: decision.motivos.PUSH ?? 'REGLA',
      },
    });
  }

  if (decision.email) {
    await prisma.notificationDelivery.create({
      data: { notificationId, userId, canal: 'EMAIL', tipo, categoria, estado: 'PENDIENTE' },
    });
  }

  return {
    notificationId,
    canales: { inApp: decision.inApp, push: decision.push, email: decision.email },
    motivos: decision.motivos,
  };
}

// ── Web Push ────────────────────────────────────────────────────────────────────

/**
 * Envío por Web Push.
 *
 * Necesita claves VAPID (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`). Si no
 * están, NO se finge que se ha enviado: se devuelve 0 enviados y queda registrado. Se
 * generan con `npx web-push generate-vapid-keys` y se documenta en `docs/FASE4-RETENCION.md`.
 *
 * El envío real usa la librería `web-push` si está instalada. Se carga de forma perezosa
 * para que la app arranque igual sin ella.
 */
async function enviarPush(
  userId: string,
  texto: { titulo: string; cuerpo: string; deepLink: string },
  tipo: TipoNotificacion,
): Promise<{ enviados: number; fallidos: number }> {
  const publica = process.env.VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) return { enviados: 0, fallidos: 0 };

  const suscripciones = await prisma.pushSubscription.findMany({ where: { userId } });
  if (suscripciones.length === 0) return { enviados: 0, fallidos: 0 };

  // Carga perezosa: si la librería no está, la app arranca igual y se registra el fallo.
  const modulo = await import('web-push').catch(() => null);
  const webpush = modulo?.default ?? null;
  if (!webpush) {
    console.warn('[push] la librería web-push no está disponible; no se envía nada');
    return { enviados: 0, fallidos: suscripciones.length };
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:portal@desengano21.local',
    publica,
    privada,
  );

  const carga = JSON.stringify({
    titulo: texto.titulo,
    cuerpo: texto.cuerpo,
    deepLink: texto.deepLink,
    tipo,
  });

  let enviados = 0;
  let fallidos = 0;

  for (const suscripcion of suscripciones) {
    try {
      await webpush.sendNotification(
        {
          endpoint: suscripcion.endpoint,
          keys: { p256dh: suscripcion.p256dh, auth: suscripcion.auth },
        },
        carga,
      );
      enviados += 1;
      await prisma.pushSubscription.update({
        where: { id: suscripcion.id },
        data: { lastOkAt: new Date(), fallos: 0 },
      });
    } catch (error) {
      fallidos += 1;
      const codigo = (error as { statusCode?: number }).statusCode;
      // 404/410 = la suscripción ya no existe en el navegador: se borra, no se reintenta.
      if (codigo === 404 || codigo === 410) {
        await prisma.pushSubscription.delete({ where: { id: suscripcion.id } });
      } else {
        await prisma.pushSubscription.update({
          where: { id: suscripcion.id },
          data: { fallos: { increment: 1 } },
        });
      }
    }
  }

  // Suscripciones que fallan una y otra vez: se dan por muertas.
  await prisma.pushSubscription.deleteMany({ where: { userId, fallos: { gte: 5 } } });

  return { enviados, fallidos };
}

// ── Buzón ───────────────────────────────────────────────────────────────────────

export async function buzon(
  userId: string,
  opciones: { soloNoLeidas?: boolean; limite?: number } = {},
) {
  return prisma.notification.findMany({
    where: {
      userId,
      ...(opciones.soloNoLeidas ? { readAt: null } : {}),
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: [{ readAt: 'asc' }, { createdAt: 'desc' }],
    take: Math.min(100, opciones.limite ?? 30),
  });
}

/** Contador para el punto rojo. Se acota a 99 para no enseñar «894» a nadie (§85). */
export async function sinLeer(userId: string): Promise<number> {
  const total = await prisma.notification.count({
    where: { userId, readAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
  });
  return Math.min(total, 99);
}

export async function marcarLeida(userId: string, notificationId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() },
  });
  await prisma.notificationDelivery.updateMany({
    where: { notificationId, userId, openedAt: null },
    data: { openedAt: new Date(), estado: 'ABIERTA' },
  });
}

export async function marcarTodasLeidas(userId: string): Promise<number> {
  const resultado = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return resultado.count;
}

/** Limpieza del buzón. La llama el job de mantenimiento. */
export async function limpiarBuzon(): Promise<number> {
  const resultado = await prisma.notification.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return resultado.count;
}

// ── Salud del canal (§95) ───────────────────────────────────────────────────────

export type SaludCanal = {
  tipo: string;
  enviadas: number;
  abiertas: number;
  descartadas: number;
  tasaApertura: number;
  motivos: Record<string, number>;
};

/**
 * Métricas AGREGADAS por tipo. A propósito no hay nada por usuario: sirven para detectar que
 * una categoría quema el canal, no para perseguir a nadie (§61).
 */
export async function saludDelCanal(dias = 30): Promise<SaludCanal[]> {
  const desde = new Date(Date.now() - dias * 86_400_000);
  const envios = await prisma.notificationDelivery.findMany({
    where: { createdAt: { gte: desde }, canal: 'PUSH' },
    select: { tipo: true, estado: true, motivoDescarte: true },
  });

  const porTipo = new Map<string, SaludCanal>();
  for (const envio of envios) {
    const entrada = porTipo.get(envio.tipo) ?? {
      tipo: envio.tipo,
      enviadas: 0,
      abiertas: 0,
      descartadas: 0,
      tasaApertura: 0,
      motivos: {},
    };

    if (envio.estado === 'ENVIADA' || envio.estado === 'ABIERTA') entrada.enviadas += 1;
    if (envio.estado === 'ABIERTA') entrada.abiertas += 1;
    if (envio.estado === 'DESCARTADA') {
      entrada.descartadas += 1;
      const motivo = envio.motivoDescarte ?? 'DESCONOCIDO';
      entrada.motivos[motivo] = (entrada.motivos[motivo] ?? 0) + 1;
    }

    porTipo.set(envio.tipo, entrada);
  }

  return [...porTipo.values()]
    .map((entrada) => ({
      ...entrada,
      tasaApertura: entrada.enviadas > 0 ? Math.round((entrada.abiertas / entrada.enviadas) * 100) : 0,
    }))
    .sort((a, b) => b.enviadas - a.enviadas);
}
