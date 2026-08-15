import type { Metadata } from 'next';

import { LinkButton } from '@/components/ui/Button';
import { ApartmentPlaque } from '@/components/portal/Estructuras';
import { Entrar } from '@/components/sala/Entrar';

export const metadata: Metadata = {
  title: 'Unirse a una sala',
  description: 'Entra en una junta de vecinos con el código de cuatro caracteres.',
};

export default function UnirsePage() {
  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <ApartmentPlaque
        vivienda="Telefonillo"
        titulo="¿A qué comunidad vas?"
        subtitulo="Escribe el código que sale en la pantalla grande."
      />

      <div className="mt-6">
        <Entrar />
      </div>

      <p className="mt-8 flex flex-wrap gap-2">
        <LinkButton href="/host" tone="papel" size="sm">
          Abrir yo una sala
        </LinkButton>
        <LinkButton href="/" tone="fantasma" size="sm">
          ← Volver al portal
        </LinkButton>
      </p>
    </div>
  );
}
