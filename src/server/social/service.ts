/**
 * SOCIAL — amigos, bloqueos, desafíos e invitaciones.
 *
 * Reglas que atraviesan todo el módulo:
 *
 *   1. **El bloqueo gana siempre.** Un bloqueo corta solicitudes, desafíos, invitaciones,
 *      presencia y actividad, en las dos direcciones, y **al bloqueado no se le avisa**
 *      (§64). Verlo desaparecer es peor que no saberlo.
 *   2. **Nada de mensajería.** Los amigos existen para jugar. No hay campo de texto libre
 *      entre personas, y eso es una decisión de seguridad, no una funcionalidad pendiente
 *      (§66).
 *   3. **Todo lo que invita, caduca.** Una invitación a una sala que ya terminó no debe
 *      seguir ahí a las cuatro horas.
 */

import { prisma } from '../db';
import { notificar } from '../notificaciones/service';
import { relacionEntre, visibilidad } from '../cuentas/service';
import { puedeVer } from '@/domain/cuentas/identidad';

/** Máximo de amigos. Alto, pero no infinito: esto no es una red social. */
export const MAX_AMIGOS = 200;

/** Cuánto vive un desafío asíncrono antes de caducar. */
export const VIDA_DESAFIO_MS = 7 * 24 * 60 * 60 * 1000;

/** Y un reto de grupo. */
export const VIDA_RETO_GRUPO_MS = 48 * 60 * 60 * 1000;

export type ResultadoSocial = { ok: true } | { ok: false; mensaje: string };

/** Par ordenado: la amistad se guarda en UNA fila, no en dos. */
function par(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function estanBloqueados(a: string, b: string): Promise<boolean> {
  const bloqueo = await prisma.block.findFirst({
    where: {
      OR: [
        { bloqueadorId: a, bloqueadoId: b },
        { bloqueadorId: b, bloqueadoId: a },
      ],
    },
    select: { id: true },
  });
  return Boolean(bloqueo);
}

export async function sonAmigos(a: string, b: string): Promise<boolean> {
  const [x, y] = par(a, b);
  const amistad = await prisma.friendship.findFirst({
    where: { aId: x, bId: y },
    select: { id: true },
  });
  return Boolean(amistad);
}

// ── Solicitudes ─────────────────────────────────────────────────────────────────

export async function enviarSolicitud(
  solicitanteId: string,
  destinatarioId: string,
): Promise<ResultadoSocial> {
  if (solicitanteId === destinatarioId) {
    return { ok: false, mensaje: 'No puedes añadirte a ti mismo.' };
  }

  // Un bloqueo responde igual que «no se puede», sin decir que hay bloqueo.
  if (await estanBloqueados(solicitanteId, destinatarioId)) {
    return { ok: false, mensaje: 'No se ha podido enviar la solicitud.' };
  }

  if (await sonAmigos(solicitanteId, destinatarioId)) {
    return { ok: false, mensaje: 'Ya sois vecinos.' };
  }

  const cuantos = await prisma.friendship.count({
    where: { OR: [{ aId: solicitanteId }, { bId: solicitanteId }] },
  });
  if (cuantos >= MAX_AMIGOS) {
    return { ok: false, mensaje: `No puedes tener más de ${MAX_AMIGOS} vecinos.` };
  }

  // ¿Hay una solicitud suya pendiente? Entonces esto es aceptar, no pedir.
  const inversa = await prisma.friendRequest.findFirst({
    where: { solicitanteId: destinatarioId, destinatarioId: solicitanteId, estado: 'PENDIENTE' },
  });
  if (inversa) return aceptarSolicitud(solicitanteId, inversa.id);

  const ajustes = await prisma.userSettings.findUnique({
    where: { userId: destinatarioId },
    select: { quienPuedeSolicitar: true },
  });
  const relacion = await relacionEntre(solicitanteId, destinatarioId);
  if (!puedeVer(visibilidad(ajustes?.quienPuedeSolicitar), relacion)) {
    return { ok: false, mensaje: 'Ese vecino no acepta solicitudes.' };
  }

  await prisma.friendRequest.upsert({
    where: { solicitanteId_destinatarioId: { solicitanteId, destinatarioId } },
    create: { solicitanteId, destinatarioId },
    update: { estado: 'PENDIENTE', resueltaAt: null, createdAt: new Date() },
  });

  const quien = await prisma.userAccount.findUnique({
    where: { id: solicitanteId },
    select: { username: true },
  });

  await notificar({
    userId: destinatarioId,
    tipo: 'FRIEND_REQUESTED',
    datos: { quien: quien?.username ?? 'Un vecino' },
  });

  return { ok: true };
}

export async function aceptarSolicitud(
  userId: string,
  requestId: string,
): Promise<ResultadoSocial> {
  const solicitud = await prisma.friendRequest.findUnique({ where: { id: requestId } });
  if (!solicitud || solicitud.destinatarioId !== userId) {
    return { ok: false, mensaje: 'Esa solicitud ya no está.' };
  }
  if (solicitud.estado !== 'PENDIENTE') {
    return { ok: false, mensaje: 'Esa solicitud ya se resolvió.' };
  }
  if (await estanBloqueados(solicitud.solicitanteId, userId)) {
    return { ok: false, mensaje: 'No se ha podido aceptar.' };
  }

  const [a, b] = par(solicitud.solicitanteId, userId);

  await prisma.$transaction([
    prisma.friendRequest.update({
      where: { id: requestId },
      data: { estado: 'ACEPTADA', resueltaAt: new Date() },
    }),
    prisma.friendship.upsert({
      where: { aId_bId: { aId: a, bId: b } },
      create: { aId: a, bId: b },
      update: {},
    }),
  ]);

  const quien = await prisma.userAccount.findUnique({
    where: { id: userId },
    select: { username: true },
  });

  await notificar({
    userId: solicitud.solicitanteId,
    tipo: 'FRIEND_ACCEPTED',
    datos: { quien: quien?.username ?? 'Un vecino', id: quien?.username ?? '' },
  });

  return { ok: true };
}

export async function rechazarSolicitud(
  userId: string,
  requestId: string,
): Promise<ResultadoSocial> {
  // Se marca como rechazada y NO se avisa a quien la mandó: que le llegue un «te han
  // rechazado» no aporta nada bueno a nadie.
  await prisma.friendRequest.updateMany({
    where: { id: requestId, destinatarioId: userId, estado: 'PENDIENTE' },
    data: { estado: 'RECHAZADA', resueltaAt: new Date() },
  });
  return { ok: true };
}

export async function eliminarAmigo(userId: string, otroId: string): Promise<ResultadoSocial> {
  const [a, b] = par(userId, otroId);
  await prisma.$transaction([
    prisma.friendship.deleteMany({ where: { aId: a, bId: b } }),
    prisma.friendRequest.deleteMany({
      where: {
        OR: [
          { solicitanteId: userId, destinatarioId: otroId },
          { solicitanteId: otroId, destinatarioId: userId },
        ],
      },
    }),
  ]);
  return { ok: true };
}

// ── Bloqueo ─────────────────────────────────────────────────────────────────────

/**
 * Bloquear. Rompe la amistad, cancela solicitudes en las dos direcciones y **no avisa**.
 */
export async function bloquear(userId: string, objetivoId: string): Promise<ResultadoSocial> {
  if (userId === objetivoId) return { ok: false, mensaje: 'No puedes bloquearte a ti mismo.' };
  const [a, b] = par(userId, objetivoId);

  await prisma.$transaction([
    prisma.block.upsert({
      where: { bloqueadorId_bloqueadoId: { bloqueadorId: userId, bloqueadoId: objetivoId } },
      create: { bloqueadorId: userId, bloqueadoId: objetivoId },
      update: {},
    }),
    prisma.friendship.deleteMany({ where: { aId: a, bId: b } }),
    prisma.friendRequest.deleteMany({
      where: {
        OR: [
          { solicitanteId: userId, destinatarioId: objetivoId },
          { solicitanteId: objetivoId, destinatarioId: userId },
        ],
      },
    }),
  ]);

  return { ok: true };
}

export async function desbloquear(userId: string, objetivoId: string): Promise<ResultadoSocial> {
  await prisma.block.deleteMany({ where: { bloqueadorId: userId, bloqueadoId: objetivoId } });
  return { ok: true };
}

// ── Listas ──────────────────────────────────────────────────────────────────────

export type AmigoVista = {
  userId: string;
  username: string;
  nivel: number;
  rango: string;
  arquetipo: string;
  colorAvatar: string;
  racha: number;
  /** Presencia, ya filtrada por la privacidad del amigo. */
  presencia: 'disponible' | 'jugando' | 'desconectado' | 'oculta';
};

/** Minutos de silencio a partir de los cuales se considera desconectado. */
const UMBRAL_PRESENCIA_MIN = 5;

export async function amigosDe(userId: string): Promise<AmigoVista[]> {
  const amistades = await prisma.friendship.findMany({
    where: { OR: [{ aId: userId }, { bId: userId }] },
  });

  const ids = amistades.map((amistad) => (amistad.aId === userId ? amistad.bId : amistad.aId));
  if (ids.length === 0) return [];

  const cuentas = await prisma.userAccount.findMany({
    where: { id: { in: ids } },
    include: { profile: true, settings: true, streak: true },
  });

  const ahora = Date.now();

  return cuentas.map((cuenta) => {
    const silencio = (ahora - cuenta.lastSeenAt.getTime()) / 60_000;
    const visible = puedeVer(visibilidad(cuenta.settings?.presenciaVisible), {
      esUnoMismo: false,
      esAmigo: true,
      estaBloqueado: false,
    });

    return {
      userId: cuenta.id,
      username: cuenta.username,
      nivel: cuenta.profile?.nivel ?? 1,
      rango: cuenta.profile?.rango ?? 'visitante',
      arquetipo: cuenta.profile?.arquetipo ?? 'presidente',
      colorAvatar: cuenta.profile?.colorAvatar ?? 'verde',
      racha: cuenta.streak?.actual ?? 0,
      presencia: !visible
        ? 'oculta'
        : silencio < UMBRAL_PRESENCIA_MIN
          ? 'disponible'
          : 'desconectado',
    };
  });
}

export async function solicitudesPendientes(userId: string) {
  return prisma.friendRequest.findMany({
    where: { destinatarioId: userId, estado: 'PENDIENTE' },
    include: {
      solicitante: { select: { id: true, username: true, profile: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ── Desafíos asíncronos ─────────────────────────────────────────────────────────

/** Etiqueta compartible: `#PORTAL-4K7P`. Legible y suficiente para no colisionar. */
function etiquetaDesafio(): string {
  const alfabeto = '3469CDFHJKMNPQRTWXY';
  let sufijo = '';
  for (let i = 0; i < 5; i += 1) {
    sufijo += alfabeto.charAt(Math.floor(Math.random() * alfabeto.length));
  }
  return `PORTAL-${sufijo}`;
}

export type DesafioCreado = { id: string; etiqueta: string };

/**
 * Crea un desafío. La SEMILLA es lo que garantiza que ambos juegan exactamente lo mismo:
 * mismas preguntas, mismo orden, misma dificultad.
 */
export async function crearDesafio(
  retadorId: string,
  config: { formatId: string; difficultyId: string; category: string; sinSpoilers: boolean },
  destinatarios: string[],
  esGrupal = false,
): Promise<DesafioCreado> {
  const etiqueta = etiquetaDesafio();
  const seed = `${etiqueta}-${Date.now().toString(36)}`;

  /*
   * El bloqueo se filtra AQUÍ, antes de crear a los participantes, y no solo antes de
   * notificar. Si se filtrara solo el aviso, el bloqueado seguiría figurando como
   * participante del desafío: no le llegaría nada, pero estaría dentro, y aparecer en la
   * lista de alguien que te ha bloqueado es justo lo que el bloqueo tiene que impedir.
   */
  const admitidos: string[] = [];
  for (const destinatario of destinatarios) {
    if (destinatario === retadorId) continue;
    if (await estanBloqueados(retadorId, destinatario)) continue;
    admitidos.push(destinatario);
  }

  const desafio = await prisma.challenge.create({
    data: {
      retadorId,
      etiqueta,
      seed,
      config,
      esGrupal,
      expiresAt: new Date(Date.now() + (esGrupal ? VIDA_RETO_GRUPO_MS : VIDA_DESAFIO_MS)),
      participantes: {
        create: [{ userId: retadorId }, ...admitidos.map((userId) => ({ userId }))],
      },
    },
  });

  const quien = await prisma.userAccount.findUnique({
    where: { id: retadorId },
    select: { username: true },
  });

  for (const destinatario of admitidos) {
    const ajustes = await prisma.userSettings.findUnique({
      where: { userId: destinatario },
      select: { quienPuedeRetar: true },
    });
    const relacion = await relacionEntre(retadorId, destinatario);
    if (!puedeVer(visibilidad(ajustes?.quienPuedeRetar), relacion)) continue;

    await notificar({
      userId: destinatario,
      tipo: 'CHALLENGE_CREATED',
      datos: { quien: quien?.username ?? 'Un vecino', id: desafio.id, puntos: 0 },
    });
  }

  return { id: desafio.id, etiqueta };
}

/** Registra el resultado de alguien en un desafío y avisa a los demás. */
export async function registrarResultadoDesafio(
  challengeId: string,
  userId: string,
  resultado: { puntos: number; precision: number; gameId: string },
): Promise<ResultadoSocial> {
  const desafio = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { participantes: true },
  });
  if (!desafio) return { ok: false, mensaje: 'Ese desafío ya no existe.' };
  if (desafio.expiresAt.getTime() < Date.now()) {
    return { ok: false, mensaje: 'Ese desafío ha caducado.' };
  }

  const participa = desafio.participantes.some((participante) => participante.userId === userId);
  if (!participa) return { ok: false, mensaje: 'No estás en ese desafío.' };

  await prisma.challengeParticipant.update({
    where: { challengeId_userId: { challengeId, userId } },
    data: {
      puntos: resultado.puntos,
      precision: resultado.precision,
      gameId: resultado.gameId,
      jugadoAt: new Date(),
    },
  });

  if (userId === desafio.retadorId) {
    await prisma.challenge.update({
      where: { id: challengeId },
      data: { puntosRetador: resultado.puntos, gameIdRetador: resultado.gameId },
    });
  }

  const quien = await prisma.userAccount.findUnique({
    where: { id: userId },
    select: { username: true },
  });

  // Se avisa a los demás participantes que ya jugaron: comparar es el momento divertido.
  for (const participante of desafio.participantes) {
    if (participante.userId === userId) continue;
    if (!participante.jugadoAt) continue;
    await notificar({
      userId: participante.userId,
      tipo: 'CHALLENGE_COMPLETED',
      datos: { quien: quien?.username ?? 'Un vecino', id: challengeId, puntos: resultado.puntos },
    });
  }

  const todos = await prisma.challengeParticipant.count({
    where: { challengeId, jugadoAt: null },
  });
  if (todos === 0) {
    await prisma.challenge.update({ where: { id: challengeId }, data: { estado: 'COMPLETADO' } });
  }

  return { ok: true };
}

/** Revancha: un desafío nuevo con la misma configuración, apuntando al anterior. */
export async function pedirRevancha(
  userId: string,
  challengeId: string,
): Promise<DesafioCreado | { ok: false; mensaje: string }> {
  const original = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { participantes: true },
  });
  if (!original) return { ok: false, mensaje: 'Ese desafío ya no existe.' };

  const rivales = original.participantes
    .map((participante) => participante.userId)
    .filter((id) => id !== userId);

  const nuevo = await crearDesafio(
    userId,
    original.config as {
      formatId: string;
      difficultyId: string;
      category: string;
      sinSpoilers: boolean;
    },
    rivales,
    original.esGrupal,
  );

  await prisma.challengeParticipant.updateMany({
    where: { challengeId: nuevo.id, userId },
    data: { revanchaDe: challengeId },
  });

  const quien = await prisma.userAccount.findUnique({
    where: { id: userId },
    select: { username: true },
  });

  for (const rival of rivales) {
    await notificar({
      userId: rival,
      tipo: 'REMATCH_REQUESTED',
      datos: { quien: quien?.username ?? 'Un vecino', id: nuevo.id },
    });
  }

  return nuevo;
}

/** Invitación a una sala en vivo. Caduca sola: la sala no dura para siempre. */
export async function invitarASala(
  userId: string,
  amigos: string[],
  code: string,
): Promise<number> {
  const quien = await prisma.userAccount.findUnique({
    where: { id: userId },
    select: { username: true },
  });

  let enviadas = 0;
  for (const amigo of amigos) {
    if (await estanBloqueados(userId, amigo)) continue;

    const ajustes = await prisma.userSettings.findUnique({
      where: { userId: amigo },
      select: { quienPuedeInvitar: true },
    });
    const relacion = await relacionEntre(userId, amigo);
    if (!puedeVer(visibilidad(ajustes?.quienPuedeInvitar), relacion)) continue;

    await notificar({
      userId: amigo,
      tipo: 'ROOM_INVITE_CREATED',
      datos: { quien: quien?.username ?? 'Un vecino', code },
    });
    enviadas += 1;
  }

  return enviadas;
}

/** Limpieza de desafíos caducados. La llama el job. */
export async function caducarDesafios(): Promise<number> {
  const resultado = await prisma.challenge.updateMany({
    where: { estado: 'ABIERTO', expiresAt: { lt: new Date() } },
    data: { estado: 'CADUCADO' },
  });
  return resultado.count;
}
