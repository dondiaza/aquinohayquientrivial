/**
 * LIGAS Y TEMPORADAS — el servicio.
 *
 * Todo lo que decide reglas está en `domain/ligas`; aquí solo hay filas. Dos cosas que
 * conviene tener presentes:
 *
 *   · **Cerrar una liga es idempotente.** El job puede ejecutarse dos veces (reintento de
 *     GitHub Actions, despliegue a mitad) y el resultado tiene que ser el mismo: por eso el
 *     cierre marca `cerrada` dentro de la misma transacción que reparte los ascensos.
 *   · **A nadie se le mete en una liga sin haber jugado.** Se entra al sumar los primeros
 *     puntos, no por existir. Así no hay grupos llenos de gente que no ha aparecido.
 */

import { prisma } from '../db';
import { notificar } from '../notificaciones/service';
import {
  actualizarSkill,
  cerrarGrupo,
  conTopeDiario,
  ligaPorId,
  puntosDeLiga,
  repartirEnGrupos,
  type PartidaParaLiga,
} from '@/domain/ligas/ligas';
import { diaLocal } from '@/domain/progresion/rachas';

/** Duración de una temporada de liga. Dos semanas: suficiente para remontar, poco para aburrir. */
export const DIAS_TEMPORADA_LIGA = 14;

/** Temporada activa, o null si no hay ninguna. */
export async function temporadaActiva() {
  return prisma.season.findFirst({
    where: { activa: true, terminaAt: { gt: new Date() } },
    orderBy: { empiezaAt: 'desc' },
  });
}

/**
 * Suma los puntos de liga de una partida. Si la persona no estaba en ninguna liga, entra en
 * la más baja: se empieza por el Portal, como todo el mundo.
 */
export async function sumarPuntosDeLiga(
  userId: string,
  timezone: string,
  partida: PartidaParaLiga,
): Promise<{ sumados: number; recortados: number; liga: string } | null> {
  const puntos = puntosDeLiga(partida);
  if (puntos === 0) return null;

  const temporada = await temporadaActiva();
  if (!temporada) return null;

  let participacion = await prisma.leagueParticipant.findFirst({
    where: { userId, group: { leagueSeason: { seasonId: temporada.id, cerrada: false } } },
    include: { group: { include: { leagueSeason: true } } },
  });

  // Primera vez: entra en la liga más baja de la temporada.
  if (!participacion) {
    const liga = await prisma.leagueSeason.findFirst({
      where: { seasonId: temporada.id, liga: 'portal', cerrada: false },
      include: { grupos: { include: { _count: { select: { participantes: true } } } } },
    });
    if (!liga) return null;

    const conHueco = liga.grupos.find((grupo) => grupo._count.participantes < 20);
    const grupo =
      conHueco ??
      (await prisma.leagueGroup.create({
        data: { leagueSeasonId: liga.id, numero: liga.grupos.length + 1 },
        include: { _count: { select: { participantes: true } } },
      }));

    participacion = await prisma.leagueParticipant.create({
      data: { groupId: grupo.id, userId },
      include: { group: { include: { leagueSeason: true } } },
    });
  }

  const hoy = diaLocal(new Date(), timezone);
  const yaHoy = participacion.ultimoDia === hoy ? participacion.puntosHoy : 0;
  const { suma, recortado } = conTopeDiario(puntos, yaHoy);

  if (suma > 0) {
    await prisma.leagueParticipant.update({
      where: { id: participacion.id },
      data: {
        puntos: { increment: suma },
        puntosHoy: participacion.ultimoDia === hoy ? { increment: suma } : suma,
        ultimoDia: hoy,
      },
    });
  }

  return { sumados: suma, recortados: recortado, liga: participacion.group.leagueSeason.liga };
}

/** Actualiza la habilidad estimada. Separada del XP a propósito (§30). */
export async function actualizarHabilidad(
  userId: string,
  partida: { precision: number; dificultadMedia: number },
): Promise<number> {
  const perfil = await prisma.userProfile.findUnique({
    where: { userId },
    select: { skillRating: true, skillPartidas: true },
  });

  const nuevo = actualizarSkill(
    perfil?.skillRating ?? 1000,
    perfil?.skillPartidas ?? 0,
    partida,
  );

  await prisma.userProfile.upsert({
    where: { userId },
    create: { userId, skillRating: nuevo, skillPartidas: 1 },
    update: { skillRating: nuevo, skillPartidas: { increment: 1 } },
  });

  return nuevo;
}

/** Clasificación del grupo de alguien, con su posición marcada. */
export async function clasificacionDe(userId: string) {
  const participacion = await prisma.leagueParticipant.findFirst({
    where: { userId, group: { leagueSeason: { cerrada: false } } },
    include: {
      group: {
        include: {
          leagueSeason: true,
          participantes: {
            orderBy: [{ puntos: 'desc' }],
            include: { user: { select: { username: true, profile: true } } },
          },
        },
      },
    },
  });

  if (!participacion) return null;

  const puestos = participacion.group.participantes.map((entrada, indice) => ({
    posicion: indice + 1,
    userId: entrada.userId,
    username: entrada.user.username,
    puntos: entrada.puntos,
    arquetipo: entrada.user.profile?.arquetipo ?? 'presidente',
    colorAvatar: entrada.user.profile?.colorAvatar ?? 'verde',
    esTu: entrada.userId === userId,
  }));

  const miPuesto = puestos.find((puesto) => puesto.esTu);
  const quinto = puestos[4];

  return {
    liga: ligaPorId(participacion.group.leagueSeason.liga),
    terminaAt: participacion.group.leagueSeason.terminaAt,
    puestos,
    posicion: miPuesto?.posicion ?? 0,
    /** Cuántos puntos faltan para entrar en zona de ascenso. Es el número que motiva. */
    paraAscender:
      miPuesto && quinto && miPuesto.posicion > 5 ? Math.max(0, quinto.puntos - miPuesto.puntos + 1) : 0,
  };
}

// ── Cierre de temporada ─────────────────────────────────────────────────────────

export type ResumenCierre = {
  ligasCerradas: number;
  ascendidos: number;
  descendidos: number;
  avisados: number;
};

/**
 * Cierra todas las ligas vencidas y reparte ascensos y descensos.
 *
 * Idempotente: marca `cerrada` en la misma transacción, así que un segundo pase no vuelve a
 * repartir nada.
 */
export async function cerrarLigasVencidas(): Promise<ResumenCierre> {
  const vencidas = await prisma.leagueSeason.findMany({
    where: { cerrada: false, terminaAt: { lt: new Date() } },
    include: {
      grupos: {
        include: {
          participantes: { include: { user: { select: { timezone: true } } } },
        },
      },
    },
  });

  let ascendidos = 0;
  let descendidos = 0;
  let avisados = 0;

  for (const liga of vencidas) {
    for (const grupo of liga.grupos) {
      const partidasPorUsuario = new Map<string, number>();
      for (const participante of grupo.participantes) {
        partidasPorUsuario.set(participante.userId, participante.puntos > 0 ? 1 : 0);
      }

      const resultados = cerrarGrupo(
        liga.liga,
        grupo.participantes.map((participante) => ({
          userId: participante.userId,
          puntos: participante.puntos,
          partidas: partidasPorUsuario.get(participante.userId) ?? 0,
        })),
      );

      await prisma.$transaction(
        resultados.map((resultado) =>
          prisma.leagueParticipant.updateMany({
            where: { groupId: grupo.id, userId: resultado.userId },
            data: { posicionFinal: resultado.posicion, resultado: resultado.resultado },
          }),
        ),
      );

      for (const resultado of resultados) {
        if (resultado.resultado === 'ASCIENDE') {
          ascendidos += 1;
          await notificar({
            userId: resultado.userId,
            tipo: 'LEAGUE_PROMOTED',
            datos: { liga: ligaPorId(resultado.ligaNueva).nombre },
          });
          avisados += 1;
        } else if (resultado.resultado === 'DESCIENDE') {
          descendidos += 1;
        }
      }
    }

    await prisma.leagueSeason.update({ where: { id: liga.id }, data: { cerrada: true } });
  }

  return { ligasCerradas: vencidas.length, ascendidos, descendidos, avisados };
}

/**
 * Abre una temporada nueva de liga y reparte a la gente en grupos según habilidad.
 *
 * Solo entra quien haya jugado en los últimos 30 días: un grupo lleno de ausentes hace que
 * ascender sea trivial y quita toda la gracia.
 */
export async function abrirTemporadaDeLiga(seasonId: string): Promise<number> {
  const desde = new Date(Date.now() - 30 * 86_400_000);
  const activos = await prisma.userProfile.findMany({
    where: { user: { lastSeenAt: { gte: desde }, estado: 'ACTIVA' } },
    select: { userId: true, skillRating: true },
  });

  if (activos.length === 0) return 0;

  const empiezaAt = new Date();
  const terminaAt = new Date(Date.now() + DIAS_TEMPORADA_LIGA * 86_400_000);

  // Por ahora todos empiezan en Portal: la promoción los repartirá por su cuenta.
  const liga = await prisma.leagueSeason.upsert({
    where: { seasonId_liga: { seasonId, liga: 'portal' } },
    create: { seasonId, liga: 'portal', empiezaAt, terminaAt },
    update: { empiezaAt, terminaAt, cerrada: false },
  });

  const grupos = repartirEnGrupos(activos);
  let colocados = 0;

  for (const [indice, miembros] of grupos.entries()) {
    const grupo = await prisma.leagueGroup.upsert({
      where: { leagueSeasonId_numero: { leagueSeasonId: liga.id, numero: indice + 1 } },
      create: { leagueSeasonId: liga.id, numero: indice + 1 },
      update: {},
    });

    for (const userId of miembros) {
      await prisma.leagueParticipant.upsert({
        where: { groupId_userId: { groupId: grupo.id, userId } },
        create: { groupId: grupo.id, userId },
        update: {},
      });
      colocados += 1;
    }
  }

  return colocados;
}
