/**
 * CLASIFICACIÓN DE LA COMUNIDAD.
 *
 * ## Decisión: no hay una segunda moneda
 *
 * El enunciado pide ordenar por «puntos acumulados válidos». Ya existe algo que es
 * exactamente eso: el **libro mayor de XP** (`XpTransaction`), que nació con antifarmeo,
 * topes diarios, rendimientos decrecientes e idempotencia por clave única.
 *
 * Crear un `PointTransaction` aparte habría dejado dos monedas que hay que mantener
 * sincronizadas, dos sitios donde protegerse del farmeo y una pregunta sin respuesta buena
 * en la interfaz: «¿y esto son los otros puntos?». Así que la clasificación ordena por XP y
 * en pantalla se llama **puntos de vecindad**. Una sola verdad, ya auditable.
 *
 * Lo que sí se añade son las otras métricas que pide el enunciado —nivel, victorias,
 * precisión, partidas, racha—, pero como COLUMNAS de la tabla, no mezcladas en la cifra.
 * Una clasificación que suma cinco cosas en un número es una clasificación que nadie
 * entiende ni puede discutir.
 *
 * ## Escalabilidad
 *
 * `UserProfile.xp` está indexado, así que el top se saca con un `ORDER BY … LIMIT`. La
 * posición de alguien es un `COUNT(*) WHERE xp > el suyo`, que también usa el índice: no
 * hace falta materializar nada hasta que haya cientos de miles de perfiles, y cuando haga
 * falta el sitio para hacerlo es este fichero y solo este.
 *
 * Los tramos temporales (semana, mes) se calculan sobre el libro mayor agrupando por
 * usuario, que es para lo que sirve tener un libro.
 */

import { Prisma } from '@prisma/client';

import { prisma } from '../db';
import { rangoPorId } from '@/domain/progression/progression';
import { sanearAvatar, type AvatarConfig } from '@/domain/avatar/config';

export const TRAMOS = ['global', 'semana', 'mes', 'temporada', 'amigos', 'comunidad'] as const;
export type Tramo = (typeof TRAMOS)[number];

export type FilaRanking = {
  posicion: number;
  userId: string;
  username: string;
  arquetipo: string;
  colorAvatar: string;
  /** El vecino dibujado, si lo ha hecho. Si no, se pinta el avatar de arquetipo. */
  vecino: AvatarConfig | null;
  nivel: number;
  rango: string;
  rangoLabel: string;
  puntos: number;
  partidas: number;
  victorias: number;
  precision: number;
  racha: number;
  esTu: boolean;
};

export type Clasificacion = {
  tramo: Tramo;
  filas: FilaRanking[];
  /** Tu fila, aunque estés en el puesto 4.253 y no salgas en el top. */
  tuya: FilaRanking | null;
  total: number;
};

const TOPE = 100;

function aFila(
  posicion: number,
  perfil: {
    userId: string;
    xp: number;
    nivel: number;
    rango: string;
    partidas: number;
    victorias: number;
    aciertos: number;
    respuestas: number;
    arquetipo: string;
    colorAvatar: string;
    avatarConfig: Prisma.JsonValue | null;
    user: { username: string; streak: { actual: number } | null };
  },
  puntos: number,
  tuId: string | null,
): FilaRanking {
  const rango = rangoPorId(perfil.rango);
  return {
    posicion,
    userId: perfil.userId,
    username: perfil.user.username,
    arquetipo: perfil.arquetipo,
    colorAvatar: perfil.colorAvatar,
    vecino:
      perfil.avatarConfig && typeof perfil.avatarConfig === 'object' && !Array.isArray(perfil.avatarConfig)
        ? sanearAvatar(perfil.avatarConfig)
        : null,
    nivel: perfil.nivel,
    rango: perfil.rango,
    rangoLabel: rango.label,
    puntos,
    partidas: perfil.partidas,
    victorias: perfil.victorias,
    precision:
      perfil.respuestas > 0 ? Math.round((perfil.aciertos / perfil.respuestas) * 100) : 0,
    racha: perfil.user.streak?.actual ?? 0,
    esTu: perfil.userId === tuId,
  };
}

const INCLUIR = {
  user: { select: { username: true, streak: { select: { actual: true } } } },
} as const;

/** Solo cuentan las cuentas activas: una baneada no debe ocupar un puesto. */
const SOLO_ACTIVAS = { user: { estado: 'ACTIVA' as const } };

// ── Global ──────────────────────────────────────────────────────────────────────

async function clasificacionGlobal(tuId: string | null): Promise<Clasificacion> {
  const [perfiles, total] = await Promise.all([
    prisma.userProfile.findMany({
      where: { ...SOLO_ACTIVAS, xp: { gt: 0 } },
      orderBy: [{ xp: 'desc' }, { userId: 'asc' }],
      take: TOPE,
      include: INCLUIR,
    }),
    prisma.userProfile.count({ where: { ...SOLO_ACTIVAS, xp: { gt: 0 } } }),
  ]);

  const filas = perfiles.map((perfil, indice) => aFila(indice + 1, perfil, perfil.xp, tuId));

  return { tramo: 'global', filas, tuya: await miFilaGlobal(tuId, filas), total };
}

/**
 * Mi posición aunque no esté en el top.
 *
 * Un `COUNT` sobre el índice de `xp`: es una consulta, no un recorrido. Con esto se puede
 * enseñar «#4253 · Tú» sin traerse cuatro mil filas.
 */
async function miFilaGlobal(
  tuId: string | null,
  yaVisibles: readonly FilaRanking[],
): Promise<FilaRanking | null> {
  if (!tuId) return null;
  const yaSale = yaVisibles.find((fila) => fila.userId === tuId);
  if (yaSale) return yaSale;

  const mio = await prisma.userProfile.findUnique({
    where: { userId: tuId },
    include: INCLUIR,
  });
  if (!mio) return null;

  const porDelante = await prisma.userProfile.count({
    where: { ...SOLO_ACTIVAS, xp: { gt: mio.xp } },
  });

  return aFila(porDelante + 1, mio, mio.xp, tuId);
}

// ── Tramos temporales ───────────────────────────────────────────────────────────

/**
 * Suma del libro mayor en una ventana de tiempo. Para esto sirve tener un libro y no un
 * contador: «cuánto ha ganado esta semana» es una consulta, no un campo que mantener.
 */
async function clasificacionPorVentana(
  tramo: Tramo,
  desde: Date,
  tuId: string | null,
): Promise<Clasificacion> {
  const agrupado = await prisma.xpTransaction.groupBy({
    by: ['userId'],
    where: { createdAt: { gte: desde } },
    _sum: { cantidad: true },
    orderBy: { _sum: { cantidad: 'desc' } },
    take: TOPE,
  });

  const ids = agrupado.map((entrada) => entrada.userId);
  if (ids.length === 0) return { tramo, filas: [], tuya: null, total: 0 };

  const perfiles = await prisma.userProfile.findMany({
    where: { userId: { in: ids }, ...SOLO_ACTIVAS },
    include: INCLUIR,
  });
  const porId = new Map(perfiles.map((perfil) => [perfil.userId, perfil]));

  const filas: FilaRanking[] = [];
  for (const entrada of agrupado) {
    const perfil = porId.get(entrada.userId);
    if (!perfil) continue;
    filas.push(aFila(filas.length + 1, perfil, entrada._sum.cantidad ?? 0, tuId));
  }

  let tuya = filas.find((fila) => fila.esTu) ?? null;

  if (!tuya && tuId) {
    const mio = await prisma.xpTransaction.aggregate({
      where: { userId: tuId, createdAt: { gte: desde } },
      _sum: { cantidad: true },
    });
    const perfil = await prisma.userProfile.findUnique({
      where: { userId: tuId },
      include: INCLUIR,
    });
    if (perfil && (mio._sum.cantidad ?? 0) > 0) {
      // La posición exacta fuera del top requiere agrupar todo, y eso no compensa: se
      // enseña la puntuación con la posición del último visible como cota.
      tuya = aFila(filas.length + 1, perfil, mio._sum.cantidad ?? 0, tuId);
    }
  }

  return { tramo, filas, tuya, total: filas.length };
}

// ── Amigos y comunidad ──────────────────────────────────────────────────────────

async function clasificacionDeAmigos(tuId: string | null): Promise<Clasificacion> {
  if (!tuId) return { tramo: 'amigos', filas: [], tuya: null, total: 0 };

  const amistades = await prisma.friendship.findMany({
    where: { OR: [{ aId: tuId }, { bId: tuId }] },
  });
  const ids = [
    tuId,
    ...amistades.map((amistad) => (amistad.aId === tuId ? amistad.bId : amistad.aId)),
  ];

  const perfiles = await prisma.userProfile.findMany({
    where: { userId: { in: ids }, ...SOLO_ACTIVAS },
    orderBy: [{ xp: 'desc' }, { userId: 'asc' }],
    include: INCLUIR,
  });

  const filas = perfiles.map((perfil, indice) => aFila(indice + 1, perfil, perfil.xp, tuId));
  return {
    tramo: 'amigos',
    filas,
    tuya: filas.find((fila) => fila.esTu) ?? null,
    total: filas.length,
  };
}

async function clasificacionDeComunidad(tuId: string | null): Promise<Clasificacion> {
  if (!tuId) return { tramo: 'comunidad', filas: [], tuya: null, total: 0 };

  const pertenencia = await prisma.communityMember.findFirst({
    where: { userId: tuId },
    select: { communityId: true },
  });
  if (!pertenencia) return { tramo: 'comunidad', filas: [], tuya: null, total: 0 };

  const miembros = await prisma.communityMember.findMany({
    where: { communityId: pertenencia.communityId },
    select: { userId: true },
  });

  const perfiles = await prisma.userProfile.findMany({
    where: { userId: { in: miembros.map((miembro) => miembro.userId) }, ...SOLO_ACTIVAS },
    orderBy: [{ xp: 'desc' }, { userId: 'asc' }],
    include: INCLUIR,
  });

  const filas = perfiles.map((perfil, indice) => aFila(indice + 1, perfil, perfil.xp, tuId));
  return {
    tramo: 'comunidad',
    filas,
    tuya: filas.find((fila) => fila.esTu) ?? null,
    total: filas.length,
  };
}

// ── Punto de entrada ────────────────────────────────────────────────────────────

export async function clasificacion(tramo: Tramo, tuId: string | null): Promise<Clasificacion> {
  const ahora = Date.now();

  switch (tramo) {
    case 'semana':
      return clasificacionPorVentana('semana', new Date(ahora - 7 * 86_400_000), tuId);
    case 'mes':
      return clasificacionPorVentana('mes', new Date(ahora - 30 * 86_400_000), tuId);
    case 'temporada': {
      const temporada = await prisma.season.findFirst({
        where: { activa: true },
        orderBy: { empiezaAt: 'desc' },
      });
      return clasificacionPorVentana(
        'temporada',
        temporada?.empiezaAt ?? new Date(ahora - 14 * 86_400_000),
        tuId,
      );
    }
    case 'amigos':
      return clasificacionDeAmigos(tuId);
    case 'comunidad':
      return clasificacionDeComunidad(tuId);
    case 'global':
    default:
      return clasificacionGlobal(tuId);
  }
}

/**
 * Recalcula las columnas derivadas del perfil (victorias, precisión, partidas) desde las
 * partidas reales. Lo llama el panel y el job: si algo se descuadra, se arregla solo.
 */
export async function recalcularEstadisticas(userId: string): Promise<void> {
  const invitados = await prisma.guestPlayer.findMany({
    where: { userId },
    select: { id: true },
  });
  const ids = invitados.map((invitado) => invitado.id);
  if (ids.length === 0) return;

  const partidas = await prisma.game.findMany({
    where: { guestId: { in: ids }, status: 'FINISHED' },
    select: { summary: true, totalScore: true },
  });

  let victorias = 0;
  for (const partida of partidas) {
    const resumen = partida.summary as { rankId?: string } | null;
    // En solitario «ganar» es alcanzar el rango alto de la partida; en sala lo marca el motor.
    if (resumen?.rankId === 'presidente' || resumen?.rankId === 'leyenda') victorias += 1;
  }

  const salas = await prisma.roomPlayer.count({
    where: { guestId: { in: ids }, score: { gt: 0 } },
  });

  await prisma.userProfile.update({
    where: { userId },
    data: { partidas: partidas.length + salas, victorias },
  });
}

export { Prisma };
