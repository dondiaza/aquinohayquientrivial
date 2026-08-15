/**
 * RETRATO FOTOGRÁFICO DEL INTÉRPRETE, CON SU CRÉDITO.
 *
 * Cuando existe una fotografía real con licencia libre verificada, se pinta esa. Cuando no,
 * el que llama decide qué dibuja en su lugar (`children`), que normalmente es el retrato
 * original de siempre.
 *
 * ## El crédito no es decoración
 *
 * Casi todas estas fotos son CC BY o CC BY-SA: son **gratis citando**, no gratis. La cita
 * tiene que estar donde está la foto y ser legible, no escondida en un pie de página que
 * nadie abre. Por eso el crédito lo pinta este mismo componente y sale del propio asset: no
 * hay forma de poner la foto y olvidarse de la atribución, porque son la misma llamada.
 *
 * ## Por qué no se usa next/image
 *
 * Las imágenes ya vienen recortadas y convertidas a WebP en dos tamaños por
 * `scripts/optimizar-medios.mjs`. Pasarlas otra vez por el optimizador en tiempo de ejecución
 * gastaría cuota de transformación para rehacer un trabajo ya hecho.
 */

import type { ReactNode } from 'react';

import type { MediaAsset } from '@/domain/media/tipos';
import { requiereAtribucion } from '@/domain/media/tipos';

export function RetratoReal({
  asset,
  tamano = 160,
  mini = false,
  className = '',
  conCredito = true,
  children,
}: {
  asset: MediaAsset | null;
  tamano?: number;
  /** Usa la versión de 160 px. Para listas y marcadores. */
  mini?: boolean;
  className?: string;
  /** Solo se puede quitar si el crédito se pinta agrupado en otro sitio de la MISMA pantalla. */
  conCredito?: boolean;
  children?: ReactNode;
}) {
  const ruta = mini ? (asset?.miniPath ?? asset?.localPath) : asset?.localPath;
  if (!asset || !ruta) return <>{children}</>;

  const alt = asset.interprete
    ? `${asset.interprete}, intérprete de ${asset.characters?.[0] ?? 'la serie'}`
    : asset.title;

  return (
    <figure className={`m-0 ${className}`}>
      <img
        src={ruta}
        alt={alt}
        width={tamano}
        height={tamano}
        loading="lazy"
        decoding="async"
        className="block rounded-md border-2 border-tinta object-cover"
        style={{ width: tamano, height: tamano }}
      />
      {conCredito && requiereAtribucion(asset) && asset.attribution ? (
        <figcaption className="texto-sello mt-1 max-w-[16rem] text-[0.55rem] leading-tight text-tinta-tenue">
          {asset.sourcePage ? (
            <a href={asset.sourcePage} target="_blank" rel="noreferrer noopener" className="underline">
              {asset.attribution}
            </a>
          ) : (
            asset.attribution
          )}
        </figcaption>
      ) : null}
    </figure>
  );
}

/**
 * Los créditos de una pantalla entera, agrupados.
 *
 * Para listas largas —el catálogo de 27 vecinos— repetir la línea de crédito bajo cada cara
 * es ilegible. La licencia obliga a que la atribución sea razonable para el medio, y una
 * sección de créditos al pie de la misma página lo es. Lo que NO vale es no ponerla.
 */
export function CreditosDeMedios({ assets }: { assets: readonly MediaAsset[] }) {
  const conCredito = assets.filter((asset) => requiereAtribucion(asset) && asset.attribution);
  if (conCredito.length === 0) return null;

  return (
    <section className="mt-8 border-t border-linea pt-4">
      <h2 className="texto-sello text-tinta-tenue">Créditos de las fotografías</h2>
      <ul className="mt-2 space-y-0.5">
        {conCredito.map((asset) => (
          <li key={asset.id} className="text-[0.65rem] leading-snug text-tinta-tenue">
            {asset.interprete ? <strong>{asset.interprete}</strong> : null}
            {asset.interprete ? ' — ' : null}
            {asset.sourcePage ? (
              <a
                href={asset.sourcePage}
                target="_blank"
                rel="noreferrer noopener"
                className="underline"
              >
                {asset.attribution}
              </a>
            ) : (
              asset.attribution
            )}
          </li>
        ))}
      </ul>
      <p className="mt-2 max-w-prose text-[0.65rem] text-tinta-tenue">
        Fotografías de los intérpretes en actos públicos, obtenidas de Wikimedia Commons bajo
        licencias que permiten su reutilización con atribución. No son fotogramas de la serie.
        Este es un juego de aficionados sin relación con Atresmedia ni con la productora.
      </p>
    </section>
  );
}
