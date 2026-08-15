import type { Metadata } from 'next';

import { LinkButton } from '@/components/ui/Button';
import { ApartmentPlaque, PaperNotice } from '@/components/portal/Estructuras';
import { CrearSala } from '@/components/sala/CrearSala';

export const metadata: Metadata = {
  title: 'Abrir una sala',
  description: 'Crea una junta de vecinos para jugar con la tele y los móviles.',
};

/**
 * Pantalla de creación. Va aparte de la sala en sí para que el host pueda prepararla en el
 * portátil con calma antes de enchufarlo a la tele.
 */
export default function AbrirSalaPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <ApartmentPlaque
        vivienda="Portería"
        titulo="Abrir una junta"
        subtitulo="Una pantalla grande, los móviles de mando y a jugar."
      />

      <PaperNotice tono="mostaza" className="mt-4 p-3">
        <p className="texto-sello">Cómo funciona</p>
        <p className="mt-1 text-sm text-tinta-suave">
          Esta pantalla va en la tele o el proyector: enseña el código y un QR. Los demás lo
          escanean con el móvil, escriben su nombre y ya están dentro. Sin instalar nada y sin
          registrarse.
        </p>
      </PaperNotice>

      <div className="mt-6">
        <CrearSala />
      </div>

      <p className="mt-8 flex flex-wrap gap-2">
        <LinkButton href="/unirse" tone="papel" size="sm">
          Entrar en una sala
        </LinkButton>
        <LinkButton href="/jugar" tone="fantasma" size="sm">
          ← Otros modos
        </LinkButton>
      </p>
    </div>
  );
}
