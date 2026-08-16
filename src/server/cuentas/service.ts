/**
 * CUENTAS — crear, migrar el progreso del invitado y servir el perfil.
 *
 * ## La migración de invitado a cuenta, que es lo delicado
 *
 * En Fase 1 el sujeto del juego es `GuestPlayer`: la cookie anónima con la que se juega sin
 * registrarse. Al crear una cuenta NO se copia nada: se **ata** el invitado a la cuenta
 * rellenando `GuestPlayer.userId`. Consecuencias, todas buenas:
 *
 *   · no hay copia que pueda quedarse a medias ni duplicar puntuaciones;
 *   · las partidas, récords y logros que ya existían siguen apuntando a donde apuntaban;
 *   · si alguien entra desde tres navegadores distintos, los tres invitados acaban colgando
 *     de la misma cuenta y su progreso se SUMA, en lugar de competir entre sí.
 *
 * Lo único que se calcula al migrar es el resumen del perfil (XP, partidas, aciertos), y se
 * hace sumando lo que ya hay: es una consulta, no una copia.
 */

import type { Prisma } from '@prisma/client';

import { prisma } from '../db';
import { fusionarApariencia } from './fusion';
import {
  ENFRIAMIENTO_USERNAME_DIAS,
  generarFriendCode,
  normalizarFriendCode,
  puedeCambiarUsername,
  validarUsername,
  type Visibilidad,
} from '@/domain/cuentas/identidad';
import { nivelParaXp, rangoParaXp } from '@/domain/progression/progression';
import { normalizarEmail } from './auth';

export type CuentaConPerfil = Prisma.UserAccountGetPayload<{
  include: { profile: true; settings: true; streak: true };
}>;

/** Nombre libre a partir de un correo, para no obligar a elegir en el primer paso. */
async function usernameLibre(base: string): Promise<string> {
  const semilla = base.split('@')[0] ?? 'vecino';
  const limpio = semilla.replace(/[^A-Za-z0-9_.]/g, '').slice(0, 12) || 'vecino';

  for (let intento = 0; intento < 30; intento += 1) {
    const candidato = intento === 0 ? limpio : `${limpio}${intento + 1}`;
    const valido = validarUsername(candidato);
    if (!valido.ok) continue;
    const ocupado = await prisma.userAccount.findUnique({
      where: { username: candidato },
      select: { id: true },
    });
    if (!ocupado) return candidato;
  }
  return `vecino${Date.now().toString(36).slice(-6)}`;
}

async function friendCodeLibre(username: string): Promise<string> {
  for (let intento = 0; intento < 20; intento += 1) {
    const codigo = generarFriendCode(username);
    const ocupado = await prisma.userAccount.findUnique({
      where: { friendCode: codigo },
      select: { id: true },
    });
    if (!ocupado) return codigo;
  }
  return generarFriendCode(`${username}${Date.now().toString(36).slice(-3)}`);
}

export type ResultadoCuenta = {
  userId: string;
  username: string;
  friendCode: string;
  nueva: boolean;
  /** Qué se ha heredado del invitado, para poder celebrarlo en pantalla. */
  migrado: { partidas: number; xp: number; logros: number; records: number } | null;
};

/**
 * Crea la cuenta si no existe y le ata el invitado actual.
 *
 * Es idempotente: entrar dos veces con el mismo correo devuelve la misma cuenta, y atar un
 * invitado ya atado no hace nada.
 */
export async function entrarConCorreo(
  emailBruto: string,
  guestPublicId: string | null,
  timezone: string,
): Promise<ResultadoCuenta> {
  const email = normalizarEmail(emailBruto);

  const existente = await prisma.userAccount.findUnique({
    where: { email },
    include: { profile: true },
  });

  if (existente) {
    const migrado = guestPublicId ? await migrarInvitado(existente.id, guestPublicId) : null;
    await prisma.userAccount.update({
      where: { id: existente.id },
      data: { lastSeenAt: new Date() },
    });
    return {
      userId: existente.id,
      username: existente.username,
      friendCode: existente.friendCode,
      nueva: false,
      migrado,
    };
  }

  const username = await usernameLibre(email);
  const friendCode = await friendCodeLibre(username);

  const cuenta = await prisma.userAccount.create({
    data: {
      email,
      username,
      friendCode,
      timezone,
      profile: { create: {} },
      settings: { create: {} },
      streak: { create: {} },
    },
  });

  const migrado = guestPublicId ? await migrarInvitado(cuenta.id, guestPublicId) : null;

  return { userId: cuenta.id, username, friendCode, nueva: true, migrado };
}

/**
 * Ata un invitado a una cuenta y recalcula el resumen del perfil.
 *
 * Si el invitado ya estaba atado a OTRA cuenta no se toca: eso pasaría si alguien comparte
 * navegador, y robarle el progreso al primero sería peor que no migrar nada.
 */
export async function migrarInvitado(
  userId: string,
  guestPublicId: string,
): Promise<{ partidas: number; xp: number; logros: number; records: number } | null> {
  const invitado = await prisma.guestPlayer.findUnique({
    where: { publicId: guestPublicId },
    include: { profile: { include: { achievements: true } }, bests: true },
  });

  if (!invitado) return null;
  if (invitado.userId && invitado.userId !== userId) return null;

  await prisma.guestPlayer.update({ where: { id: invitado.id }, data: { userId } });
  // Y la apariencia que se eligió antes de registrarse. Va por `fusionarApariencia` y no
  // campo a campo: copiarlos a mano fue lo que dejó el avatar sin migrar durante varias fases.
  await fusionarApariencia(userId, invitado.id);
  const resumen = await recalcularPerfil(userId);

  return {
    partidas: resumen.partidas,
    xp: resumen.xp,
    logros: resumen.logros,
    records: invitado.bests.length,
  };
}

/**
 * Recalcula el resumen del perfil sumando TODOS los invitados de la cuenta.
 *
 * Se recalcula en lugar de ir incrementando porque así el número siempre cuadra con lo que
 * hay: si algo se importa, se corrige o se borra, el perfil se pone al día solo.
 */
export async function recalcularPerfil(userId: string): Promise<{
  xp: number;
  nivel: number;
  rango: string;
  partidas: number;
  logros: number;
}> {
  const invitados = await prisma.guestPlayer.findMany({
    where: { userId },
    include: { profile: { include: { achievements: true } } },
  });

  const perfilesInvitado = invitados
    .map((invitado) => invitado.profile)
    .filter((perfil): perfil is NonNullable<typeof perfil> => perfil !== null);

  // XP del libro mayor (Fase 4) + lo que ya tenían los invitados (Fase 2).
  const apuntes = await prisma.xpTransaction.aggregate({
    where: { userId },
    _sum: { cantidad: true },
  });

  const xpInvitados = perfilesInvitado.reduce((suma, perfil) => suma + perfil.xp, 0);
  const xp = (apuntes._sum.cantidad ?? 0) + xpInvitados;

  const partidas = perfilesInvitado.reduce((suma, perfil) => suma + perfil.gamesFinished, 0);
  const aciertos = perfilesInvitado.reduce((suma, perfil) => suma + perfil.totalCorrect, 0);
  const respuestas = perfilesInvitado.reduce((suma, perfil) => suma + perfil.totalAnswers, 0);
  const mejorRacha = perfilesInvitado.reduce((mejor, perfil) => Math.max(mejor, perfil.bestStreak), 0);

  const logrosInvitado = perfilesInvitado.flatMap((perfil) => perfil.achievements);
  for (const logro of logrosInvitado) {
    await prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId, achievementId: logro.achievementId } },
      create: { userId, achievementId: logro.achievementId, sourceId: logro.gameId },
      update: {},
    });
  }

  const logros = await prisma.userAchievement.count({ where: { userId } });
  const rango = rangoParaXp(xp);

  await prisma.userProfile.upsert({
    where: { userId },
    create: {
      userId,
      xp,
      nivel: nivelParaXp(xp),
      rango: rango.id,
      partidas,
      aciertos,
      respuestas,
      mejorRacha,
    },
    update: {
      xp,
      nivel: nivelParaXp(xp),
      rango: rango.id,
      partidas,
      aciertos,
      respuestas,
      mejorRacha,
    },
  });

  return { xp, nivel: nivelParaXp(xp), rango: rango.id, partidas, logros };
}

// ── Perfil ──────────────────────────────────────────────────────────────────────

export async function cuentaPorId(userId: string): Promise<CuentaConPerfil | null> {
  return prisma.userAccount.findUnique({
    where: { id: userId },
    include: { profile: true, settings: true, streak: true },
  });
}

export async function cuentaPorUsername(username: string): Promise<CuentaConPerfil | null> {
  return prisma.userAccount.findUnique({
    where: { username },
    include: { profile: true, settings: true, streak: true },
  });
}

export async function cuentaPorFriendCode(codigo: string): Promise<CuentaConPerfil | null> {
  const normalizado = normalizarFriendCode(codigo);
  if (!normalizado) return null;
  return prisma.userAccount.findUnique({
    where: { friendCode: normalizado },
    include: { profile: true, settings: true, streak: true },
  });
}

export type ResultadoCambioUsername =
  | { ok: true; username: string }
  | { ok: false; motivo: string };

export async function cambiarUsername(
  userId: string,
  nuevo: string,
): Promise<ResultadoCambioUsername> {
  const cuenta = await prisma.userAccount.findUnique({
    where: { id: userId },
    select: { usernameChangedAt: true, username: true },
  });
  if (!cuenta) return { ok: false, motivo: 'La cuenta no existe.' };

  const enfriamiento = puedeCambiarUsername(cuenta.usernameChangedAt, new Date());
  if (!enfriamiento.puede) {
    return {
      ok: false,
      motivo: `Podrás cambiarlo dentro de ${enfriamiento.diasRestantes} días. Se cambia como mucho cada ${ENFRIAMIENTO_USERNAME_DIAS}.`,
    };
  }

  const validado = validarUsername(nuevo);
  if (!validado.ok) {
    const mensajes: Record<string, string> = {
      CORTO: 'Muy corto.',
      LARGO: 'Muy largo.',
      CARACTERES: 'Solo letras, números, punto y guion bajo.',
      RESERVADO: 'Ese nombre está reservado.',
      VETADO: 'Ese nombre no cuela.',
    };
    return { ok: false, motivo: mensajes[validado.motivo] ?? 'Nombre inválido.' };
  }

  const ocupado = await prisma.userAccount.findUnique({
    where: { username: validado.username },
    select: { id: true },
  });
  if (ocupado && ocupado.id !== userId) return { ok: false, motivo: 'Ese nombre ya lo tiene otro vecino.' };

  await prisma.userAccount.update({
    where: { id: userId },
    data: { username: validado.username, usernameChangedAt: new Date() },
  });

  return { ok: true, username: validado.username };
}

// ── Borrado de cuenta ───────────────────────────────────────────────────────────

/** Días de gracia antes del borrado real. Se puede cancelar durante ese tiempo. */
export const DIAS_GRACIA_BORRADO = 14;

export async function pedirBorrado(userId: string): Promise<Date> {
  const deleteAfter = new Date(Date.now() + DIAS_GRACIA_BORRADO * 86_400_000);
  await prisma.userAccount.update({
    where: { id: userId },
    data: { estado: 'PENDIENTE_BORRADO', deleteAfter },
  });
  // Se cierran todas las sesiones: si alguien entró sin permiso, deja de tener acceso.
  await prisma.userSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return deleteAfter;
}

export async function cancelarBorrado(userId: string): Promise<void> {
  await prisma.userAccount.update({
    where: { id: userId },
    data: { estado: 'ACTIVA', deleteAfter: null },
  });
}

/**
 * Borrado real. Lo ejecuta el job cuando pasa la gracia.
 *
 * Se ANONIMIZA en lugar de borrar en cascada: las partidas de otras personas hacen
 * referencia a estas (clasificaciones de sala, desafíos), y borrarlas dejaría agujeros en
 * el historial de terceros. Se va todo lo personal y queda un vecino sin nombre.
 */
export async function ejecutarBorrado(userId: string): Promise<void> {
  const anonimo = `vecino_borrado_${userId.slice(-8)}`;

  await prisma.$transaction([
    prisma.pushSubscription.deleteMany({ where: { userId } }),
    prisma.userSession.deleteMany({ where: { userId } }),
    prisma.notification.deleteMany({ where: { userId } }),
    prisma.activityEvent.deleteMany({ where: { userId } }),
    prisma.friendRequest.deleteMany({
      where: { OR: [{ solicitanteId: userId }, { destinatarioId: userId }] },
    }),
    prisma.friendship.deleteMany({ where: { OR: [{ aId: userId }, { bId: userId }] } }),
    prisma.block.deleteMany({ where: { OR: [{ bloqueadorId: userId }, { bloqueadoId: userId }] } }),
    // El invitado se desata: sus partidas siguen existiendo, pero ya no son de nadie.
    prisma.guestPlayer.updateMany({ where: { userId }, data: { userId: null } }),
    prisma.userProfile.updateMany({
      where: { userId },
      data: { displayName: null, titulo: null, categoriaFavorita: null },
    }),
    prisma.userAccount.update({
      where: { id: userId },
      data: {
        email: `${anonimo}@borrado.local`,
        username: anonimo,
        friendCode: `BORR-${userId.slice(-4).toUpperCase()}`,
        estado: 'BANEADA',
        deleteAfter: null,
      },
    }),
  ]);
}

// ── Privacidad ──────────────────────────────────────────────────────────────────

export type ContextoVisibilidad = {
  esUnoMismo: boolean;
  esAmigo: boolean;
  estaBloqueado: boolean;
};

/** Relación entre dos cuentas: lo que hace falta para decidir qué puede ver quién. */
export async function relacionEntre(
  observadorId: string | null,
  objetivoId: string,
): Promise<ContextoVisibilidad> {
  if (!observadorId) return { esUnoMismo: false, esAmigo: false, estaBloqueado: false };
  if (observadorId === objetivoId) {
    return { esUnoMismo: true, esAmigo: false, estaBloqueado: false };
  }

  const [a, b] = [observadorId, objetivoId].sort();
  const [amistad, bloqueo] = await Promise.all([
    prisma.friendship.findFirst({ where: { aId: a, bId: b }, select: { id: true } }),
    prisma.block.findFirst({
      where: {
        OR: [
          { bloqueadorId: objetivoId, bloqueadoId: observadorId },
          { bloqueadorId: observadorId, bloqueadoId: objetivoId },
        ],
      },
      select: { id: true },
    }),
  ]);

  return {
    esUnoMismo: false,
    esAmigo: Boolean(amistad),
    estaBloqueado: Boolean(bloqueo),
  };
}

export function visibilidad(valor: string | undefined): Visibilidad {
  return valor === 'AMIGOS' || valor === 'NADIE' ? valor : 'TODOS';
}
