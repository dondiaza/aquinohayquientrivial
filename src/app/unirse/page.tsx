import type { Metadata } from 'next';

import { Fase3Placeholder } from '@/components/layout/Fase3Placeholder';

export const metadata: Metadata = { title: 'Unirse a una sala' };

export default function JoinPage() {
  return (
    <Fase3Placeholder
      titulo="Unirse a una sala"
      descripcion="Aquí se entrará con un código de cuatro letras para usar el móvil como mando mientras la partida se ve en una pantalla grande."
    />
  );
}
