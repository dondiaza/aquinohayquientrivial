import type { Metadata } from 'next';

import { Fase3Placeholder } from '@/components/layout/Fase3Placeholder';

export const metadata: Metadata = { title: 'Sala' };

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <Fase3Placeholder
      titulo="Sala de vecinos"
      codigo={code.toUpperCase().slice(0, 8)}
      descripcion="Vista del jugador dentro de una sala: nombre, avatar de portal, respuestas desde el móvil y clasificación en vivo."
    />
  );
}
