/**
 * HUECO DE IMAGEN — la imagen con licencia si existe, el arte propio si no.
 *
 * Componente de SERVIDOR: consulta `src/content/imagenes.ts`, que mira qué hay en
 * `public/serie/`. No lleva JavaScript al cliente ni pide ficheros que no existen (nada
 * de imágenes rotas ni de 404 en la consola).
 *
 *   <Foto hueco="vecinos/juan-cuesta" alt="Juan Cuesta" proporcion="retrato">
 *     <Retrato nombre="Juan Cuesta" paleta="verde" />
 *   </Foto>
 *
 * `children` es el respaldo y es lo que se ve en el despliegue por defecto.
 */

import type { ReactNode } from 'react';

import { imagenDe } from '@/content/imagenes';

const PROPORCIONES = {
  retrato: 'aspect-[3/4]',
  cuadrada: 'aspect-square',
  escena: 'aspect-[16/9]',
  libre: '',
} as const;

export function Foto({
  hueco,
  alt,
  proporcion = 'libre',
  className = '',
  children,
}: {
  hueco: string;
  alt: string;
  proporcion?: keyof typeof PROPORCIONES;
  className?: string;
  children: ReactNode;
}) {
  const src = imagenDe(hueco);
  const marco = `${PROPORCIONES[proporcion]} ${className}`.trim();

  if (!src) {
    return (
      <div className={`${marco} flex items-end justify-center overflow-hidden`}>{children}</div>
    );
  }

  return (
    <div className={`${marco} overflow-hidden`}>
      {/* <img> a propósito: los ficheros los pone quien tiene la licencia, con el tamaño
          que quiera, y así la web no depende del optimizador de imágenes. */}
      <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
    </div>
  );
}
