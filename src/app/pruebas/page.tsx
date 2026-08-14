import type { Metadata } from 'next';
import Link from 'next/link';

import { LinkButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Surfaces';
import { ApartmentPlaque, PaperNotice } from '@/components/portal/Estructuras';
import {
  FAMILIAS_MODO,
  FAMILIAS_PRUEBA,
  MODOS,
  PRUEBAS,
  RESUMEN_PACK,
  type Prueba,
} from '@/content/anhqv/catalogos';
import { PRUEBAS_PAGE } from '@/domain/copy/ui';
import { QUESTION_TYPE_LIST } from '@/domain/questions/registry';
import { ROUND_FAMILIES } from '@/domain/rounds/formats';

export const metadata: Metadata = {
  title: 'Pruebas y modos',
  description:
    'Las 260 pruebas y los 48 modos de juego del pack editorial de Aquí no hay quien viva, con sus reglas y su puntuación.',
};

/**
 * Qué familia del pack ya se juega y con qué ronda del motor. Es la traducción honesta
 * entre el catálogo editorial (que describe mucho más de lo que hay implementado) y lo
 * que se puede pulsar hoy: así se ve de un vistazo qué falta por construir.
 */
const JUGABLES: Record<string, string> = {
  adivinanza: '¿Quién vive aquí?',
  pistas: '¿Quién vive aquí?',
  deduccion: 'Doble pista',
  intruso: 'El infiltrado',
  clasificacion: 'El infiltrado',
  memoria: 'Memoria del portal',
  cronologia: 'Ordena el desastre',
  velocidad: 'Llamada al telefonillo',
  apuesta: 'La derrama',
  votacion: 'La junta',
  debate: 'La junta',
  quiz: 'Calentando la junta',
  reparto: 'Ficha relámpago',
  parejas: 'Empareja',
  cadena: 'Cadena vecinal',
  frases: 'Calentando la junta',
  rumor_dato: 'Radio Patio',
  archivo: 'Ficha del vecino',
  precision: 'Ficha del vecino',
  mapa: 'Escena del portal',
};

function FichaPrueba({ prueba }: { prueba: Prueba }) {
  const ronda = JUGABLES[prueba.familia];
  return (
    <article className="papel p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="texto-cartel text-base leading-tight">{prueba.nombre}</h3>
        <span className="texto-sello text-tinta-tenue">{prueba.id}</span>
      </div>
      <p className="mt-1 text-sm text-tinta-suave">{prueba.instruccion}</p>
      <p className="mt-2 text-xs text-tinta-tenue">
        <span className="texto-sello">Puntúa: </span>
        {prueba.puntuacion}
      </p>
      <p className="mt-2 flex flex-wrap gap-1">
        <Chip>{prueba.nivel}</Chip>
        <Chip>{prueba.familia}</Chip>
        {prueba.jugadores ? <Chip>{prueba.jugadores} jugadores</Chip> : null}
        {prueba.minutos ? <Chip>{prueba.minutos} min</Chip> : null}
      </p>
      {ronda ? (
        <p className="mt-2 text-xs">
          <Link href="/jugar/solo" className="underline">
            Ya se juega como «{ronda}»
          </Link>
        </p>
      ) : (
        <p className="texto-sello mt-2 text-tinta-tenue">Del catálogo · aún no implementada</p>
      )}
    </article>
  );
}

export default async function PruebasPage({
  searchParams,
}: {
  searchParams: Promise<{ familia?: string; nivel?: string }>;
}) {
  const filtros = await searchParams;
  const familia = filtros.familia && FAMILIAS_PRUEBA.includes(filtros.familia) ? filtros.familia : null;
  const nivel = filtros.nivel ?? null;

  const lista = PRUEBAS.filter(
    (prueba) => (!familia || prueba.familia === familia) && (!nivel || prueba.nivel === nivel),
  );

  const niveles = [...new Set(PRUEBAS.map((prueba) => prueba.nivel))];
  const enlace = (nuevos: { familia?: string | null; nivel?: string | null }): string => {
    const parametros = new URLSearchParams();
    const f = nuevos.familia === undefined ? familia : nuevos.familia;
    const n = nuevos.nivel === undefined ? nivel : nuevos.nivel;
    if (f) parametros.set('familia', f);
    if (n) parametros.set('nivel', n);
    const cadena = parametros.toString();
    return cadena ? `/pruebas?${cadena}` : '/pruebas';
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ApartmentPlaque
        vivienda="Cuarto de contadores"
        titulo={PRUEBAS_PAGE.title}
        subtitulo={PRUEBAS_PAGE.subtitle}
      />

      <PaperNotice tono="mostaza" className="mt-4 p-3">
        <p className="texto-sello">Lo que hay y lo que se juega</p>
        <p className="mt-1 max-w-prose text-sm text-tinta-suave">
          El pack trae {RESUMEN_PACK.pruebas} pruebas y {RESUMEN_PACK.modos} modos: es un catálogo
          editorial, más grande que lo implementado. El motor juega hoy{' '}
          {QUESTION_TYPE_LIST.length} familias de pregunta repartidas en {ROUND_FAMILIES.length}{' '}
          tipos de ronda, y cada prueba de aquí dice si ya tiene su ronda o si sigue en la lista.
        </p>
      </PaperNotice>

      {/* ── Filtros ────────────────────────────────────────────────────────── */}
      <div className="mt-6 space-y-2">
        <div className="flex flex-wrap items-center gap-1">
          <span className="texto-sello mr-1 text-tinta-tenue">Familia:</span>
          <Link href={enlace({ familia: null })} className={familia ? 'chip' : 'chip chip-activo'}>
            todas
          </Link>
          {FAMILIAS_PRUEBA.map((candidata) => (
            <Link
              key={candidata}
              href={enlace({ familia: candidata })}
              className={familia === candidata ? 'chip chip-activo' : 'chip'}
            >
              {candidata}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="texto-sello mr-1 text-tinta-tenue">Nivel:</span>
          <Link href={enlace({ nivel: null })} className={nivel ? 'chip' : 'chip chip-activo'}>
            todos
          </Link>
          {niveles.map((candidato) => (
            <Link
              key={candidato}
              href={enlace({ nivel: candidato })}
              className={nivel === candidato ? 'chip chip-activo' : 'chip'}
            >
              {candidato}
            </Link>
          ))}
        </div>
      </div>

      <p className="texto-sello mt-4 text-tinta-tenue">
        {lista.length} de {PRUEBAS.length} pruebas
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((prueba) => (
          <FichaPrueba key={prueba.id} prueba={prueba} />
        ))}
      </div>

      {/* ── Modos de juego ─────────────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="text-xl sm:text-2xl">Modos de juego</h2>
        <p className="texto-sello text-tinta-tenue">
          {MODOS.length} modos del pack, agrupados por lo que son
        </p>

        <div className="mt-3 space-y-6">
          {FAMILIAS_MODO.map((familiaModo) => (
            <div key={familiaModo}>
              <h3 className="texto-cartel text-base">{familiaModo}</h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {MODOS.filter((modo) => modo.familia === familiaModo).map((modo) => (
                  <article key={modo.id} className="papel p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className="texto-cartel text-sm leading-tight">{modo.nombre}</h4>
                      <span className="texto-sello text-tinta-tenue">{modo.id}</span>
                    </div>
                    <p className="mt-1 text-sm text-tinta-suave">{modo.descripcion}</p>
                    <p className="mt-2 flex flex-wrap gap-1">
                      <Chip>{modo.jugadores}</Chip>
                      <Chip>{modo.minutos} min</Chip>
                      {modo.usa.map((uso) => (
                        <Chip key={uso}>{uso}</Chip>
                      ))}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-8 flex flex-wrap gap-2">
        <LinkButton href="/jugar/solo" tone="rojo">
          Jugar una partida
        </LinkButton>
        <LinkButton href="/como-jugar" tone="papel" size="sm">
          Reglas del juego
        </LinkButton>
        <LinkButton href="/" tone="fantasma" size="sm">
          ← Volver al portal
        </LinkButton>
      </p>
    </div>
  );
}
