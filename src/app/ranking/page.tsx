import type { Metadata } from 'next';
import Link from 'next/link';

import { ApartmentPlaque, PaperNotice } from '@/components/portal/Estructuras';
import { NeighbourAvatar } from '@/components/portal/Avatar';
import { Vecino } from '@/components/avatar/Vecino';
import { LinkButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Surfaces';
import { comoArquetipo, comoColor } from '@/components/sala/avatar';
import { clasificacion, TRAMOS, type FilaRanking, type Tramo } from '@/server/ranking/service';
import { idUsuarioActual } from '@/server/cuentas/sesion';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Clasificación de la comunidad',
  description: 'Quién manda en el portal esta semana.',
};

const ETIQUETAS: Record<Tramo, string> = {
  global: 'Histórico',
  semana: 'Esta semana',
  mes: 'Este mes',
  temporada: 'Temporada',
  amigos: 'Vecinos',
  comunidad: 'Mi comunidad',
};

const VACIOS: Record<Tramo, { titulo: string; texto: string; cta?: { href: string; label: string } }> = {
  global: {
    titulo: 'Todavía no hay clasificación',
    texto: 'En cuanto alguien termine una partida, esto se llena.',
    cta: { href: '/jugar/solo', label: 'Jugar una partida' },
  },
  semana: { titulo: 'La semana acaba de empezar', texto: 'Sé el primero en puntuar.' },
  mes: { titulo: 'Mes en blanco', texto: 'Aún no hay puntos este mes.' },
  temporada: { titulo: 'Sin temporada activa', texto: 'Cuando empiece una, aparecerá aquí.' },
  amigos: {
    titulo: 'El rellano está muy tranquilo',
    texto: 'Añade vecinos y compara resultados.',
    cta: { href: '/amigos', label: 'Añadir vecinos' },
  },
  comunidad: {
    titulo: 'No estás en ninguna comunidad',
    texto: 'Las comunidades son grupos pequeños: familia, amigos, oficina.',
    cta: { href: '/amigos', label: 'Ver vecinos' },
  },
};

const MEDALLAS = ['🥇', '🥈', '🥉'];

/**
 * La cara de una fila. Si esa persona se ha hecho un vecino, sale su vecino; si no, el
 * avatar de arquetipo de siempre. En un mismo listado conviven los dos sin que chirríe.
 */
function CaraDe({
  fila,
  tamano,
  marco = 'ninguno',
}: {
  fila: FilaRanking;
  tamano: number;
  marco?: 'ninguno' | 'oro';
}) {
  if (fila.vecino) {
    return (
      <Vecino
        config={marco === 'oro' ? { ...fila.vecino, marco: 'oro' } : fila.vecino}
        tamano={tamano}
        titulo={`Vecino de ${fila.username}`}
      />
    );
  }
  return (
    <NeighbourAvatar
      arquetipo={comoArquetipo(fila.arquetipo)}
      color={comoColor(fila.colorAvatar)}
      marco={marco}
      tamano={tamano}
    />
  );
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ tramo?: string }>;
}) {
  const filtros = await searchParams;
  const tramo: Tramo = TRAMOS.includes(filtros.tramo as Tramo)
    ? (filtros.tramo as Tramo)
    : 'global';

  const tuId = await idUsuarioActual();
  const tabla = await clasificacion(tramo, tuId);

  const podio = tabla.filas.slice(0, 3);
  const resto = tabla.filas.slice(3);
  const vacio = VACIOS[tramo];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-28">
      <ApartmentPlaque
        vivienda="Ascensor"
        titulo="Clasificación de la comunidad"
        subtitulo="Quién manda en el portal."
      />

      {/* Pestañas. Enlaces de verdad: funcionan sin JavaScript y se pueden compartir. */}
      <nav className="mt-5 flex flex-wrap gap-1" aria-label="Tramos de la clasificación">
        {TRAMOS.map((candidato) => (
          <Link
            key={candidato}
            href={candidato === 'global' ? '/ranking' : `/ranking?tramo=${candidato}`}
            className={tramo === candidato ? 'chip chip-activo' : 'chip'}
            aria-current={tramo === candidato ? 'page' : undefined}
          >
            {ETIQUETAS[candidato]}
          </Link>
        ))}
      </nav>

      {tabla.filas.length === 0 ? (
        <div className="papel mt-6 p-8 text-center">
          <p className="texto-cartel text-2xl">{vacio.titulo}</p>
          <p className="mt-2 text-tinta-suave">{vacio.texto}</p>
          {vacio.cta ? (
            <p className="mt-4">
              <LinkButton href={vacio.cta.href} tone="rojo">
                {vacio.cta.label}
              </LinkButton>
            </p>
          ) : null}
        </div>
      ) : (
        <>
          {/* PODIO. En escritorio y TV se ve como un podio; en móvil se apila y sigue
              leyéndose igual de bien. */}
          {podio.length > 0 ? (
            <section className="mt-6" aria-label="Podio">
              <ol className="grid gap-3 sm:grid-cols-3 sm:items-end">
                {[podio[1], podio[0], podio[2]].map((fila, columna) =>
                  fila ? (
                    <li
                      key={fila.userId}
                      className={`papel flex flex-col items-center p-4 text-center ${
                        columna === 1 ? 'sm:pb-8 sm:pt-10' : 'sm:pt-6'
                      } ${fila.esTu ? 'ring-4 ring-verde-portal' : ''}`}
                    >
                      <span aria-hidden className="text-4xl">
                        {MEDALLAS[fila.posicion - 1]}
                      </span>
                      <CaraDe
                        fila={fila}
                        marco={fila.posicion === 1 ? 'oro' : 'ninguno'}
                        tamano={columna === 1 ? 88 : 64}
                      />
                      <Link href={`/u/${fila.username}`} className="texto-cartel mt-2 underline">
                        {fila.username}
                      </Link>
                      <span className="marcador text-2xl text-verde-portal">{fila.puntos}</span>
                      <span className="texto-sello text-tinta-tenue">{fila.rangoLabel}</span>
                    </li>
                  ) : null,
                )}
              </ol>
            </section>
          ) : null}

          {/* Resto de la tabla. */}
          {resto.length > 0 ? (
            <section className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[34rem] border-collapse text-sm">
                <caption className="sr-only">
                  Clasificación {ETIQUETAS[tramo].toLowerCase()}
                </caption>
                <thead>
                  <tr className="texto-sello text-left text-tinta-tenue">
                    <th scope="col" className="p-2">#</th>
                    <th scope="col" className="p-2">Vecino</th>
                    <th scope="col" className="p-2 text-right">Puntos</th>
                    <th scope="col" className="p-2 text-right">Nivel</th>
                    <th scope="col" className="p-2 text-right">Precisión</th>
                    <th scope="col" className="p-2 text-right">Partidas</th>
                  </tr>
                </thead>
                <tbody>
                  {resto.map((fila) => (
                    <tr
                      key={fila.userId}
                      className={`border-t border-linea ${fila.esTu ? 'bg-mostaza-claro/40' : ''}`}
                    >
                      <td className="marcador p-2 text-tinta-tenue">{fila.posicion}</td>
                      <td className="p-2">
                        <span className="flex items-center gap-2">
                          <CaraDe fila={fila} tamano={28} />
                          <Link href={`/u/${fila.username}`} className="underline">
                            {fila.username}
                          </Link>
                          {fila.racha >= 3 ? (
                            <span className="texto-sello">🔥 {fila.racha}</span>
                          ) : null}
                        </span>
                      </td>
                      <td className="marcador p-2 text-right text-verde-portal">{fila.puntos}</td>
                      <td className="p-2 text-right">{fila.nivel}</td>
                      <td className="p-2 text-right">{fila.precision} %</td>
                      <td className="p-2 text-right">{fila.partidas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </>
      )}

      <PaperNotice tono="papel" className="mt-8 p-4">
        <p className="texto-sello">Cómo se cuentan los puntos</p>
        <p className="mt-1 max-w-prose text-sm text-tinta-suave">
          Los puntos de vecindad salen de partidas que cuentan: mínimo de preguntas, duración
          razonable y rendimientos decrecientes a partir de la tercera del día. Repetir partidas
          cortas no sube a nadie. Al lado se enseñan nivel, precisión y partidas por separado, sin
          mezclarlo todo en una cifra que no se pueda discutir.
        </p>
      </PaperNotice>

      <p className="mt-6 flex flex-wrap gap-2">
        <LinkButton href="/jugar/solo" tone="rojo">
          Jugar y subir
        </LinkButton>
        <LinkButton href="/" tone="fantasma" size="sm">
          ← Volver al portal
        </LinkButton>
      </p>

      {/* TU POSICIÓN, siempre visible. Aunque vayas el 4.253. */}
      {tabla.tuya ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-tinta bg-papel/95 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2">
            <span className="marcador text-xl text-tinta-tenue">#{tabla.tuya.posicion}</span>
            <CaraDe fila={tabla.tuya} tamano={32} />
            <span className="flex-1 truncate">
              Tú
              {tabla.tuya.racha >= 3 ? (
                <Chip className="ml-2">🔥 {tabla.tuya.racha}</Chip>
              ) : null}
            </span>
            <span className="marcador text-xl text-verde-portal">{tabla.tuya.puntos}</span>
          </div>
        </div>
      ) : tuId ? null : (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-tinta bg-papel/95 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2 text-sm">
            <span className="flex-1">Guarda tu progreso para aparecer aquí.</span>
            <LinkButton href="/entrar" tone="rojo" size="sm">
              Guardar mi vecino
            </LinkButton>
          </div>
        </div>
      )}
    </div>
  );
}
