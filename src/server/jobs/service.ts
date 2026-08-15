/**
 * TRABAJOS PROGRAMADOS.
 *
 * ## Dónde se ejecutan y por qué
 *
 * En Vercel no se pueden usar cron functions con este despliegue (la cuenta del equipo no
 * tiene autorizados los builds en la nube, y las tareas programadas los necesitan). Así que
 * los dispara **GitHub Actions** con un `schedule`, llamando a `/api/jobs` con un secreto.
 * Es la misma vía que ya usa el deploy, no añade infraestructura y se puede lanzar a mano
 * desde la pestaña de Actions cuando haga falta.
 *
 * ## Todos son idempotentes (§80)
 *
 * Un cron puede dispararse dos veces, llegar tarde o solaparse con un despliegue. Ninguno de
 * estos trabajos puede hacer daño si se ejecuta de más:
 *
 *   · las concesiones de XP van por clave única (usuario, motivo, origen);
 *   · el cierre de liga marca `cerrada` en la misma transacción que reparte;
 *   · los recordatorios se apoyan en los topes de frecuencia del motor de notificaciones;
 *   · las limpiezas borran por condición, no por lista.
 */

import { prisma } from '../db';
import { limpiarCaducados } from '../cuentas/auth';
import { ejecutarBorrado } from '../cuentas/service';
import { limpiarBuzon, notificar } from '../notificaciones/service';
import { caducarDesafios } from '../social/service';
import { abrirTemporadaDeLiga, cerrarLigasVencidas, temporadaActiva } from '../ligas/service';
import { diaLocal, rachaEnPeligro } from '@/domain/progresion/rachas';
import { claveDelDia, configuracionDelReto } from '@/domain/challenges/daily';

export type ResultadoJob = { nombre: string; ok: boolean; detalle: Record<string, unknown> };

/** Trabajos que hay. El nombre es lo que se pasa por la API. */
export const JOBS = [
  'mantenimiento',
  'reto-diario',
  'racha-en-peligro',
  'liga-cierre',
  'liga-aviso',
  'resumen-semanal',
  'borrados',
] as const;

export type NombreJob = (typeof JOBS)[number];

/**
 * LIMPIEZA. Tokens caducados, sesiones muertas, notificaciones viejas y desafíos vencidos.
 */
export async function jobMantenimiento(): Promise<ResultadoJob> {
  const [auth, buzon, desafios] = await Promise.all([
    limpiarCaducados(),
    limpiarBuzon(),
    caducarDesafios(),
  ]);

  // Salas efímeras que ya nadie va a usar.
  const salas = await prisma.room.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 24 * 3_600_000) } },
  });

  return {
    nombre: 'mantenimiento',
    ok: true,
    detalle: {
      tokens: auth.tokens,
      sesiones: auth.sesiones,
      notificaciones: buzon,
      desafios,
      salas: salas.count,
    },
  };
}

/**
 * RETO DIARIO DISPONIBLE. Se avisa solo a quien lo tenga activado y no haya jugado hoy.
 *
 * El motor decide si el push sale o no (topes, silencio, inactividad); aquí solo se elige a
 * quién tiene sentido avisar.
 */
export async function jobRetoDiario(): Promise<ResultadoJob> {
  const dailyKey = claveDelDia(new Date());
  const reto = configuracionDelReto(dailyKey);

  // Solo gente que ha jugado en las últimas dos semanas: al que no vuelve no se le insiste.
  const desde = new Date(Date.now() - 14 * 86_400_000);
  const candidatos = await prisma.userAccount.findMany({
    where: { estado: 'ACTIVA', lastSeenAt: { gte: desde } },
    select: { id: true, timezone: true, guests: { select: { id: true } } },
    take: 5000,
  });

  let avisados = 0;
  for (const cuenta of candidatos) {
    const hoy = diaLocal(new Date(), cuenta.timezone);
    const guestIds = cuenta.guests.map((invitado) => invitado.id);
    if (guestIds.length === 0) continue;

    const yaJugado = await prisma.dailyResult.findFirst({
      where: { guestId: { in: guestIds }, dailyKey },
      select: { id: true },
    });
    if (yaJugado) continue;

    const resultado = await notificar({
      userId: cuenta.id,
      tipo: 'DAILY_AVAILABLE',
      datos: { titular: reto.titular, dia: hoy },
    });
    if (resultado.canales.push) avisados += 1;
  }

  return { nombre: 'reto-diario', ok: true, detalle: { candidatos: candidatos.length, avisados } };
}

/**
 * RACHA EN PELIGRO. Solo a quien tiene una racha de verdad (2+) y no ha jugado hoy.
 *
 * Se ejecuta por la tarde-noche, que es cuando el aviso sirve de algo. Si ya ha jugado, no
 * se manda: recordar algo que ya está hecho es la definición de molestar.
 */
export async function jobRachaEnPeligro(): Promise<ResultadoJob> {
  const rachas = await prisma.streak.findMany({
    where: { actual: { gte: 2 } },
    include: { user: { select: { id: true, timezone: true, estado: true } } },
    take: 5000,
  });

  let avisados = 0;
  for (const racha of rachas) {
    if (racha.user.estado !== 'ACTIVA') continue;

    const hoy = diaLocal(new Date(), racha.user.timezone);
    const enPeligro = rachaEnPeligro(
      {
        actual: racha.actual,
        mejor: racha.mejor,
        ultimoDia: racha.ultimoDia,
        seguros: racha.seguros,
        recuperacion: null,
      },
      hoy,
    );
    if (!enPeligro) continue;

    const resultado = await notificar({
      userId: racha.userId,
      tipo: 'STREAK_AT_RISK',
      datos: { dias: racha.actual },
    });
    if (resultado.canales.push) avisados += 1;
  }

  return { nombre: 'racha-en-peligro', ok: true, detalle: { revisadas: rachas.length, avisados } };
}

/** CIERRE DE LIGA. Reparte ascensos y descensos y abre la siguiente si toca. */
export async function jobCierreDeLiga(): Promise<ResultadoJob> {
  const cierre = await cerrarLigasVencidas();

  let abierta = 0;
  const temporada = await temporadaActiva();
  if (temporada) {
    const abiertas = await prisma.leagueSeason.count({
      where: { seasonId: temporada.id, cerrada: false },
    });
    if (abiertas === 0) abierta = await abrirTemporadaDeLiga(temporada.id);
  }

  return { nombre: 'liga-cierre', ok: true, detalle: { ...cierre, colocados: abierta } };
}

/** AVISO DE FIN DE LIGA. Un día antes, y una sola vez: el motor impide repetirlo. */
export async function jobAvisoDeLiga(): Promise<ResultadoJob> {
  const manana = new Date(Date.now() + 36 * 3_600_000);
  const ligas = await prisma.leagueSeason.findMany({
    where: { cerrada: false, terminaAt: { lt: manana, gt: new Date() } },
    include: {
      grupos: { include: { participantes: { orderBy: { puntos: 'desc' } } } },
    },
  });

  let avisados = 0;
  for (const liga of ligas) {
    for (const grupo of liga.grupos) {
      const quinto = grupo.participantes[4];
      for (const [indice, participante] of grupo.participantes.entries()) {
        const posicion = indice + 1;
        const paraAscender =
          quinto && posicion > 5 ? Math.max(0, quinto.puntos - participante.puntos + 1) : 0;

        const resultado = await notificar({
          userId: participante.userId,
          tipo: 'LEAGUE_ENDING',
          datos: { posicion, paraAscender },
        });
        if (resultado.canales.push) avisados += 1;
      }
    }
  }

  return { nombre: 'liga-aviso', ok: true, detalle: { ligas: ligas.length, avisados } };
}

/**
 * RESUMEN SEMANAL. Se genera para quien haya jugado algo esta semana; a quien no ha jugado
 * no se le manda un resumen vacío, que sería una forma elegante de decirle «no has venido».
 */
export async function jobResumenSemanal(): Promise<ResultadoJob> {
  const desde = new Date(Date.now() - 7 * 86_400_000);

  const cuentas = await prisma.userAccount.findMany({
    where: { estado: 'ACTIVA', lastSeenAt: { gte: desde } },
    select: { id: true, guests: { select: { id: true } } },
    take: 5000,
  });

  let generados = 0;
  for (const cuenta of cuentas) {
    const guestIds = cuenta.guests.map((invitado) => invitado.id);
    if (guestIds.length === 0) continue;

    const partidas = await prisma.game.count({
      where: { guestId: { in: guestIds }, status: 'FINISHED', finishedAt: { gte: desde } },
    });
    if (partidas === 0) continue;

    const records = await prisma.personalBest.count({
      where: { guestId: { in: guestIds }, updatedAt: { gte: desde } },
    });

    await notificar({
      userId: cuenta.id,
      tipo: 'RECAP_READY',
      datos: { partidas, records },
    });
    generados += 1;
  }

  return { nombre: 'resumen-semanal', ok: true, detalle: { generados } };
}

/** BORRADOS. Ejecuta los borrados de cuenta cuyo periodo de gracia ha pasado. */
export async function jobBorrados(): Promise<ResultadoJob> {
  const pendientes = await prisma.userAccount.findMany({
    where: { estado: 'PENDIENTE_BORRADO', deleteAfter: { lt: new Date() } },
    select: { id: true },
    take: 100,
  });

  for (const cuenta of pendientes) {
    await ejecutarBorrado(cuenta.id);
  }

  return { nombre: 'borrados', ok: true, detalle: { borradas: pendientes.length } };
}

const EJECUTORES: Record<NombreJob, () => Promise<ResultadoJob>> = {
  mantenimiento: jobMantenimiento,
  'reto-diario': jobRetoDiario,
  'racha-en-peligro': jobRachaEnPeligro,
  'liga-cierre': jobCierreDeLiga,
  'liga-aviso': jobAvisoDeLiga,
  'resumen-semanal': jobResumenSemanal,
  borrados: jobBorrados,
};

export async function ejecutarJob(nombre: string): Promise<ResultadoJob> {
  const ejecutor = EJECUTORES[nombre as NombreJob];
  if (!ejecutor) return { nombre, ok: false, detalle: { error: 'trabajo desconocido' } };

  const arranque = Date.now();
  try {
    const resultado = await ejecutor();
    console.info('[job] ok', { nombre, ms: Date.now() - arranque, ...resultado.detalle });
    return resultado;
  } catch (error) {
    console.error('[job] error', { nombre, error });
    return {
      nombre,
      ok: false,
      detalle: { error: error instanceof Error ? error.message : 'error desconocido' },
    };
  }
}
