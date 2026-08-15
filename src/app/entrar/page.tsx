import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ApartmentPlaque, PaperNotice } from '@/components/portal/Estructuras';
import { LinkButton } from '@/components/ui/Button';
import { AccesoForm } from '@/components/cuenta/AccesoForm';
import { usuarioActual } from '@/server/cuentas/sesion';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Guardar tu progreso',
  description: 'Crea tu cuenta para conservar partidas, experiencia y logros.',
};

/**
 * ACCESO. Se llega aquí DESPUÉS de haber jugado, nunca antes: el juego no pide cuenta para
 * empezar y esta pantalla no aparece sola.
 */
export default async function EntrarPage() {
  const sesion = await usuarioActual();
  if (sesion) redirect('/perfil');

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <ApartmentPlaque
        vivienda="Portería"
        titulo="Guarda tu progreso"
        subtitulo="Para no perder lo jugado al cambiar de móvil."
      />

      <PaperNotice tono="mostaza" className="mt-4 p-3">
        <p className="texto-sello">Qué se conserva</p>
        <p className="mt-1 text-sm text-tinta-suave">
          Todo lo que ya has hecho como invitado: partidas, experiencia, logros, récords y tu
          avatar. No se copia nada: se ata a tu cuenta, así que no se puede perder por el camino.
        </p>
      </PaperNotice>

      <div className="mt-6">
        <AccesoForm />
      </div>

      <p className="mt-8 flex flex-wrap gap-2">
        <LinkButton href="/jugar/solo" tone="papel" size="sm">
          Seguir jugando sin cuenta
        </LinkButton>
      </p>
    </div>
  );
}
