/**
 * LA CARA DE UN PERSONAJE — un componente, no cuatro.
 *
 * Había `NeighbourAvatar`, `Vecino`, `Retrato`, `RetratoReal` y `Foto`, y cada pantalla
 * elegía a mano con lógica propia; la clasificación llegó a inventarse su propio `CaraDe`
 * local porque ninguno servía. Ahora la decisión la toma `caraDePersonaje()` en el servidor
 * y esto solo pinta lo que le dan.
 *
 * El marco común es deliberado: las fotos vienen de sitios distintos —posados de estudio,
 * fotogramas de escena, un dibujo para quien no tiene foto— y sin un tratamiento que las
 * iguale la rejilla se lee como una carpeta y no como un reparto. La unidad la da el marco,
 * no la foto.
 */

import type { FuenteCara } from '@/server/media/caras';

import { Retrato } from './Retrato';

type Props = {
  fuente: FuenteCara;
  tamano?: number;
  /** Anchura real a la que se va a pintar, para que el navegador elija la variante. */
  sizes?: string;
  /** Placa con el piso, como en las puertas del portal. */
  placa?: string;
  className?: string;
  /** Prioridad de carga: solo para lo que se ve sin bajar. */
  prioritaria?: boolean;
};

export function Cara({
  fuente,
  tamano = 96,
  sizes,
  placa,
  className = '',
  prioritaria = false,
}: Props) {
  const marco = (
    <div
      className={`relative overflow-hidden border-2 border-tinta bg-gotele ${className}`}
      style={{ width: tamano, height: tamano, flexShrink: 0 }}
    >
      {fuente.tipo === 'foto' ? (
        <img
          src={fuente.src}
          srcSet={fuente.srcSet}
          sizes={sizes ?? `${tamano}px`}
          alt={fuente.alt}
          width={tamano}
          height={tamano}
          loading={prioritaria ? 'eager' : 'lazy'}
          decoding="async"
          {...(prioritaria ? { fetchPriority: 'high' as const } : {})}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-end justify-center">
          <Retrato nombre={fuente.nombre} paleta={fuente.paleta} tamano={tamano} />
        </div>
      )}

      {/* El viñeteado suave iguala fotos con fondos muy distintos sin tocarlas. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: 'inset 0 -18px 26px -18px rgba(35,32,27,.45)' }}
      />

      {placa ? (
        <span className="texto-sello absolute bottom-0 left-0 right-0 bg-tinta/80 px-1 py-0.5 text-center text-[0.55rem] text-papel">
          {placa}
        </span>
      ) : null}
    </div>
  );

  return marco;
}

/**
 * Los créditos de una pantalla, agrupados al pie.
 *
 * Repetir la línea de atribución bajo cada una de veintiséis caras es ilegible, y la licencia
 * pide una atribución razonable para el medio, no una atribución imposible de leer. Una
 * sección al pie de la misma página lo es. Lo que no vale es no ponerla.
 */
export function CreditosDeCaras({
  creditos,
}: {
  creditos: readonly { texto: string; origen: string | null }[];
}) {
  return (
    <section className="mt-8 border-t border-linea pt-4">
      {creditos.length > 0 ? (
        <>
          <h2 className="texto-sello text-tinta-tenue">Créditos de las fotografías</h2>
          <ul className="mt-2 space-y-0.5">
            {creditos.map((credito) => (
              <li key={credito.texto} className="text-[0.65rem] leading-snug text-tinta-tenue">
                {credito.origen ? (
                  <a
                    href={credito.origen}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="underline"
                  >
                    {credito.texto}
                  </a>
                ) : (
                  credito.texto
                )}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <p className="mt-2 max-w-prose text-[0.65rem] text-tinta-tenue">
        Juego de aficionados sin relación con Atresmedia ni con la productora. Los personajes,
        los nombres y las imágenes de <em>Aquí no hay quien viva</em> pertenecen a sus
        titulares.
      </p>
    </section>
  );
}
