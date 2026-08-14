'use server';

import { revalidatePath } from 'next/cache';

import { actualizarPerfil } from '@/server/players/service';
import { ensureGuestId, ensureGuestPlayer } from '@/server/guest';

/** Guarda la personalización del perfil (avatar, color, marco y nombre). */
export async function guardarPerfil(formData: FormData): Promise<void> {
  const publicId = await ensureGuestId();
  const guestId = await ensureGuestPlayer(publicId);

  const nombre = String(formData.get('displayName') ?? '').trim();

  await actualizarPerfil(guestId, {
    displayName: nombre.length > 0 ? nombre : null,
    arquetipo: String(formData.get('arquetipo') ?? ''),
    colorAvatar: String(formData.get('colorAvatar') ?? ''),
    marco: String(formData.get('marco') ?? ''),
  });

  revalidatePath('/perfil');
}
