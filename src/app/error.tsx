'use client';

import { LinkButton } from '@/components/ui/Button';
import { ApartmentPlaque, PaperNotice } from '@/components/portal/Estructuras';

/**
 * ERROR 500 — «junta suspendida».
 *
 * El chiste no tapa la información: se dice claramente que ha fallado el servidor, se
 * ofrece reintentar y, si el entorno lo expone, se muestra el identificador del error.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-14 text-center">
      <ApartmentPlaque
        vivienda="Aviso urgente"
        titulo="Junta suspendida"
        subtitulo="Ha fallado algo en el servidor"
        tono="roja"
      />

      <PaperNotice tono="papel" className="mt-4 p-4 text-left">
        <p className="text-sm text-tinta-suave">
          No hemos podido cargar esta página. Puedes intentarlo otra vez; si sigue pasando, vuelve
          al portal y entra de nuevo.
        </p>
        {error.digest ? (
          <p className="texto-sello mt-2 text-tinta-tenue">Referencia del acta: {error.digest}</p>
        ) : null}
      </PaperNotice>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button type="button" className="btn btn-verde" onClick={reset}>
          Reintentar
        </button>
        <LinkButton href="/" tone="papel">
          Volver al portal
        </LinkButton>
      </div>
    </div>
  );
}
