import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { GameShell } from '@/components/game/GameShell';
import { ErrorNote } from '@/components/ui/Feedback';
import { LinkButton } from '@/components/ui/Button';
import { loadGameForPlay } from '@/server/games/service';
import { readGuestId } from '@/server/guest';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Partida' };

/**
 * Pantalla de juego. El servidor entrega la configuración y el banco de la partida;
 * el motor corre en el cliente (`GameShell`). Si la partida ya está cerrada, se va
 * directo al acta de resultados.
 */
export default async function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const guestPublicId = await readGuestId();
  const game = await loadGameForPlay(gameId, guestPublicId);

  if (!game) notFound();
  if (game.status === 'FINISHED') redirect(`/resultados/${gameId}`);

  if (game.pool.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
        <ErrorNote titulo="El banco de preguntas está vacío">
          No hay preguntas activas para jugar. Siembra el banco con <code>npm run db:seed</code> o
          crea preguntas desde el panel.
        </ErrorNote>
        <LinkButton href="/admin/preguntas" tone="papel">
          Ir al banco de preguntas
        </LinkButton>
      </div>
    );
  }

  return <GameShell gameId={game.gameId} config={game.config} pool={game.pool} />;
}
