import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ApartmentPlaque } from '@/components/portal/Estructuras';
import { LinkButton } from '@/components/ui/Button';
import { PanelAmigos } from '@/components/social/PanelAmigos';
import { usuarioActual } from '@/server/cuentas/sesion';
import { amigosDe, solicitudesPendientes } from '@/server/social/service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Tus vecinos' };

export default async function AmigosPage() {
  const sesion = await usuarioActual();
  if (!sesion) redirect('/entrar');

  const [amigos, solicitudes] = await Promise.all([
    amigosDe(sesion.userId),
    solicitudesPendientes(sesion.userId),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <ApartmentPlaque
        vivienda="Rellano"
        titulo="Tus vecinos"
        subtitulo="Para jugar juntos, retaros y picaros un poco."
      />

      <PanelAmigos
        friendCode={sesion.cuenta.friendCode}
        inicialAmigos={amigos}
        inicialSolicitudes={solicitudes.map((solicitud) => ({
          id: solicitud.id,
          username: solicitud.solicitante.username,
          arquetipo: solicitud.solicitante.profile?.arquetipo ?? 'presidente',
          colorAvatar: solicitud.solicitante.profile?.colorAvatar ?? 'verde',
          nivel: solicitud.solicitante.profile?.nivel ?? 1,
        }))}
      />

      <p className="mt-8">
        <LinkButton href="/perfil" tone="fantasma" size="sm">
          ← Tu ficha
        </LinkButton>
      </p>
    </div>
  );
}
