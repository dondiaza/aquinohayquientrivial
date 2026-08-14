import type { Metadata } from 'next';
import Link from 'next/link';

import { LinkButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Surfaces';
import { ApartmentPlaque, PaperNotice } from '@/components/portal/Estructuras';
import { CATEGORIAS_TARJETA, TARJETAS } from '@/content/anhqv/catalogos';
import { TARJETAS_PAGE } from '@/domain/copy/ui';

export const metadata: Metadata = {
  title: 'Tarjetas del portal',
  description:
    'Las 174 tarjetas de curiosidades del pack de Aquí no hay quien viva: un dato por tarjeta, con su explicación.',
};

const TONOS = ['papel', 'mostaza', 'azul'] as const;

export default async function TarjetasPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const filtros = await searchParams;
  const categoria =
    filtros.categoria && CATEGORIAS_TARJETA.includes(filtros.categoria) ? filtros.categoria : null;

  const lista = categoria
    ? TARJETAS.filter((tarjeta) => tarjeta.categoria === categoria)
    : TARJETAS;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ApartmentPlaque
        vivienda="Tablón de la comunidad"
        titulo={TARJETAS_PAGE.title}
        subtitulo={TARJETAS_PAGE.subtitle}
      />

      <div className="mt-6 flex flex-wrap items-center gap-1">
        <span className="texto-sello mr-1 text-tinta-tenue">Categoría:</span>
        <Link href="/tarjetas" className={categoria ? 'chip' : 'chip chip-activo'}>
          todas ({TARJETAS.length})
        </Link>
        {CATEGORIAS_TARJETA.map((candidata) => (
          <Link
            key={candidata}
            href={`/tarjetas?categoria=${encodeURIComponent(candidata)}`}
            className={categoria === candidata ? 'chip chip-activo' : 'chip'}
          >
            {candidata} ({TARJETAS.filter((t) => t.categoria === candidata).length})
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((tarjeta, indice) => {
          const tono = TONOS[indice % TONOS.length] ?? 'papel';
          return (
            <article
              key={tarjeta.id}
              className={`papel p-4 ${tono === 'mostaza' ? 'bg-mostaza-claro/40' : tono === 'azul' ? 'bg-azul-claro/15' : ''}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="texto-sello text-tinta-tenue">{tarjeta.categoria}</p>
                <span className="texto-sello text-tinta-tenue">{tarjeta.id}</span>
              </div>

              <p className="mt-2 text-sm text-tinta-suave">{tarjeta.anverso}</p>
              <p
                className="mt-1 text-lg leading-tight"
                style={{ fontFamily: 'var(--font-cuerpo)', fontWeight: 600 }}
              >
                {tarjeta.reverso}
              </p>

              <p className="mt-2 text-xs text-tinta-suave">{tarjeta.nota}</p>

              <p className="mt-3 flex flex-wrap gap-1">
                <Chip title={`Dificultad ${tarjeta.dificultad} de 5`}>
                  {'●'.repeat(tarjeta.dificultad)}
                  {'○'.repeat(Math.max(0, 5 - tarjeta.dificultad))}
                </Chip>
                {tarjeta.etiquetas.slice(0, 3).map((etiqueta) => (
                  <Chip key={etiqueta}>{etiqueta}</Chip>
                ))}
              </p>
            </article>
          );
        })}
      </div>

      <PaperNotice tono="papel" className="mt-8 p-4">
        <p className="texto-sello">De dónde salen</p>
        <p className="mt-1 max-w-prose text-sm text-tinta-suave">
          Son los microcontenidos del pack editorial. Se usan en dos sitios: aquí, para repasar, y
          entre rondas de una partida, en las cartelas que se ven mientras se prepara la siguiente
          pregunta. Los datos delicados de producción y audiencias conservan su nota de fuente para
          revisión editorial.
        </p>
      </PaperNotice>

      <p className="mt-6 flex flex-wrap gap-2">
        <LinkButton href="/jugar/solo" tone="rojo">
          Jugar una partida
        </LinkButton>
        <LinkButton href="/portal" tone="papel" size="sm">
          El portal y sus vecinos
        </LinkButton>
        <LinkButton href="/" tone="fantasma" size="sm">
          ← Volver al portal
        </LinkButton>
      </p>
    </div>
  );
}
