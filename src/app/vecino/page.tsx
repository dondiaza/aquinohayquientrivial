import type { Metadata } from 'next';

import { CreadorDeVecino } from '@/components/avatar/Creador';
import { avatarAleatorio } from '@/domain/avatar/config';
import { avatarDeInvitado, avatarDeUsuario } from '@/server/avatar/service';
import { idUsuarioActual } from '@/server/cuentas/sesion';
import { currentGuestPlayerId } from '@/server/guest';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Crea tu vecino',
  description: 'Móntate el vecino que te representa en el portal.',
};

export default async function VecinoPage() {
  const userId = await idUsuarioActual();

  // Si ya tiene vecino, se abre con el suyo. Si no, con uno ya hecho al azar: nadie debe
  // encontrarse un maniquí gris y tener que construir a alguien desde cero para empezar.
  let inicial = null;
  if (userId) {
    inicial = await avatarDeUsuario(userId);
  } else {
    const guestId = await currentGuestPlayerId();
    if (guestId) inicial = await avatarDeInvitado(guestId);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-4">
      <CreadorDeVecino inicial={inicial ?? avatarAleatorio()} autenticado={Boolean(userId)} />
    </div>
  );
}
