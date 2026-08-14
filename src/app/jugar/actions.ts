'use server';

import { redirect } from 'next/navigation';

import { gameSetupSchema } from '@/domain/engine/config';
import { createSoloGame } from '@/server/games/service';
import { ensureGuestId } from '@/server/guest';

/**
 * Crea una partida en solitario y lleva a la pantalla de juego.
 *
 * Es un Server Action y no un route handler porque así funciona incluso sin
 * JavaScript en el cliente (el formulario de /jugar/solo es un <form> normal) y
 * porque aquí sí se puede escribir la cookie del invitado.
 */
export async function startSoloGame(formData: FormData): Promise<void> {
  const raw = {
    formatId: formData.get('formatId') ?? undefined,
    difficultyId: formData.get('difficultyId') ?? undefined,
    category: formData.get('category') ?? undefined,
    adaptiveDifficulty: formData.get('adaptiveDifficulty') !== null,
    playerName: (formData.get('playerName') as string | null)?.trim() || undefined,
  };

  const setup = gameSetupSchema.parse(raw);
  const guestPublicId = await ensureGuestId();
  const game = await createSoloGame(setup, guestPublicId);

  redirect(`/partida/${game.gameId}`);
}
