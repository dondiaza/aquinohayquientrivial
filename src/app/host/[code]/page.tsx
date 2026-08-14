import type { Metadata } from 'next';

import { Fase3Placeholder } from '@/components/layout/Fase3Placeholder';

export const metadata: Metadata = { title: 'Pantalla del anfitrión' };

export default async function HostPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <Fase3Placeholder
      titulo="Pantalla del portal"
      codigo={code.toUpperCase().slice(0, 8)}
      descripcion="Pantalla de presentación para la tele o el proyector: pregunta a lo grande, temporizador, respuestas que van llegando y clasificación entre rondas."
    />
  );
}
