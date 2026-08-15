/**
 * PROGRESIÓN DE CUENTA — donde el libro mayor se escribe de verdad.
 *
 * Se llama cuando pasa algo que merece XP: terminar una partida, completar el reto diario,
 * desbloquear un logro. Todo lo que hay aquí es **idempotente**: llamarlo dos veces con el
 * mismo origen no concede el doble, porque la clave única de `XpTransaction` no deja.
 *
 * Y todo es opcional: si quien juega no tiene cuenta, esto no se ejecuta y el juego funciona
 * igual. La progresión de Fase 2 (la del invitado) sigue tal cual; esto es lo que la hace
 * persistente entre dispositivos cuando alguien decide registrarse.
 */

import { Prisma } from '@prisma/client';

import { prisma } from '../db';
import {
  RECOMPENSAS,
  xpDeFuente,
  xpDePartida,
  type ContextoDia,
  type MotivoXp,
  type PartidaParaXp,
} from '@/domain/progresion/libro';
import {
  diaLocal,
  rachaInicial,
  registrarActividad,
  type EstadoRacha,
} from '@/domain/progresion/rachas';
import { nivelParaXp, rangoParaXp } from '@/domain/progression/progression';

export type ResultadoConcesion = {
  concedido: number;
  recortado: number;
  explicacion: string | null;
  xpTotal: number;
  nivel: number;
  nivelSubido: boolean;
  rango: string;
  rangoSubido: boolean;
};

/** Contexto del día: lo que ya se ha concedido hoy, para aplicar topes y decrecientes. */
async function contextoDelDia(userId: string, timezone: string): Promise<ContextoDia> {
  const hoy = diaLocal(new Date(), timezone);
  // La franja del día local en UTC: se toma con holgura y luego se filtra en memoria, que
  // para el volumen de una persona es más simple que hacer aritmética de husos en SQL.
  const desde = new Date(Date.parse(`${hoy}T00:00:00Z`) - 14 * 3_600_000);

  const apuntes = await prisma.xpTransaction.findMany({
    where: { userId, createdAt: { gte: desde } },
    select: { motivo: true, cantidad: true, createdAt: true },
  });

  const delDia = apuntes.filter((apunte) => diaLocal(apunte.createdAt, timezone) === hoy);

  const concedidoHoy: Partial<Record<MotivoXp, number>> = {};
  let partidasHoy = 0;
  for (const apunte of delDia) {
    const motivo = apunte.motivo as MotivoXp;
    concedidoHoy[motivo] = (concedidoHoy[motivo] ?? 0) + apunte.cantidad;
    if (motivo === 'PARTIDA') partidasHoy += 1;
  }

  return { concedidoHoy, partidasHoy };
}

/** Escribe el apunte y actualiza el resumen del perfil. Idempotente por (motivo, origen). */
async function anotar(
  userId: string,
  motivo: MotivoXp,
  sourceId: string,
  cantidad: number,
  recortado: number,
): Promise<ResultadoConcesion> {
  const perfilPrevio = await prisma.userProfile.findUnique({
    where: { userId },
    select: { xp: true, nivel: true, rango: true },
  });

  const xpPrevio = perfilPrevio?.xp ?? 0;
  const nivelPrevio = perfilPrevio?.nivel ?? 1;
  const rangoPrevio = perfilPrevio?.rango ?? 'visitante';

  let seConcedio = false;
  if (cantidad > 0) {
    try {
      await prisma.xpTransaction.create({
        data: { userId, motivo, sourceId, cantidad, recortado },
      });
      seConcedio = true;
    } catch (error) {
      // P2002 = clave única: ya se concedió. Es el caso normal de un reintento, no un fallo.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }
    }
  }

  const xpTotal = seConcedio ? xpPrevio + cantidad : xpPrevio;
  const nivel = nivelParaXp(xpTotal);
  const rango = rangoParaXp(xpTotal);

  if (seConcedio) {
    await prisma.userProfile.upsert({
      where: { userId },
      create: { userId, xp: xpTotal, nivel, rango: rango.id },
      update: { xp: xpTotal, nivel, rango: rango.id },
    });
  }

  return {
    concedido: seConcedio ? cantidad : 0,
    recortado,
    explicacion: null,
    xpTotal,
    nivel,
    nivelSubido: seConcedio && nivel > nivelPrevio,
    rango: rango.id,
    rangoSubido: seConcedio && rango.id !== rangoPrevio,
  };
}

/** XP por terminar una partida. `gameId` es el origen: dos envíos no conceden el doble. */
export async function concederPorPartida(
  userId: string,
  timezone: string,
  partida: PartidaParaXp,
): Promise<ResultadoConcesion> {
  const contexto = await contextoDelDia(userId, timezone);
  const concesion = xpDePartida(partida, contexto);
  const resultado = await anotar(
    userId,
    'PARTIDA',
    concesion.sourceId,
    concesion.cantidad,
    concesion.recortado,
  );
  return { ...resultado, explicacion: explicacionDe(concesion.motivoRecorte) };
}

/** XP de cualquier otra fuente. */
export async function concederPorFuente(
  userId: string,
  timezone: string,
  motivo: MotivoXp,
  sourceId: string,
  cantidad: number,
): Promise<ResultadoConcesion> {
  const contexto = await contextoDelDia(userId, timezone);
  const concesion = xpDeFuente(motivo, sourceId, cantidad, contexto);
  return anotar(userId, motivo, sourceId, concesion.cantidad, concesion.recortado);
}

function explicacionDe(motivo: string): string | null {
  switch (motivo) {
    case 'NO_SIGNIFICATIVA':
      return 'Esta partida ha sido demasiado corta para contar.';
    case 'DECRECIENTE':
      return 'Las partidas de después de las primeras del día dan menos experiencia.';
    case 'TOPE_DIARIO':
      return 'Ya has sacado toda la experiencia de hoy por aquí. Mañana vuelve a contar.';
    default:
      return null;
  }
}

// ── Racha ───────────────────────────────────────────────────────────────────────

export type ResultadoRachaCuenta = {
  actual: number;
  mejor: number;
  suceso: string;
  segurosGanados: number;
  hito: number | null;
  seguros: number;
};

/**
 * Registra un día con actividad válida. Solo se llama si la actividad ha sido
 * significativa: quien decide eso es quien llama, con las reglas de `libro.ts`.
 */
export async function registrarDiaDeActividad(
  userId: string,
  timezone: string,
): Promise<ResultadoRachaCuenta> {
  const hoy = diaLocal(new Date(), timezone);

  const fila = await prisma.streak.findUnique({ where: { userId } });
  const estado: EstadoRacha = fila
    ? {
        actual: fila.actual,
        mejor: fila.mejor,
        ultimoDia: fila.ultimoDia,
        seguros: fila.seguros,
        recuperacion: fila.recuperacionHasta
          ? {
              hasta: fila.recuperacionHasta.toISOString().slice(0, 10),
              objetivo: fila.recuperacionObjetivo,
              hechos: fila.recuperacionHechos,
              racha: fila.recuperacionRacha,
            }
          : null,
      }
    : rachaInicial();

  const resultado = registrarActividad(estado, hoy);
  const nuevo = resultado.estado;

  await prisma.streak.upsert({
    where: { userId },
    create: {
      userId,
      actual: nuevo.actual,
      mejor: nuevo.mejor,
      ultimoDia: nuevo.ultimoDia,
      seguros: nuevo.seguros,
      ...(nuevo.recuperacion
        ? {
            recuperacionHasta: new Date(`${nuevo.recuperacion.hasta}T23:59:59Z`),
            recuperacionObjetivo: nuevo.recuperacion.objetivo,
            recuperacionHechos: nuevo.recuperacion.hechos,
            recuperacionRacha: nuevo.recuperacion.racha,
          }
        : {}),
    },
    update: {
      actual: nuevo.actual,
      mejor: nuevo.mejor,
      ultimoDia: nuevo.ultimoDia,
      seguros: nuevo.seguros,
      segurosUsados:
        resultado.suceso === 'SALVADA_POR_SEGURO' ? { increment: 1 } : undefined,
      recuperacionHasta: nuevo.recuperacion
        ? new Date(`${nuevo.recuperacion.hasta}T23:59:59Z`)
        : null,
      recuperacionObjetivo: nuevo.recuperacion?.objetivo ?? 0,
      recuperacionHechos: nuevo.recuperacion?.hechos ?? 0,
      recuperacionRacha: nuevo.recuperacion?.racha ?? 0,
    },
  });

  // Los hitos de racha pagan XP, una vez por hito y racha.
  if (resultado.hito) {
    await concederPorFuente(
      userId,
      timezone,
      'RACHA_HITO',
      `${hoy}:${resultado.hito}`,
      RECOMPENSAS.hitoDeRacha,
    );
  }

  return {
    actual: nuevo.actual,
    mejor: nuevo.mejor,
    suceso: resultado.suceso,
    segurosGanados: resultado.segurosGanados,
    hito: resultado.hito,
    seguros: nuevo.seguros,
  };
}

// ── Punto de entrada desde el final de una partida ──────────────────────────────

export type ResumenProgresionCuenta = {
  xp: ResultadoConcesion | null;
  racha: ResultadoRachaCuenta | null;
};

/**
 * Todo lo que hay que hacer cuando alguien con cuenta termina una partida.
 *
 * Devuelve null limpio si no hay cuenta: quien llama no tiene que saber si hay sesión.
 */
export async function alTerminarPartida(
  guestPublicId: string,
  partida: PartidaParaXp,
): Promise<ResumenProgresionCuenta> {
  const invitado = await prisma.guestPlayer.findUnique({
    where: { publicId: guestPublicId },
    select: { userId: true, user: { select: { timezone: true } } },
  });

  const userId = invitado?.userId;
  if (!userId) return { xp: null, racha: null };

  const timezone = invitado.user?.timezone ?? 'Europe/Madrid';

  const xp = await concederPorPartida(userId, timezone, partida);
  // La racha solo cuenta si la partida fue de verdad: mismos mínimos que el XP.
  const racha =
    xp.concedido > 0 || xp.recortado > 0
      ? await registrarDiaDeActividad(userId, timezone)
      : null;

  return { xp, racha };
}
