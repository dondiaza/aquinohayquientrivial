import type { Metadata } from 'next';

import { LinkButton } from '@/components/ui/Button';
import { Chip, Sello } from '@/components/ui/Surfaces';
import { ApartmentPlaque, PaperNotice } from '@/components/portal/Estructuras';
import { Foto } from '@/components/serie/Foto';
import { Retrato } from '@/components/serie/Retrato';
import {
  PERSONAJES,
  RELACIONES,
  SERIE,
  TEMPORADAS,
  ZONAS,
  personajesDeZona,
} from '@/content/serie';
import { imagenDe, huecoDeVecino, huecoDeZona, resumenDeImagenes } from '@/content/imagenes';
import { PORTAL_PAGE } from '@/domain/copy/ui';

export const metadata: Metadata = {
  title: 'El portal',
  description:
    'Quién vive en cada piso de Desengaño 21, el reparto de Aquí no hay quien viva y los hitos de las cinco temporadas.',
};

/** Los vecinos que no tienen zona con placa propia salen igual, al final. */
function vecinosSinZona() {
  const conZona = new Set(ZONAS.flatMap((zona) => personajesDeZona(zona.etiqueta).map((v) => v.nombre)));
  return PERSONAJES.filter((personaje) => !conZona.has(personaje.nombre));
}

function FichaVecino({
  personaje,
}: {
  personaje: (typeof PERSONAJES)[number];
}) {
  return (
    <article className="papel flex gap-3 p-3">
      <Foto
        hueco={huecoDeVecino(personaje.nombre)}
        alt={`${personaje.nombre}, personaje de Aquí no hay quien viva`}
        proporcion="retrato"
        className="w-20 shrink-0 border-2 border-tinta bg-gotele"
      >
        <Retrato nombre={personaje.nombre} paleta={personaje.paleta} tamano={80} />
      </Foto>

      <div className="min-w-0">
        <h3 className="texto-cartel text-base leading-tight">{personaje.nombre}</h3>
        <p className="texto-sello text-tinta-tenue">{personaje.interprete}</p>
        <p className="mt-1 text-sm text-tinta-suave">{personaje.rol}</p>
        <p className="mt-2 flex flex-wrap gap-1">
          <Chip>{personaje.zona}</Chip>
          {personaje.rasgos.slice(0, 2).map((rasgo) => (
            <Chip key={rasgo}>{rasgo}</Chip>
          ))}
        </p>
        {personaje.relaciones.length > 0 ? (
          <p className="mt-1 text-xs text-tinta-tenue">
            Con: {personaje.relaciones.join(' · ')}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export default function PortalPage() {
  const imagenes = resumenDeImagenes();
  const sinZona = vecinosSinZona();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ApartmentPlaque
        vivienda={`${SERIE.direccionFicticia} · ${SERIE.ciudad}`}
        titulo={PORTAL_PAGE.title}
        subtitulo={PORTAL_PAGE.subtitle}
      />

      <p className="mt-4 max-w-prose text-sm text-tinta-suave">
        {SERIE.titulo} se emitió en {SERIE.cadena} entre el {SERIE.estreno} y el {SERIE.final}:{' '}
        {SERIE.temporadas} temporadas de un edificio del que nadie consigue mudarse del todo. Esta
        es la planta por planta.
      </p>

      {/* ── El edificio, planta por planta ─────────────────────────────────── */}
      <section className="mt-8 space-y-6">
        {[...ZONAS].reverse().map((zona) => {
          const vecinos = personajesDeZona(zona.etiqueta);
          return (
            <div key={zona.id}>
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-xl sm:text-2xl">
                  <span aria-hidden className="mr-1">
                    {zona.icono}
                  </span>
                  {zona.etiqueta}
                </h2>
                <p className="texto-sello text-tinta-tenue">{zona.habitantes}</p>
              </div>
              <p className="mt-1 max-w-prose text-sm text-tinta-suave">{zona.idea}</p>

              {/* La zona solo lleva imagen si alguien ha puesto una con licencia. */}
              {imagenDe(huecoDeZona(zona.etiqueta)) ? (
                <Foto
                  hueco={huecoDeZona(zona.etiqueta)}
                  alt={`${zona.etiqueta} de Desengaño 21`}
                  proporcion="escena"
                  className="mt-3 border-2 border-tinta"
                >
                  <span />
                </Foto>
              ) : null}

              {vecinos.length > 0 ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {vecinos.map((personaje) => (
                    <FichaVecino key={personaje.nombre} personaje={personaje} />
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-tinta-tenue">
                  Cambia de manos según la temporada.
                </p>
              )}
            </div>
          );
        })}

        {sinZona.length > 0 ? (
          <div>
            <h2 className="text-xl sm:text-2xl">Van y vienen</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sinZona.map((personaje) => (
                <FichaVecino key={personaje.nombre} personaje={personaje} />
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* ── Temporadas ─────────────────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="text-xl sm:text-2xl">Las cinco temporadas</h2>
        <p className="texto-sello text-tinta-tenue">
          La quinta lleva sello de destripe: con el modo sin spoilers activado no sale
        </p>

        <ol className="mt-3 grid gap-3 sm:grid-cols-2">
          {TEMPORADAS.map((temporada) => (
            <li key={temporada.numero} className="papel p-4">
              <p className="texto-sello text-tinta-tenue">Temporada {temporada.numero}</p>
              <h3 className="texto-cartel text-lg">{temporada.titulo}</h3>
              <p className="mt-1 text-sm text-tinta-suave">{temporada.resumen}</p>
              {temporada.spoiler === 'major' ? (
                <p className="mt-2">
                  <Sello>Destripe grave</Sello>
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      {/* ── Relaciones ─────────────────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="text-xl sm:text-2xl">Quién con quién</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {RELACIONES.map((relacion) => (
            <li key={`${relacion.a}-${relacion.b}`} className="papel px-3 py-2 text-sm">
              <span className="texto-cartel text-sm">
                {relacion.a} ↔ {relacion.b}
              </span>
              <span className="block text-xs text-tinta-suave">{relacion.vinculo}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Nota de imágenes ───────────────────────────────────────────────── */}
      <PaperNotice tono="papel" className="mt-10 p-4">
        <p className="texto-sello">Los retratos son dibujos, no fotos</p>
        <p className="mt-1 max-w-prose text-sm text-tinta-suave">
          Los fotogramas y promocionales de la serie son de {SERIE.cadena} y de la productora, así
          que no se empaquetan aquí. Cada retrato y cada placa es arte original del proyecto, y no
          busca el parecido: lo que identifica a cada vecino es su piso, su color y su ficha. Si
          alguien tiene la licencia, hay un hueco preparado para cada personaje y cada zona
          (instrucciones en <code>public/serie/LEEME.md</code>).
        </p>
        <p className="texto-sello mt-2 text-tinta-tenue">
          {imagenes.ficheros === 0
            ? 'Ahora mismo: 0 imágenes con licencia · todo dibujado'
            : `Ahora mismo: ${imagenes.ficheros} imágenes con licencia (${imagenes.vecinos} vecinos, ${imagenes.zonas} zonas)`}
        </p>
      </PaperNotice>

      <p className="mt-6 flex flex-wrap gap-2">
        <LinkButton href="/jugar/solo" tone="rojo">
          Jugar una partida
        </LinkButton>
        <LinkButton href="/tarjetas" tone="papel" size="sm">
          Tarjetas del portal
        </LinkButton>
        <LinkButton href="/" tone="fantasma" size="sm">
          ← Volver al portal
        </LinkButton>
      </p>
    </div>
  );
}
