'use server';

import { redirect } from 'next/navigation';

import { gameSetupSchema } from '@/domain/engine/config';
import {
  claveDelDia,
  configuracionDelDesafio,
  configuracionDelReto,
  normalizarEtiqueta,
} from '@/domain/challenges/daily';
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
    sinSpoilers: formData.get('sinSpoilers') !== null,
    playerName: (formData.get('playerName') as string | null)?.trim() || undefined,
  };

  const setup = gameSetupSchema.parse(raw);
  const guestPublicId = await ensureGuestId();
  const game = await createSoloGame(setup, guestPublicId);

  redirect(`/partida/${game.gameId}`);
}

/**
 * RETO DEL DÍA — la configuración y la semilla se DERIVAN del día, así que todo el
 * mundo juega exactamente la misma partida sin coordinación ni cuenta.
 */
export async function startDailyChallenge(): Promise<void> {
  const dailyKey = claveDelDia(new Date());
  const reto = configuracionDelReto(dailyKey);

  const setup = gameSetupSchema.parse({
    formatId: reto.formatId,
    difficultyId: reto.difficultyId,
    category: reto.category,
    // El reto no adapta la dificultad: si lo hiciera, no serían partidas comparables.
    adaptiveDifficulty: false,
  });

  const guestPublicId = await ensureGuestId();
  const game = await createSoloGame(setup, guestPublicId, {
    seed: reto.seed,
    origin: 'RETO_DIARIO',
    seedLabel: reto.seedLabel,
    dailyKey,
  });

  redirect(`/partida/${game.gameId}`);
}

/**
 * DESAFÍO — la etiqueta ES la semilla («#21DESENGAÑO»), así que se puede compartir por
 * mensaje y jugar la misma partida en diferido. Base de las competiciones asíncronas.
 */
export async function startSeededChallenge(formData: FormData): Promise<void> {
  const etiqueta = String(formData.get('etiqueta') ?? '');
  const desafio = configuracionDelDesafio(etiqueta);

  if (!desafio) {
    redirect('/desafio?error=1');
  }

  const setup = gameSetupSchema.parse({
    formatId: desafio.formatId,
    difficultyId: desafio.difficultyId,
    category: desafio.category,
    adaptiveDifficulty: false,
  });

  const guestPublicId = await ensureGuestId();
  const game = await createSoloGame(setup, guestPublicId, {
    seed: desafio.seed,
    origin: 'DESAFIO',
    seedLabel: `#${normalizarEtiqueta(etiqueta)}`,
  });

  redirect(`/partida/${game.gameId}`);
}
